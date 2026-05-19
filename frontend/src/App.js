import { useState } from "react";
import "./App.css";

const VIBES = ["Culture", "Foodie", "Adventure", "Nightlife", "Relaxation", "Shopping", "Nature", "Luxury"];
const BUDGETS = ["Budget ($0-50/day)", "Mid-Range ($50-150/day)", "Luxury ($150-300/day)", "Ultra Luxury ($300+/day)"];
const DAYS = [3, 5, 7, 10, 14];

function App() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(7);
  const [budget, setBudget] = useState("");
  const [vibes, setVibes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeDay, setActiveDay] = useState(0);
  const [error, setError] = useState("");

  const toggleVibe = (v) =>
    setVibes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const generateTrip = async () => {
    if (!destination || !budget || vibes.length === 0) {
      setError("Please fill in destination, select a budget, and pick at least one vibe.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, days, budget, vibes }),
      });
      const data = await res.json();
      setResult(data);
      setActiveDay(0);
    } catch {
      setError("Cannot connect to backend. Make sure uvicorn is running on port 8000.");
    }
    setLoading(false);
  };

  return (
    <div className="app">
      <div className="noise" />

      <header className="header">
        <div>
          <div className="logo">WANDR<span>AI</span></div>
          <div className="tagline">Intelligence for the curious traveler</div>
        </div>
        <div className="header-right">
          {result && (
            <button className="new-trip-btn" onClick={() => setResult(null)}>
              + New Trip
            </button>
          )}
        </div>
      </header>

      {!result ? (
        <div className="form-container">
          <div className="form-card">
            <div className="form-header">
              <h2 className="form-title">Where to next?</h2>
              <p className="form-sub">Tell us your dream. We'll craft the journey.</p>
            </div>

            <div className="field">
              <label>DESTINATION</label>
              <input
                type="text"
                placeholder="Tokyo · Amalfi Coast · Marrakech · Bali..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generateTrip()}
                autoFocus
              />
            </div>

            <div className="field">
              <label>DURATION</label>
              <div className="pills">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    className={`pill ${days === d ? "active" : ""}`}
                    onClick={() => setDays(d)}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>BUDGET LEVEL</label>
              <div className="pills">
                {BUDGETS.map((b) => (
                  <button
                    key={b}
                    className={`pill ${budget === b ? "active" : ""}`}
                    onClick={() => setBudget(b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>TRAVEL VIBE <span className="label-hint">pick all that apply</span></label>
              <div className="pills">
                {VIBES.map((v) => (
                  <button
                    key={v}
                    className={`pill ${vibes.includes(v) ? "active" : ""}`}
                    onClick={() => toggleVibe(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="error">⚠ {error}</p>}

            <button className="generate-btn" onClick={generateTrip} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Crafting your journey...
                </>
              ) : (
                "Generate Itinerary →"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="result-container">
          <div className="result-hero">
            <div className="result-destination">{destination.toUpperCase()}</div>
            <h1 className="result-title">{result.title}</h1>
            <p className="result-tagline">"{result.tagline}"</p>
            <div className="result-meta">
              <span>{days} Days</span>
              <span className="dot">·</span>
              <span>{budget}</span>
              <span className="dot">·</span>
              <span>Best time: {result.best_time_to_visit}</span>
            </div>
          </div>

          <div className="content-grid">
            <div className="days-nav">
              <div className="days-nav-label">ITINERARY</div>
              {result.days.map((d, i) => (
                <button
                  key={i}
                  className={`day-btn ${activeDay === i ? "active" : ""}`}
                  onClick={() => setActiveDay(i)}
                >
                  <span className="day-num">DAY {d.day}</span>
                  <span className="day-theme">{d.theme}</span>
                </button>
              ))}
            </div>

            <div className="day-detail">
              <div className="day-header">
                <div>
                  <div className="day-label">DAY {result.days[activeDay].day}</div>
                  <h3>{result.days[activeDay].theme}</h3>
                </div>
                <span className="day-cost">{result.days[activeDay].estimated_cost}</span>
              </div>

              <div className="timeline">
                <div className="timeline-item">
                  <div className="time-label">MORNING</div>
                  <div className="time-content">{result.days[activeDay].morning}</div>
                </div>
                <div className="timeline-item">
                  <div className="time-label">AFTERNOON</div>
                  <div className="time-content">{result.days[activeDay].afternoon}</div>
                </div>
                <div className="timeline-item">
                  <div className="time-label">EVENING</div>
                  <div className="time-content">{result.days[activeDay].evening}</div>
                </div>
                <div className="timeline-item gem">
                  <div className="time-label">💎 HIDDEN GEM</div>
                  <div className="time-content">{result.days[activeDay].hidden_gem}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bottom-grid">
            <div className="budget-card">
              <h4>BUDGET BREAKDOWN</h4>
              {Object.entries(result.budget_breakdown).map(([k, v]) => (
                <div key={k} className={`budget-row ${k === "total" ? "total" : ""}`}>
                  <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>

            <div className="tips-card">
              <h4>LOCAL INSIDER TIPS</h4>
              {result.local_tips.map((tip, i) => (
                <div key={i} className="tip">
                  <span className="tip-num">0{i + 1}</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="result-footer">
            <button className="back-btn" onClick={() => setResult(null)}>
              ← Plan Another Trip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
