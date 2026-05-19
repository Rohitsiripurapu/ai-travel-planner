from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import os
import json

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class TripRequest(BaseModel):
    destination: str
    days: int
    budget: str
    vibes: list[str]

@app.post("/plan")
def plan_trip(request: TripRequest):
    prompt = f"""You are an expert luxury travel planner with insider knowledge of hidden gems worldwide.

Create a detailed {request.days}-day itinerary for {request.destination}.
Budget level: {request.budget}
Travel vibes: {", ".join(request.vibes)}

Respond ONLY with a valid JSON object in this exact format, no extra text, no markdown:
{{
  "title": "catchy evocative trip title",
  "tagline": "one cinematic sentence about this trip",
  "days": [
    {{
      "day": 1,
      "theme": "short theme for the day",
      "morning": "detailed morning activity with specific place names",
      "afternoon": "detailed afternoon activity with specific place names",
      "evening": "detailed evening activity with specific place names",
      "hidden_gem": "one secret spot locals love that tourists miss",
      "estimated_cost": "$XX-XX"
    }}
  ],
  "budget_breakdown": {{
    "accommodation": "$XXX",
    "food": "$XXX",
    "activities": "$XXX",
    "transport": "$XXX",
    "total": "$XXX"
  }},
  "local_tips": ["tip1", "tip2", "tip3", "tip4"],
  "best_time_to_visit": "season and months"
}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=4000
    )

    text = response.choices[0].message.content.strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())

@app.get("/")
def root():
    return {"message": "WANDR AI Backend Running!"}
