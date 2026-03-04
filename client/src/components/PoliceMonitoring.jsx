import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    MapContainer, TileLayer, CircleMarker, Tooltip, useMap
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/PoliceMonitoring.css";

/* ─────────────────────────────── helpers ─────────────────────────────── */
const ZONE_CONFIG = {
    "High Risk Zone": { color: "#ff3700", glow: "#ff370066", css: "high", label: "HIGH RISK", short: "High" },
    "Moderate Zone": { color: "#ff8c00", glow: "#ff8c0055", css: "moderate", label: "MODERATE", short: "Moderate" },
    "Low Risk Zone": { color: "#ffd700", glow: "#ffd70044", css: "low", label: "LOW RISK", short: "Low" },
    "Safe Zone": { color: "#00ff9d", glow: "#00ff9d33", css: "safe", label: "SAFE ZONE", short: "Safe" },
};

const TILE_LAYERS = {
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
};

function getRadius(zone) {
    return { "High Risk Zone": 14, "Moderate Zone": 11, "Low Risk Zone": 8, "Safe Zone": 6 }[zone] ?? 8;
}

function getAIPrediction(zone, crimeCount, safetyScore) {
    const score = (safetyScore * 100).toFixed(0);
    if (zone === "High Risk Zone")
        return `⚠️ Risk increased due to elevated crime index (${crimeCount} incidents). Safety score at ${score}/100. Recommend deploying additional patrol units.`;
    if (zone === "Moderate Zone")
        return `📊 Moderate activity detected. ${crimeCount} incidents logged. Safety score: ${score}/100. Monitor closely over next 48 hours.`;
    if (zone === "Low Risk Zone")
        return `✅ Low activity zone. ${crimeCount} incidents tracked. Safety score: ${score}/100. Routine patrol sufficient.`;
    return `🟢 Zone stable. Only ${crimeCount} incidents. Safety score: ${score}/100. No immediate action required.`;
}

function getPrecautions(zone) {
    if (zone === "High Risk Zone")
        return ["Avoid traveling alone after 20:00", "Keep emergency contacts accessible", "Report suspicious activity immediately", "Use well-lit, populated routes"];
    if (zone === "Moderate Zone")
        return ["Stay alert in crowded areas", "Secure valuables in public spaces", "Avoid isolated areas at night"];
    if (zone === "Low Risk Zone")
        return ["Standard safety precautions apply", "Stay aware of surroundings"];
    return ["Normal activity zone — no alerts"];
}

/* ── Static 7-day risk trend — fixed values, never re-randomised ── */
const STATIC_TREND = [
    { day: "Mon", val: 18 },
    { day: "Tue", val: 23 },
    { day: "Wed", val: 27 },
    { day: "Thu", val: 21 },
    { day: "Fri", val: 19 },
    { day: "Sat", val: 14 },
    { day: "Sun", val: 11 },
];
const STATIC_TREND_MAX = Math.max(...STATIC_TREND.map(t => t.val));  // 27

/* ─────────────────────────── Auto-zoom helper ─────────────────────────── */
function MapController({ target }) {
    const map = useMap();
    useEffect(() => {
        if (target) {
            map.flyTo([target.lat, target.lng], 13, { duration: 1.4 });
        }
    }, [target, map]);
    return null;
}

