import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import { Clock, Route as RouteIcon, Edit3, UserCircle, Shield, Wind, Thermometer, Radio, Navigation2, LogOut, ChevronRight, Activity, MapPin } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import L from "leaflet";
import SOSButton from "./SOSButton";
import "leaflet/dist/leaflet.css";
import "../styles/MapView.css";

const API_KEY = "daa43b06cc327c944b3cc66852ba69fe";

const MapView = ({ userId, onSimulateConnectionLoss, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { routeData } = location.state || {};
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showSafetyOverlay, setShowSafetyOverlay] = useState(false);
  const [isHeatmapMain, setIsHeatmapMain] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDirectionsUI, setShowDirectionsUI] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [lastSpokenStep, setLastSpokenStep] = useState(-1);

  const route = routeData || {};
  const fromLocation = route.fromLocation || "Origin";
  const toLocation = route.toLocation || "Destination";
  const transportMode = route.transportMode || "car";
  const isSafetyMap = route.isSafetyMap || false;
  const filename = route.filename || "tamilnadu_route_map.html";
  const directions = Array.isArray(route.directions) && route.directions.length > 0 ? route.directions : [];
  const instructions = Array.isArray(route.instructions) ? route.instructions : [];

  const initialFrom = route?.from?.lat && route?.from?.lng ? [route.from.lat, route.from.lng] : [13.0827, 80.2707];
  const initialTo = route?.to?.lat && route?.to?.lng ? [route.to.lat, route.to.lng] : [13.0827, 80.2707];

  const [currentPos, setCurrentPos] = useState(initialFrom);
  const [fromPos] = useState(initialFrom);
  const [destination] = useState(initialTo);
  const [weather, setWeather] = useState(null);

  const currentIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const destIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Voice Guidance Function
  const speakInstruction = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-US";
    speech.rate = 1.0;
    window.speechSynthesis.speak(speech);
  };

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${currentPos[0]}&lon=${currentPos[1]}&appid=${API_KEY}&units=metric`);
        const data = await res.json();
        if (data.cod === 200) {
          setWeather({ temp: Math.round(data.main.temp), condition: data.weather[0].main, wind: data.wind.speed });
        }
      } catch (err) { console.error(err); }
    };
    fetchWeather();
  }, [currentPos]);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setCurrentPos([latitude, longitude]);
          try {
            await fetch("http://localhost:5000/api/location/store", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, latitude, longitude }),
            });
          } catch (err) { }

          // Logic to update current step based on location could go here
          // For demo, we'll just simulate step updates if navigating
        },
        null,
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [userId]);

  // Handle Voice Guidance during navigation
  useEffect(() => {
    if (isNavigating && instructions.length > 0) {
      if (currentStepIndex !== lastSpokenStep) {
        speakInstruction(instructions[currentStepIndex].text);
        setLastSpokenStep(currentStepIndex);
      }
    }
  }, [isNavigating, currentStepIndex, instructions, lastSpokenStep]);

  const startNavigation = () => {
    setIsNavigating(true);
    setShowDirectionsUI(false);
    setSidebarOpen(false);
    speakInstruction("Starting navigation to " + toLocation);
  };

  const cancelNavigation = () => {
    setIsNavigating(false);
    speakInstruction("Navigation cancelled");
  };

  return (
    <div className={`map-view-container technical-grid ${isNavigating ? 'nav-mode' : ''}`}>
      {!isNavigating && (
        <header className="map-interface-header glass-panel">
          <div className="brand-section clickable" onClick={() => setShowDirectionsUI(true)} title="View Directions">
            <Shield className="status-icon pulse" size={18} />
            <div className="brand-text">
              <h1>Route Overview</h1>
              <span className="system-path">{fromLocation} <ChevronRight size={12} /> {toLocation}</span>
            </div>
          </div>

          <div className="interface-actions">
            <button className={`gmaps-direction-btn ${showDirectionsUI ? 'active' : ''}`} onClick={() => setShowDirectionsUI(!showDirectionsUI)}>
              <Navigation2 size={16} />
              <span>Directions</span>
            </button>
            <div className="telemetry-item">
              <Radio size={14} className="success-text" />
              <span>Link: active</span>
            </div>
          </div>
        </header>
      )}

      {isNavigating && (
        <div className="live-nav-header glass-panel animate-slide-down">
          <div className="nav-instruction-card">
            <div className="nav-icon-box">
              <Navigation2 size={32} className="nav-direction-icon" />
            </div>
            <div className="nav-text-box">
              <h2 className="nav-instruction-text">
                {instructions[currentStepIndex]?.text || "Proceed to highlighted route"}
              </h2>
              <div className="nav-sub-info">
                <span>{(instructions[currentStepIndex]?.distance / 1000 || 0).toFixed(1)} km</span>
                <span className="separator">•</span>
                <span>Then {instructions[currentStepIndex + 1]?.text.split(' ')[0] || "continue"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="map-interface-main">
        {!isNavigating && (
          <aside className={`interface-sidebar glass-panel ${sidebarOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
              <h3>Route Details</h3>
              <button className="toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <ChevronRight size={16} className={sidebarOpen ? 'rotate-180' : ''} />
              </button>
            </div>

            {sidebarOpen && (
              <div className="sidebar-content">
                <section className="intel-section">
                  <label>Route Telemetry</label>
                  <div className="telemetry-grid">
                    <div className="tel-card">
                      <Clock size={16} />
                      <div className="tel-val">
                        <span className="value">{(route?.duration || 0)}</span>
                        <span className="unit">min</span>
                      </div>
                    </div>
                    <div className="tel-card">
                      <Navigation2 size={16} />
                      <div className="tel-val">
                        <span className="value">{(route?.distance || 0).toFixed(1)}</span>
                        <span className="unit">km</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="intel-section">
                  <label>Weather Status</label>
                  <div className="weather-panel">
                    {weather ? (
                      <>
                        <div className="weather-main">
                          <Thermometer size={20} className="accent-text" />
                          <span className="temp">{weather.temp}°C</span>
                          <span className="cond">{weather.condition}</span>
                        </div>
                        <div className="weather-extra">
                          <Wind size={14} /> <span>Wind: {weather.wind} m/s</span>
                        </div>
                      </>
                    ) : <span>Loading telemetry...</span>}
                  </div>
                </section>

                <section className="intel-section">
                  <label>Navigation Log</label>
                  <div className="navigation-log glass-panel">
                    {instructions.length > 0 ? (
                      <div className="steps-container">
                        {instructions.map((step, idx) => (
                          <div key={idx} className="step-item">
                            <div className="step-number">{idx + 1}</div>
                            <div className="step-detail">
                              <p className="step-text">{step.text}</p>
                              <span className="step-dist">{(step.distance / 1000).toFixed(2)} km</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-steps">No navigation logs available</div>
                    )}
                  </div>
                </section>

                <section className="intel-section">
                  <label>Map Features</label>
                  <div className="modules-list">
                    <div className={`module-item ${isSafetyMap ? 'active' : ''}`}>
                      <Shield size={14} />
                      <span>Safety Zone Layer</span>
                      <div className="status-dot"></div>
                    </div>
                    <div className="module-item active">
                      <Activity size={14} />
                      <span>Real-time Tracking</span>
                      <div className="status-dot"></div>
                    </div>
                  </div>
                </section>

                <div className="sidebar-footer">
                  <button className="primary-action" onClick={() => navigate('/destination')}>
                    <Edit3 size={16} />
                    <span>Modify Route</span>
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}

        <section className="map-stage">
          <div className={`map-viewport ${isHeatmapMain ? 'auxiliary' : 'primary'}`}>
            <MapContainer center={currentPos} zoom={isNavigating ? 17 : 13} zoomControl={false} attributionControl={false} className="full-map">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {!isNavigating && <Marker position={fromPos} icon={currentIcon} />}
              <Marker position={destination} icon={destIcon} />
              <Marker position={currentPos} icon={currentIcon} />
              <Polyline positions={directions} color="var(--accent-primary)" weight={6} opacity={0.8} />
            </MapContainer>

            {showSafetyOverlay && (
              <div className="safety-overlay-frame">
                <iframe
                  src={`/${filename}`}
                  title="Safety Analysis"
                  className="safety-iframe"
                />
              </div>
            )}

            <div className="map-view-controls">
              {!isNavigating && (
                <button
                  className={`aux-view-toggle ${showSafetyOverlay ? 'active' : ''}`}
                  onClick={() => setShowSafetyOverlay(!showSafetyOverlay)}
                >
                  <Activity size={18} />
                  <span>{showSafetyOverlay ? "Static Map" : "Safety Layer"}</span>
                </button>
              )}
            </div>

            {isNavigating && (
              <div className="live-nav-footer glass-panel animate-slide-up">
                <div className="nav-stats">
                  <div className="stat-item">
                    <span className="stat-label">ETA</span>
                    <span className="stat-value">{route?.duration || 0} min</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Distance</span>
                    <span className="stat-value">{(route?.distance || 0).toFixed(1)} km</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Speed</span>
                    <span className="stat-value">0 km/h</span>
                  </div>
                </div>
                <button className="exit-nav-btn" onClick={cancelNavigation}>
                  <LogOut size={20} />
                  <span>Exit</span>
                </button>
              </div>
            )}

            {!isNavigating && (
              <div className="map-attribution glass-panel">
                ACTIVE // LAT: {currentPos[0].toFixed(4)} LON: {currentPos[1].toFixed(4)}
              </div>
            )}

            {showDirectionsUI && (
              <div className="google-maps-overlay animate-slide-in">
                <div className="gmaps-header">
                  <div className="gmaps-top-row">
                    <button className="gmaps-back-btn" onClick={() => setShowDirectionsUI(false)}>
                      <ChevronRight className="rotate-180" size={24} />
                    </button>
                    <div className="gmaps-locations">
                      <div className="gmaps-location-input">
                        <div className="dot-origin"></div>
                        <span>{fromLocation}</span>
                      </div>
                      <div className="gmaps-location-input">
                        <MapPin size={14} className="icon-dest" />
                        <span>{toLocation}</span>
                      </div>
                    </div>
                  </div>
                  <div className="gmaps-modes">
                    <div className="mode-item active">
                      <Navigation2 size={16} />
                      <span>{transportMode}</span>
                    </div>
                  </div>
                </div>
                <div className="gmaps-content">
                  <div className="gmaps-summary">
                    <div className="summary-main">
                      <span className="duration">{route?.duration || 0} min</span>
                      <span className="distance">({(route?.distance || 0).toFixed(1)} km)</span>
                    </div>
                    <p className="summary-desc">Fastest route now based on traffic</p>
                    <button className="gmaps-start-btn" onClick={startNavigation}>
                      <Navigation2 size={20} fill="white" />
                      <span>Start Navigation</span>
                    </button>
                  </div>
                  <div className="gmaps-steps">
                    <h3>Step-by-step directions</h3>
                    {instructions.map((step, idx) => (
                      <div key={idx} className="gmaps-step">
                        <div className="step-icon">
                          <Navigation2 size={18} className={`maneuver-${step.maneuver}`} />
                        </div>
                        <div className="step-info">
                          <p className="step-text">{step.text}</p>
                          <span className="step-dist">{(step.distance / 1000).toFixed(2)} km</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!showDirectionsUI && !isNavigating && (
              <button
                className="floating-gmaps-btn pulse"
                onClick={() => setShowDirectionsUI(true)}
                title="Google Maps Navigation"
              >
                <Navigation2 size={24} fill="white" />
              </button>
            )}
          </div>

          <div className="demo-floating-actions">
            <button onClick={onSimulateConnectionLoss} className="ghost-btn">
              Simulate Link Failure
            </button>
            {isNavigating && (
              <button onClick={() => setCurrentStepIndex(prev => Math.min(prev + 1, instructions.length - 1))} className="ghost-btn">
                Next Instruction (Demo)
              </button>
            )}
          </div>
        </section>
      </main>
      <SOSButton />
    </div>
  );
};

export default MapView;