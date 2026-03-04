import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/PoliceLocationHistory.css";

/* ── Leaflet.heat CDN loaded once ─────────────────────────────── */
function ensureHeatPlugin() {
    return new Promise((resolve) => {
        if (typeof L.heatLayer === "function") return resolve();
        if (document.getElementById("leaflet-heat-script")) {
            const check = setInterval(() => {
                if (typeof L.heatLayer === "function") { clearInterval(check); resolve(); }
            }, 50);
            return;
        }
        const s = document.createElement("script");
        s.id = "leaflet-heat-script";
        s.src = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
        s.onload = resolve;
        document.head.appendChild(s);
    });
}

/* ── Colour for intensity bar ─────────────────────────────────── */
function intensityColor(v) {
    // 0=blue → 0.5=yellow → 1=red (matches Leaflet.heat default gradient)
    if (v < 0.33) return `hsl(${240 - v * 360},100%,55%)`;
    if (v < 0.66) return `hsl(${60 - (v - 0.33) * 180},100%,50%)`;
    return `hsl(${0},${100}%,${50 - (v - 0.66) * 30}%)`;
}

/* ══════════════════════════ COMPONENT ════════════════════════════ */
const PoliceLocationHistory = ({ selectedUser }) => {
    const navigate = useNavigate();
    const mapRef = useRef(null);
    const leafletMap = useRef(null);
    const heatLayerRef = useRef(null);
    const pathLayerRef = useRef(null);

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState("heat");   // heat | path | both
    const [radius, setRadius] = useState(55);
    const [blur, setBlur] = useState(40);
    const [tileStyle, setTileStyle] = useState("dark");
    const [stats, setStats] = useState(null);
    const [clock, setClock] = useState("");

    /* ── Live clock ── */
    useEffect(() => {
        const tick = () => setClock(new Date().toLocaleTimeString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" }) + " IST");
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    /* ── Tile layers ── */
    const TILES = {
        dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    };

    /* ── Init map once ── */
    useEffect(() => {
        if (leafletMap.current || !mapRef.current) return;
        leafletMap.current = L.map(mapRef.current, {
            center: [11.1, 78.6],
            zoom: 7,
            zoomControl: true,
            attributionControl: false,
        });
        L.tileLayer(TILES.dark, {}).addTo(leafletMap.current);
    }, []);

    /* ── Swap tile layer when tileStyle changes ── */
    useEffect(() => {
        if (!leafletMap.current) return;
        leafletMap.current.eachLayer(l => { if (l instanceof L.TileLayer) leafletMap.current.removeLayer(l); });
        L.tileLayer(TILES[tileStyle], {}).addTo(leafletMap.current);
    }, [tileStyle]);

    /* ── Fetch history ── */
    useEffect(() => {
        if (!selectedUser) return;
        setLoading(true); setError(null);
        (async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/location/get/${selectedUser.userId}`);
                const data = await res.json();
                setHistory(Array.isArray(data) ? data : []);
            } catch (e) {
                setError("Failed to load location history");
            } finally {
                setLoading(false);
            }
        })();
    }, [selectedUser]);

    /* ── Compute stats ── */
    useEffect(() => {
        if (!history.length) return;
        const lats = history.map(h => h.lat);
        const lngs = history.map(h => h.lng);
        setStats({
            total: history.length,
            minLat: Math.min(...lats).toFixed(5),
            maxLat: Math.max(...lats).toFixed(5),
            minLng: Math.min(...lngs).toFixed(5),
            maxLng: Math.max(...lngs).toFixed(5),
            latest: history[0] ? new Date(history[0].recorded_at).toLocaleString("en-IN") : "N/A",
            earliest: history[history.length - 1] ? new Date(history[history.length - 1].recorded_at).toLocaleString("en-IN") : "N/A",
        });
    }, [history]);

    /* ── Build heatmap + path on history/mode/radius/blur change ── */
    const rebuildLayers = useCallback(async () => {
        if (!leafletMap.current || !history.length) return;
        await ensureHeatPlugin();

        /* Remove existing layers */
        if (heatLayerRef.current) { leafletMap.current.removeLayer(heatLayerRef.current); heatLayerRef.current = null; }
        if (pathLayerRef.current) { leafletMap.current.removeLayer(pathLayerRef.current); pathLayerRef.current = null; }

        const coords = history.map(h => [h.lat, h.lng]);

        /* Build heatmap points — weight by recency */
        if (mode === "heat" || mode === "both") {
            const maxW = history.length;
            const heatPoints = history.map((h, i) => [
                h.lat, h.lng,
                Math.max(0.2, 1 - i / maxW),   // most recent = highest weight
            ]);
            heatLayerRef.current = L.heatLayer(heatPoints, {
                radius: radius,
                blur: blur,
                maxZoom: 18,
                gradient: {
                    0.0: "#0000ff",
                    0.2: "#00aaff",
                    0.4: "#00ffcc",
                    0.6: "#aaff00",
                    0.8: "#ffaa00",
                    1.0: "#ff0000",
                },
                max: 1.0,
            }).addTo(leafletMap.current);
        }

        /* Build trail path */
        if (mode === "path" || mode === "both") {
            pathLayerRef.current = L.polyline(coords, {
                color: "#00d4ff",
                weight: 2.5,
                opacity: 0.85,
                dashArray: "4 4",
            }).addTo(leafletMap.current);

            /* Start / End markers */
            if (coords.length) {
                const lastIcon = L.divIcon({ className: "", html: `<div style="width:14px;height:14px;border-radius:50%;background:#00ff9d;border:2px solid #fff;box-shadow:0 0 8px #00ff9d;"></div>`, iconSize: [14, 14] });
                const firstIcon = L.divIcon({ className: "", html: `<div style="width:14px;height:14px;border-radius:50%;background:#ff4444;border:2px solid #fff;box-shadow:0 0 8px #ff4444;"></div>`, iconSize: [14, 14] });
                L.marker(coords[0], { icon: lastIcon }).addTo(leafletMap.current).bindTooltip("🟢 Latest");
                L.marker(coords[coords.length - 1], { icon: firstIcon }).addTo(leafletMap.current).bindTooltip("🔴 Earliest");
            }
        }

        /* Fit map to bounding box of all points */
        if (coords.length) {
            leafletMap.current.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
        }
    }, [history, mode, radius, blur]);

    useEffect(() => { rebuildLayers(); }, [rebuildLayers]);

    /* ─────────── RENDER ─────────── */
    return (
        <div className="history-root">

            {/* ── TOP COMMAND BAR ── */}
            <div className="hist-cmd-bar">
                <div className="hist-brand">
                    <div className="hist-brand-icon">📡</div>
                    <div>
                        <h1>MOVEMENT INTELLIGENCE</h1>
                        <p>GPS Heat Trail · {selectedUser?.name || "No Subject"} · SMARTNAV OPS</p>
                    </div>
                </div>
                <div className="hist-clock">{clock}</div>
                <div className="hist-actions">
                    <button className="hist-btn" onClick={() => navigate("/police")}>← CMD CENTER</button>
                    <button className="hist-btn danger" onClick={() => navigate("/police/map")}>📡 LIVE TRACK</button>
                </div>
            </div>

            {/* ── BODY ── */}
            <div className="history-body">

                {/* ── LEFT PANEL ── */}
                <div className="hist-left">

                    {/* Subject Card */}
                    <div className="hist-card">
                        <div className="hist-card-title"><span className="hist-dot" />SUBJECT PROFILE</div>
                        <div className="subject-info">
                            <div className="subject-avatar">👤</div>
                            <div>
                                <div className="subject-name">{selectedUser?.name || "Unknown"}</div>
                                <div className="subject-id">UID: {selectedUser?.userId || "N/A"}</div>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    {stats && (
                        <div className="hist-card">
                            <div className="hist-card-title"><span className="hist-dot" style={{ background: "#00ff9d", boxShadow: "0 0 6px #00ff9d" }} />TELEMETRY OVERVIEW</div>
                            <div className="hist-stats">
                                <div className="hstat"><div className="hstat-v">{stats.total}</div><div className="hstat-l">Total Pings</div></div>
                                <div className="hstat"><div className="hstat-v" style={{ color: "#00ff9d", fontSize: 11 }}>{stats.latest}</div><div className="hstat-l">Latest Fix</div></div>
                                <div className="hstat"><div className="hstat-v" style={{ fontSize: 11, color: "#aaa" }}>{stats.earliest}</div><div className="hstat-l">Earliest Fix</div></div>
                            </div>
                            <div className="geo-box">
                                <div className="geo-row"><span>LAT RANGE</span><span style={{ color: "#00d4ff" }}>{stats.minLat}° – {stats.maxLat}°N</span></div>
                                <div className="geo-row"><span>LNG RANGE</span><span style={{ color: "#00d4ff" }}>{stats.minLng}° – {stats.maxLng}°E</span></div>
                            </div>
                        </div>
                    )}

                    {/* Layer Mode */}
                    <div className="hist-card">
                        <div className="hist-card-title"><span className="hist-dot" style={{ background: "#ff8c00", boxShadow: "0 0 6px #ff8c00" }} />LAYER MODE</div>
                        <div className="mode-btns">
                            {[
                                { k: "heat", label: "🔥 Heatmap Only" },
                                { k: "path", label: "📍 Trail Path" },
                                { k: "both", label: "⚡ Both Layers" },
                            ].map(m => (
                                <button
                                    key={m.k}
                                    className={`mode-btn ${mode === m.k ? "active" : ""}`}
                                    onClick={() => setMode(m.k)}
                                >{m.label}</button>
                            ))}
                        </div>
                    </div>

                    {/* Heatmap Controls */}
                    {(mode === "heat" || mode === "both") && (
                        <div className="hist-card">
                            <div className="hist-card-title"><span className="hist-dot" style={{ background: "#c084fc", boxShadow: "0 0 6px #c084fc" }} />HEAT PARAMETERS</div>
                            <div className="slider-row">
                                <label>Radius <span>{radius}px</span></label>
                                <input type="range" min={20} max={120} value={radius} onChange={e => setRadius(+e.target.value)} />
                            </div>
                            <div className="slider-row">
                                <label>Blur <span>{blur}px</span></label>
                                <input type="range" min={10} max={80} value={blur} onChange={e => setBlur(+e.target.value)} />
                            </div>
                            {/* Gradient legend */}
                            <div className="heat-legend">
                                <span>Low</span>
                                <div className="heat-legend-bar" />
                                <span>High</span>
                            </div>
                        </div>
                    )}

                    {/* Tile Style */}
                    <div className="hist-card">
                        <div className="hist-card-title"><span className="hist-dot" />MAP LAYER</div>
                        <div className="tile-btns">
                            {[
                                { k: "dark", label: "🌑 Dark" },
                                { k: "satellite", label: "🛰 Satellite" },
                                { k: "street", label: "🗺 Street" },
                            ].map(t => (
                                <button key={t.k} className={`tile-btn ${tileStyle === t.k ? "active" : ""}`} onClick={() => setTileStyle(t.k)}>{t.label}</button>
                            ))}
                        </div>
                    </div>

                    {/* Recent pings list */}
                    {history.length > 0 && (
                        <div className="hist-card">
                            <div className="hist-card-title"><span className="hist-dot" style={{ background: "#ff3700", boxShadow: "0 0 6px #ff3700" }} />RECENT PINGS</div>
                            <div className="ping-list">
                                {history.slice(0, 12).map((loc, i) => (
                                    <div key={i} className="ping-item" onClick={() => { if (leafletMap.current) leafletMap.current.flyTo([loc.lat, loc.lng], 16, { duration: 1 }); }}>
                                        <div className="ping-dot" style={{ background: i === 0 ? "#00ff9d" : i < 3 ? "#ff8c00" : "#3a6a8a" }} />
                                        <div>
                                            <div className="ping-coords">{loc.lat.toFixed(5)}°N, {loc.lng.toFixed(5)}°E</div>
                                            <div className="ping-time">{new Date(loc.recorded_at).toLocaleString("en-IN")}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── MAP CENTER ── */}
                <div className="hist-map-center">
                    {loading && (
                        <div className="hist-loader">
                            <div className="hist-radar" />
                            <div className="hist-loader-text">TRIANGULATING POSITION HISTORY...</div>
                        </div>
                    )}
                    {error && (
                        <div className="hist-error">
                            <div style={{ fontSize: 36 }}>⚠</div>
                            <div>{error}</div>
                        </div>
                    )}
                    {!loading && !error && history.length === 0 && (
                        <div className="hist-empty">
                            <div style={{ fontSize: 48 }}>📡</div>
                            <div>NO GPS HISTORY FOUND FOR THIS SUBJECT</div>
                        </div>
                    )}
                    <div
                        ref={mapRef}
                        className="hist-leaflet"
                        style={{ opacity: loading || error ? 0 : 1 }}
                    />

                    {/* Map Overlays */}
                    <div className="map-overlay-badge">
                        🔥 HEAT TRAIL · {history.length} PINGS · {selectedUser?.name || "SUBJECT"}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PoliceLocationHistory;