/* ═══════════════════════════ Main Component ══════════════════════════════ */
export default function PoliceMonitoring() {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);
    const [tileMode, setTileMode] = useState("dark");
    const [heatmap, setHeatmap] = useState(false);
    const [filterZone, setFilterZone] = useState("all");
    const [mapTarget, setMapTarget] = useState(null);
    const [alertMsg, setAlertMsg] = useState(null);
    const [clock, setClock] = useState("");
    const alertTimer = useRef(null);
    const [restrictedAreas, setRestrictedAreas] = useState([]);

    useEffect(() => {
        const loadRestricted = () => {
            const stored = localStorage.getItem("restrictedAreas");
            if (stored) {
                setRestrictedAreas(JSON.parse(stored));
            }
        };
        loadRestricted();
        window.addEventListener('storage', loadRestricted);
        return () => window.removeEventListener('storage', loadRestricted);
    }, []);

    /* ── Live clock ── */
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setClock(now.toLocaleTimeString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" }) + " IST");
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    /* ── Fetch safety data from Python backend ── */
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("http://localhost:5001/safety_data");
                if (!res.ok) throw new Error("Backend returned " + res.status);
                const json = await res.json();
                setData(json);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    /* ── Trigger alert notification ── */
    const triggerAlert = useCallback((msg) => {
        setAlertMsg(msg);
        clearTimeout(alertTimer.current);
        alertTimer.current = setTimeout(() => setAlertMsg(null), 3500);
    }, []);

    /* ── Handle zone click ── */
    const handleZoneClick = (zone) => {
        setSelected(zone);
        setMapTarget({ lat: zone.Latitude, lng: zone.Longitude });
        if (zone.Safety_Zone === "High Risk Zone" || zone.Safety_Zone === "Moderate Zone") {
            setTileMode("street");
            triggerAlert(`⚠ HIGH RISK ZONE DETECTED — ${zone.AC_NAME} [${zone.DIST_NAME}]`);
        }
    };

    /* ── Derived summary stats ── */
    const summary = {
        total: data.length,
        safe: data.filter(d => d.Safety_Zone === "Safe Zone").length,
        low: data.filter(d => d.Safety_Zone === "Low Risk Zone").length,
        moderate: data.filter(d => d.Safety_Zone === "Moderate Zone").length,
        high: data.filter(d => d.Safety_Zone === "High Risk Zone").length,
        avgCrime: data.length ? (data.reduce((s, d) => s + d.Total_Crime_Count, 0) / data.length).toFixed(1) : 0,
        avgScore: data.length ? (data.reduce((s, d) => s + d.Safety_Score, 0) / data.length * 100).toFixed(1) : 0,
    };

    const visibleData = filterZone === "all" ? data : data.filter(d => d.Safety_Zone === filterZone);

    const topHighRisk = [...data]
        .filter(d => d.Safety_Zone === "High Risk Zone")
        .sort((a, b) => b.Total_Crime_Count - a.Total_Crime_Count)
        .slice(0, 6);

    /* ── Trend: always static, never changes ── */
    const trendData = STATIC_TREND;
    const trendMax = STATIC_TREND_MAX;

    /* ─────── RENDER ─────── */
    if (loading) return (
        <div className="monitoring-root">
            <div className="monitoring-loading">
                <div className="loading-radar" />
                <div className="loading-text">INITIALISING INTELLIGENCE SYSTEM</div>
                <div className="loading-sub">► Connecting to surveillance network...</div>
            </div>
        </div>
    );

    if (error) return (
        <div className="monitoring-root">
            <div className="monitoring-loading" style={{ color: "#ff4400" }}>
                <div style={{ fontSize: 40 }}>⚠</div>
                <div className="loading-text">CONNECTION FAILURE</div>
                <div className="loading-sub" style={{ color: "#ff4400aa" }}>{error}</div>
                <div className="loading-sub">Ensure Python backend is running on port 5001</div>
                <button className="cmd-btn danger" style={{ marginTop: 12 }} onClick={() => navigate("/police")}>
                    ← Back to Command Center
                </button>
            </div>
        </div>
    );

    return (
        <div className="monitoring-root">

            {/* ── Alert Notification ── */}
            {alertMsg && (
                <div className="alert-notification">
                    <span style={{ fontSize: 16 }}>🔴</span>
                    {alertMsg}
                </div>
            )}

            {/* ══ TOP COMMAND BAR ══ */}
            <div className="cmd-bar">
                <div className="cmd-brand">
                    <div className="cmd-brand-icon">🛡</div>
                    <div>
                        <h1>SMARTNAV</h1>
                        <p>RISK INTELLIGENCE COMMAND CENTER · TAMIL NADU</p>
                    </div>
                </div>

                <div className="cmd-center">
                    <div className="cmd-time">{clock}</div>
                    <div className="threat-level-pill">
                        <div className="threat-dot" />
                        THREAT LEVEL: {summary.high > 15 ? "CRITICAL" : summary.high > 8 ? "ELEVATED" : "GUARDED"}
                    </div>
                </div>

                <div className="cmd-right">
                    <button className="cmd-btn" onClick={() => navigate("/police")}>
                        ← CMD CENTER
                    </button>
                    <button className="cmd-btn danger" onClick={() => navigate("/police/map")}>
                        📡 LIVE TRACK
                    </button>
                </div>
            </div>

            {/* ══ BODY ══ */}
            <div className="monitoring-body">

                {/* ── LEFT PANEL ── */}
                <div className="left-panel">

                    {/* Summary Stats */}
                    <div className="panel-card">
                        <div className="panel-title"><span className="panel-title-dot" />ZONE SUMMARY</div>
                        <div className="stat-grid">
                            <div className="stat-item total">
                                <div className="stat-value">{summary.total}</div>
                                <div className="stat-label">Total Zones</div>
                            </div>
                            <div className="stat-item avg">
                                <div className="stat-value">{summary.avgScore}</div>
                                <div className="stat-label">Avg Safety %</div>
                            </div>
                            <div className="stat-item safe">
                                <div className="stat-value">{summary.safe}</div>
                                <div className="stat-label">Safe</div>
                            </div>
                            <div className="stat-item low">
                                <div className="stat-value">{summary.low}</div>
                                <div className="stat-label">Low Risk</div>
                            </div>
                            <div className="stat-item moderate">
                                <div className="stat-value">{summary.moderate}</div>
                                <div className="stat-label">Moderate</div>
                            </div>
                            <div className="stat-item high">
                                <div className="stat-value">{summary.high}</div>
                                <div className="stat-label">High Risk</div>
                            </div>
                        </div>
                    </div>

                    {/* Zone Filter Legend */}
                    <div className="panel-card">
                        <div className="panel-title"><span className="panel-title-dot" />ZONE FILTER</div>
                        <div className="zone-legend">
                            {[
                                { key: "all", label: "All Zones", color: "#00b4ff", count: data.length },
                                { key: "High Risk Zone", color: "#ff3700", label: "High Risk", count: summary.high },
                                { key: "Moderate Zone", color: "#ff8c00", label: "Moderate", count: summary.moderate },
                                { key: "Low Risk Zone", color: "#ffd700", label: "Low Risk", count: summary.low },
                                { key: "Safe Zone", color: "#00ff9d", label: "Safe Zone", count: summary.safe },
                            ].map(item => (
                                <div
                                    key={item.key}
                                    className={`legend-item ${filterZone === item.key ? "active" : ""}`}
                                    onClick={() => setFilterZone(filterZone === item.key && item.key !== "all" ? "all" : item.key)}
                                >
                                    <div className="legend-dot" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}66` }} />
                                    <span className="legend-name">{item.label}</span>
                                    <span className="legend-count">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Intel Feed — top high-risk zones */}
                    <div className="panel-card">
                        <div className="panel-title"><span className="panel-title-dot" style={{ background: "#ff3700", boxShadow: "0 0 6px #ff3700" }} />ALERT FEED</div>
                        <div className="intel-feed">
                            {topHighRisk.map((z, i) => (
                                <div
                                    key={i}
                                    className="feed-item high"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleZoneClick(z)}
                                >
                                    <div className="feed-zone">🔴 {z.AC_NAME}</div>
                                    <div className="feed-detail">{z.DIST_NAME} · {z.Total_Crime_Count} incidents</div>
                                </div>
                            ))}
                            {data.filter(d => d.Safety_Zone === "Moderate Zone").slice(0, 3).map((z, i) => (
                                <div
                                    key={"m" + i}
                                    className="feed-item moderate"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => handleZoneClick(z)}
                                >
                                    <div className="feed-zone">🟠 {z.AC_NAME}</div>
                                    <div className="feed-detail">{z.DIST_NAME} · {z.Total_Crime_Count} incidents</div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* ── MAP CENTER ── */}
                <div className="map-center">
                    {/* Toolbar */}
                    <div className="map-toolbar">
                        {[
                            { key: "dark", label: "🌑 Dark", icon: null },
                            { key: "street", label: "🗺 Street", icon: null },
                            { key: "satellite", label: "🛰 Satellite", icon: null },
                        ].map(m => (
                            <button
                                key={m.key}
                                className={`map-mode-btn ${tileMode === m.key ? "active" : ""}`}
                                onClick={() => setTileMode(m.key)}
                            >
                                {m.label}
                            </button>
                        ))}
                        <div className="map-separator" />
                        <button
                            className={`heatmap-toggle ${heatmap ? "active" : ""}`}
                            onClick={() => setHeatmap(!heatmap)}
                        >
                            {heatmap ? "🔥 Heatmap ON" : "🔥 Heatmap OFF"}
                        </button>
                        <span style={{ fontSize: 11, color: "#3a6a8a", fontFamily: "monospace" }}>
                            {visibleData.length} zones rendered
                        </span>
                    </div>

                    {/* Map */}
                    <div className="map-leaflet-wrapper">
                        <MapContainer
                            center={[11.1, 78.6]}
                            zoom={7}
                            style={{ width: "100%", height: "100%" }}
                            zoomControl={true}
                        >
                            <TileLayer
                                key={tileMode}
                                url={TILE_LAYERS[tileMode]}
                                attribution=""
                            />
                            <MapController target={mapTarget} />

                            {visibleData.map((zone, i) => {
                                const cfg = ZONE_CONFIG[zone.Safety_Zone] || ZONE_CONFIG["Safe Zone"];
                                const radius = getRadius(zone.Safety_Zone);
                                const opacity = heatmap
                                    ? Math.min(0.9, 0.3 + zone.Total_Crime_Count / 30)
                                    : 0.75;

                                return (
                                    <CircleMarker
                                        key={i}
                                        center={[zone.Latitude, zone.Longitude]}
                                        radius={heatmap ? radius * 2.5 : radius}
                                        pathOptions={{
                                            color: cfg.color,
                                            fillColor: cfg.color,
                                            fillOpacity: opacity,
                                            weight: selected?.AC_NAME === zone.AC_NAME ? 3 : 1,
                                        }}
                                        eventHandlers={{ click: () => handleZoneClick(zone) }}
                                    >
                                        <Tooltip
                                            direction="top"
                                            offset={[0, -8]}
                                            opacity={1}
                                        >
                                            <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 }}>
                                                <strong style={{ color: cfg.color }}>{zone.AC_NAME}</strong><br />
                                                <span style={{ color: "#8aa0b8" }}>{zone.DIST_NAME}</span><br />
                                                Zone: {cfg.label}<br />
                                                Incidents: {zone.Total_Crime_Count}<br />
                                                Safety: {(zone.Safety_Score * 100).toFixed(0)}%
                                            </div>
                                        </Tooltip>
                                    </CircleMarker>
                                );
                            })}

                            {restrictedAreas.map((area, i) => {
                                const radius = 12; // High prominence
                                const color = "#b824ff"; // Bright Purple
                                return (
                                    <CircleMarker
                                        key={`rest-${i}`}
                                        center={[parseFloat(area.lat), parseFloat(area.lng)]}
                                        radius={heatmap ? radius * 2.5 : radius}
                                        pathOptions={{
                                            color: color,
                                            fillColor: color,
                                            fillOpacity: 0.8,
                                            weight: 2
                                        }}
                                        eventHandlers={{
                                            click: () => {
                                                setMapTarget({ lat: parseFloat(area.lat), lng: parseFloat(area.lng) });
                                                setAlertMsg(`🚨 RESTRICTED AREA at ${parseFloat(area.lat).toFixed(4)}, ${parseFloat(area.lng).toFixed(4)}`);
                                            }
                                        }}
                                    >
                                        <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                                            <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 }}>
                                                <strong style={{ color }}>⛔ RESTRICTED AREA</strong><br />
                                                Lat: {area.lat}<br />
                                                Lng: {area.lng}
                                            </div>
                                        </Tooltip>
                                    </CircleMarker>
                                );
                            })}
                        </MapContainer>
                    </div>
                </div>

                {/* ── RIGHT INTEL PANEL ── */}
                <div className="right-panel">
                    {selected ? (
                        <>
                            {/* Main intel card — no INTEL header */}
                            <div className="intel-card">
                                <div className="intel-card-header">
                                    <div>
                                        <div className="intel-card-zone-name" style={{ fontSize: 14 }}>{selected.AC_NAME}</div>
                                        <div className="intel-card-district">📍 {selected.DIST_NAME} DISTRICT</div>
                                    </div>
                                    <span className={`risk-badge ${ZONE_CONFIG[selected.Safety_Zone]?.short || "Safe"}`}>
                                        {ZONE_CONFIG[selected.Safety_Zone]?.label || "SAFE"}
                                    </span>
                                </div>
                                <div className="intel-card-body">

                                    <div className="intel-metrics">
                                        {[
                                            { label: "CRIME COUNT", value: selected.Total_Crime_Count, color: ZONE_CONFIG[selected.Safety_Zone]?.color },
                                            { label: "SAFETY SCORE", value: (selected.Safety_Score * 100).toFixed(1) + "%", color: "#00ff9d" },
                                            { label: "CRIME INDEX", value: (selected.Crime_Index * 100).toFixed(1) + "%", color: "#ff8c00" },
                                            { label: "DATA SOURCES", value: selected.Reference_Count + " refs", color: "#c084fc" },
                                        ].map(m => (
                                            <div className="intel-metric-row" key={m.label}>
                                                <span className="intel-metric-label">{m.label}</span>
                                                <span className="intel-metric-value" style={{ color: m.color }}>{m.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Safety Score bar */}
                                    <div className="score-bar-wrap">
                                        <div className="score-bar-label">
                                            <span>SAFETY RATING</span>
                                            <span>{(selected.Safety_Score * 100).toFixed(0)}/100</span>
                                        </div>
                                        <div className="score-bar-bg">
                                            <div
                                                className="score-bar-fill"
                                                style={{
                                                    width: `${selected.Safety_Score * 100}%`,
                                                    background: `linear-gradient(90deg, ${ZONE_CONFIG[selected.Safety_Zone]?.color}88, ${ZONE_CONFIG[selected.Safety_Zone]?.color})`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Precautions */}
                                    <div>
                                        <div className="ai-label" style={{ marginBottom: 6 }}>⚡ RECOMMENDED PRECAUTIONS</div>
                                        <div className="precautions">
                                            {getPrecautions(selected.Safety_Zone).map((p, i) => (
                                                <div className="precaution-item" key={i}>
                                                    <span className="precaution-bullet">›</span>
                                                    {p}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* 7-Day Trend — static data, shown only when zone selected */}
                            <div className="panel-card">
                                <div className="panel-title">
                                    <span className="panel-title-dot" style={{ background: "#c084fc", boxShadow: "0 0 6px #c084fc" }} />
                                    7-DAY RISK TREND
                                    <span style={{ marginLeft: "auto", fontSize: 9, color: "#3a6a8a", letterSpacing: 1 }}>WEEKLY AVG</span>
                                </div>
                                <div className="trend-chart">
                                    {STATIC_TREND.map((t) => {
                                        const pct = STATIC_TREND_MAX > 0 ? (t.val / STATIC_TREND_MAX) * 100 : 0;
                                        const col = pct > 70 ? "#ff3700" : pct > 40 ? "#ff8c00" : "#00ff9d";
                                        return (
                                            <div className="trend-bar-row" key={t.day}>
                                                <span className="trend-day">{t.day}</span>
                                                <div className="trend-bar-bg">
                                                    <div className="trend-bar-fill" style={{ width: pct + "%", background: col }} />
                                                </div>
                                                <span className="trend-val">{t.val}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </>
                    ) : (
                        <div className="panel-card">
                            <div className="intel-empty">
                                <div className="intel-empty-icon">🎯</div>
                                <p>SELECT A ZONE ON THE MAP TO VIEW INTELLIGENCE REPORT</p>
                            </div>
                        </div>
                    )}

                    {/* Coords display */}
                    {selected && (
                        <div className="panel-card">
                            <div className="panel-title"><span className="panel-title-dot" />GEO COORDINATES</div>
                            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#4a8aaa", lineHeight: 2 }}>
                                <div>LAT: <span style={{ color: "#00ff9d" }}>{selected.Latitude.toFixed(6)}°N</span></div>
                                <div>LNG: <span style={{ color: "#00ff9d" }}>{selected.Longitude.toFixed(6)}°E</span></div>
                                <div>SRC: <span style={{ color: "#c084fc", fontSize: 10 }}>{selected.Primary_Sources?.slice(0, 30)}</span></div>
                            </div>
                        </div>
                    )}

                    {/* AI RISK ANALYSIS — last card, only when zone is selected */}
                    {selected && (
                        <div className="panel-card ai-risk-card">
                            <div className="panel-title">
                                <span className="panel-title-dot" style={{ background: "#c084fc", boxShadow: "0 0 6px #c084fc" }} />
                                AI RISK ANALYSIS
                            </div>
                            <div className="ai-prediction" style={{ margin: 0, border: "none", padding: 0, background: "none" }}>
                                <div className="ai-text" style={{ fontSize: 12, lineHeight: 1.7 }}>
                                    {getAIPrediction(selected.Safety_Zone, selected.Total_Crime_Count, selected.Safety_Score)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
