import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./App.css";

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const BACKEND = "https://ai-travel-planner-pys6.onrender.com";
const UNSPLASH_KEY = "XuQBsE9YnmRv3J2DdSB_IyEXFPNZ4ja23eq9Fjk1abY";
const WEATHER_KEY = "db29914c270734e90654ef374f64f07c";

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
  const [activeTab, setActiveTab] = useState("itinerary");
  const [weather, setWeather] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [mapCoords, setMapCoords] = useState(null);
  const resultRef = useRef(null);

  const toggleVibe = (v) => setVibes((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);

  const fetchWeather = async (city) => {
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_KEY}&units=metric`);
      const data = await res.json();
      if (data.main) setWeather(data);
    } catch {}
  };

  const fetchPhoto = async (city) => {
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${city}+travel&per_page=1&client_id=${UNSPLASH_KEY}`);
      const data = await res.json();
      if (data.results?.[0]) setPhoto(data.results[0].urls.regular);
    } catch {}
  };

  const fetchCoords = async (city) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${city}&format=json&limit=1`);
      const data = await res.json();
      if (data[0]) setMapCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
    } catch {}
  };

  const generateTrip = async () => {
    if (!destination || !budget || vibes.length === 0) {
      setError("Please fill in destination, select a budget, and pick at least one vibe.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    setWeather(null);
    setPhoto(null);
    setChatMessages([]);
    try {
      const res = await fetch(`${BACKEND}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, days, budget, vibes }),
      });
      const data = await res.json();
      setResult(data);
      setActiveDay(0);
      setActiveTab("itinerary");
      fetchWeather(destination);
      fetchPhoto(destination);
      fetchCoords(destination);
    } catch {
      setError("Cannot connect to backend. Make sure it's running.");
    }
    setLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages((p) => [...p, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          itinerary: JSON.stringify(result),
          destination,
        }),
      });
      const data = await res.json();
      setChatMessages((p) => [...p, { role: "ai", text: data.reply }]);
    } catch {
      setChatMessages((p) => [...p, { role: "ai", text: "Sorry, couldn't reach the AI right now." }]);
    }
    setChatLoading(false);
  };

  const shareTrip = () => {
    const url = `${window.location.origin}?trip=${encodeURIComponent(JSON.stringify({ destination, days, budget, vibes, result }))}`;
    navigator.clipboard.writeText(url);
    setShareMsg("Link copied to clipboard!");
    setTimeout(() => setShareMsg(""), 3000);
  };

  const downloadPDF = async () => {
    if (!resultRef.current) return;
    const canvas = await html2canvas(resultRef.current, { scale: 1.5, backgroundColor: "#0d0d1a" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, w, h);
    pdf.save(`${destination}-itinerary.pdf`);
  };

  // Load shared trip from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trip = params.get("trip");
    if (trip) {
      try {
        const data = JSON.parse(decodeURIComponent(trip));
        setDestination(data.destination);
        setDays(data.days);
        setBudget(data.budget);
        setVibes(data.vibes);
        setResult(data.result);
        fetchWeather(data.destination);
        fetchPhoto(data.destination);
        fetchCoords(data.destination);
      } catch {}
    }
  }, []);

  const weatherIcon = (main) => {
    const icons = { Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Snow: "❄️", Thunderstorm: "⛈️", Drizzle: "🌦️", Mist: "🌫️" };
    return icons[main] || "🌡️";
  };

  return (
    <div className="app">
      <div className="noise" />
      <header className="header">
        <div>
          <div className="logo">Lunara</div>
          <div className="tagline">AI-powered travel planning 🌙</div>
        </div>
        <div className="header-right">
          {result && (
            <button className="new-trip-btn" onClick={() => { setResult(null); setWeather(null); setPhoto(null); }}>
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
                  <button key={d} className={`pill ${days === d ? "active" : ""}`} onClick={() => setDays(d)}>
                    {d} days
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>BUDGET LEVEL</label>
              <div className="pills">
                {BUDGETS.map((b) => (
                  <button key={b} className={`pill ${budget === b ? "active" : ""}`} onClick={() => setBudget(b)}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>TRAVEL VIBE <span className="label-hint">pick all that apply</span></label>
              <div className="pills">
                {VIBES.map((v) => (
                  <button key={v} className={`pill ${vibes.includes(v) ? "active" : ""}`} onClick={() => toggleVibe(v)}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="error">⚠ {error}</p>}

            <button className="generate-btn" onClick={generateTrip} disabled={loading}>
              {loading ? <><span className="spinner" />Crafting your journey...</> : "Generate Itinerary →"}
            </button>
          </div>
        </div>
      ) : (
        <div className="result-container" ref={resultRef}>
          {photo && (
            <div className="hero-photo" style={{ backgroundImage: `url(${photo})` }}>
              <div className="hero-overlay" />
              <div className="hero-content">
                <div className="result-destination">{destination.toUpperCase()}</div>
                <h1 className="result-title">{result.title}</h1>
                <p className="result-tagline">"{result.tagline}"</p>
                <div className="result-meta">
                  <span>{days} Days</span><span className="dot">·</span>
                  <span>{budget}</span><span className="dot">·</span>
                  <span>Best: {result.best_time_to_visit}</span>
                </div>
              </div>
            </div>
          )}

          {!photo && (
            <div className="result-hero">
              <div className="result-destination">{destination.toUpperCase()}</div>
              <h1 className="result-title">{result.title}</h1>
              <p className="result-tagline">"{result.tagline}"</p>
              <div className="result-meta">
                <span>{days} Days</span><span className="dot">·</span>
                <span>{budget}</span><span className="dot">·</span>
                <span>Best: {result.best_time_to_visit}</span>
              </div>
            </div>
          )}

          {/* WEATHER BAR */}
          {weather && (
            <div className="weather-bar">
              <span className="weather-icon">{weatherIcon(weather.weather[0].main)}</span>
              <span className="weather-info">
                <strong>{destination}</strong> — {Math.round(weather.main.temp)}°C, {weather.weather[0].description}
              </span>
              <span className="weather-extra">
                💧 {weather.main.humidity}% humidity · 💨 {Math.round(weather.wind.speed)} m/s wind
              </span>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="action-bar">
            <button className={`tab-btn ${activeTab === "itinerary" ? "active" : ""}`} onClick={() => setActiveTab("itinerary")}>📅 Itinerary</button>
            <button className={`tab-btn ${activeTab === "map" ? "active" : ""}`} onClick={() => setActiveTab("map")}>🗺️ Map</button>
            <button className={`tab-btn ${activeTab === "chat" ? "active" : ""}`} onClick={() => setActiveTab("chat")}>💬 AI Chat</button>
            <button className="tab-btn share-btn" onClick={shareTrip}>🔗 Share</button>
            <button className="tab-btn pdf-btn" onClick={downloadPDF}>📄 PDF</button>
          </div>
          {shareMsg && <div className="share-toast">{shareMsg}</div>}

          {/* ITINERARY TAB */}
          {activeTab === "itinerary" && (
            <>
              <div className="content-grid">
                <div className="days-nav">
                  <div className="days-nav-label">ITINERARY</div>
                  {result.days.map((d, i) => (
                    <button key={i} className={`day-btn ${activeDay === i ? "active" : ""}`} onClick={() => setActiveDay(i)}>
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
                    {[["MORNING", result.days[activeDay].morning], ["AFTERNOON", result.days[activeDay].afternoon], ["EVENING", result.days[activeDay].evening]].map(([label, content]) => (
                      <div key={label} className="timeline-item">
                        <div className="time-label">{label}</div>
                        <div className="time-content">{content}</div>
                      </div>
                    ))}
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
            </>
          )}

          {/* MAP TAB */}
          {activeTab === "map" && mapCoords && (
            <div className="map-container">
              <MapContainer center={mapCoords} zoom={12} style={{ height: "500px", width: "100%", borderRadius: "16px" }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                <Marker position={mapCoords}>
                  <Popup><strong>{destination}</strong><br />{result.title}</Popup>
                </Marker>
              </MapContainer>
            </div>
          )}

          {/* CHAT TAB */}
          {activeTab === "chat" && (
            <div className="chat-container">
              <div className="chat-header">
                <h3>💬 Ask AI about your trip</h3>
                <p>Modify your itinerary, ask for recommendations, or get local advice</p>
              </div>
              <div className="chat-messages">
                {chatMessages.length === 0 && (
                  <div className="chat-empty">
                    <p>Ask me anything about your {destination} trip!</p>
                    <div className="chat-suggestions">
                      {["Add a day trip to nearby cities", "Make day 1 more adventurous", "What should I pack?", "Best local restaurants?"].map((s) => (
                        <button key={s} className="suggestion" onClick={() => setChatInput(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.role}`}>
                    <div className="msg-bubble">{m.text}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-msg ai">
                    <div className="msg-bubble typing"><span /><span /><span /></div>
                  </div>
                )}
              </div>
              <div className="chat-input-bar">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Ask anything about your trip..."
                  disabled={chatLoading}
                />
                <button onClick={sendChat} disabled={chatLoading}>Send →</button>
              </div>
            </div>
          )}

          <div className="result-footer">
            <button className="back-btn" onClick={() => { setResult(null); setWeather(null); setPhoto(null); }}>
              ← Plan Another Trip
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <span>Built by <strong>Rohit Kumar Siripurapu</strong></span>
        <div className="footer-links">
          <a href="https://github.com/Rohitsiripurapu" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://www.linkedin.com/in/rohit-siripurapu-931115237/" target="_blank" rel="noreferrer">LinkedIn</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
