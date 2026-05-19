# WANDR AI — Intelligent Travel Planner

## Setup Instructions

### 1. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Open `backend/.env` and paste your Groq API key:
```
GROQ_API_KEY=your_key_here
```

Run backend:
```bash
uvicorn main:app --reload
```

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
npm start
```

App opens at http://localhost:3000
