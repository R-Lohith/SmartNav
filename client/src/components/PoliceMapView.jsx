import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ChevronRight, Layers, Globe, X, MapPin, Loader } from "lucide-react";
import "../styles/PoliceMapView3D.css";

/* ─────────────────────────────────────────────────────────────
   Load CesiumJS 1.118 from CDN (no Ion token needed)
────────────────────────────────────────────────────────────── */
let cesiumLoadPromise = null;
function ensureCesium() {
    if (cesiumLoadPromise) return cesiumLoadPromise;
    cesiumLoadPromise = new Promise((resolve, reject) => {
        if (window.Cesium) return resolve(window.Cesium);
        if (!document.getElementById("cesium-css")) {
            const css = document.createElement("link");
            css.id = "cesium-css";
            css.rel = "stylesheet";
            css.href = "https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Widgets/widgets.css";
            document.head.appendChild(css);
        }
        const script = document.createElement("script");
        script.src = "https://cesium.com/downloads/cesiumjs/releases/1.118/Build/Cesium/Cesium.js";
        script.onload = () => window.Cesium ? resolve(window.Cesium) : reject(new Error("Cesium not found after load"));
        script.onerror = () => reject(new Error("Failed to load CesiumJS CDN"));
        document.head.appendChild(script);
    });
    return cesiumLoadPromise;
}

/* ── Imagery definitions ── */
const IMAGERY = {
    satellite: {
        label: "🛰 Satellite",
        make: (C) => new C.UrlTemplateImageryProvider({
            url: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            credit: "Esri World Imagery",
            maximumLevel: 19,
        }),
    },
    dark: {
        label: "🌑 Dark",
        make: (C) => new C.UrlTemplateImageryProvider({
            url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            subdomains: ["a", "b", "c", "d"],
            credit: "CartoDB",
            maximumLevel: 20,
        }),
    },
    street: {
        label: "🗺 Street",
        make: (C) => new C.UrlTemplateImageryProvider({
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            credit: "OpenStreetMap contributors",
            maximumLevel: 20,
        }),
    },
    topo: {
        label: "🏔 Topo",
        make: (C) => new C.UrlTemplateImageryProvider({
            url: "https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
            credit: "Esri World Topo Map",
            maximumLevel: 19,
        }),
    },
};

/* ═══════════════════════════ COMPONENT ═══════════════════════════ */
export default function PoliceMapView({ selectedUser }) {
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const searchPinRef = useRef(null);

    const [mapReady, setMapReady] = useState(false);
    const [cesiumErr, setCesiumErr] = useState(null);
    const [imagery, setImagery] = useState("satellite");
    const [clock, setClock] = useState("");
    const [camInfo, setCamInfo] = useState({ alt: 20000, heading: 0, pitch: -90 });

    /* Search state */
    const [query, setQuery] = useState("");
    const [latQuery, setLatQuery] = useState("");
    const [lngQuery, setLngQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchRes, setSearchRes] = useState(null);   // { name, lat, lng, display }
    const [searchErr, setSearchErr] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSug, setShowSug] = useState(false);
    const sugTimer = useRef(null);

    /* ── Clock ── */
    useEffect(() => {
        const t = setInterval(() => setClock(
            new Date().toLocaleTimeString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" }) + " IST"
        ), 1000);
        return () => clearInterval(t);
    }, []);

    /* ─────────────────── INIT CESIUM ─────────────────── */
    useEffect(() => {
        if (!containerRef.current || viewerRef.current) return;
        let alive = true;

        (async () => {
            try {
                const C = await ensureCesium();
                if (!alive || !containerRef.current) return;

                /* Disable Ion to avoid token errors */
                C.Ion.defaultAccessToken = undefined;

                /* ── Viewer ── */
                const viewer = new C.Viewer(containerRef.current, {
                    animation: false,
                    baseLayerPicker: false,
                    fullscreenButton: false,
                    geocoder: false,
                    homeButton: false,
                    infoBox: false,
                    sceneModePicker: false,
                    selectionIndicator: false,
                    timeline: false,
                    navigationHelpButton: false,
                    navigationInstructionsInitiallyVisible: false,
                    creditContainer: (() => {
                        const d = document.createElement("div");
                        d.style.display = "none";
                        return d;
                    })(),
                    scene3DOnly: true,   // only 3D globe, no 2D/Columbus
                    imageryProvider: new C.UrlTemplateImageryProvider({
                        url: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                        credit: "Esri World Imagery",
                        maximumLevel: 19,
                    }),
                    terrainProvider: new C.EllipsoidTerrainProvider(),
                });

                /* ── Scene settings ── */
                viewer.scene.backgroundColor = C.Color.fromCssColorString("#010508");
                viewer.scene.skyAtmosphere.show = true;
                viewer.scene.skyBox.show = true;
                viewer.scene.sun.show = true;
                viewer.scene.moon.show = false;
                viewer.scene.globe.enableLighting = true;
                viewer.scene.globe.atmosphereLightIntensity = 12.0;
                viewer.scene.fog.enabled = true;
                viewer.scene.fog.density = 0.00008;
                viewer.scene.fog.minimumBrightness = 0.05;
                viewer.scene.globe.depthTestAgainstTerrain = false;

                /* ── Camera telemetry ── */
                viewer.scene.postRender.addEventListener(() => {
                    if (!alive) return;
                    const cam = viewer.camera;
                    const carto = cam.positionCartographic;
                    setCamInfo({
                        alt: carto ? Math.round(carto.height / 1000) : 0,
                        heading: Math.round(C.Math.toDegrees(cam.heading)),
                        pitch: Math.round(C.Math.toDegrees(cam.pitch)),
                    });
                });

                viewerRef.current = viewer;
                setMapReady(true);

                /* Force imagery re-add (avoids initial blue globe) */
                setTimeout(() => {
                    if (!alive || !viewer) return;
                    viewer.imageryLayers.removeAll();
                    viewer.imageryLayers.addImageryProvider(
                        new C.UrlTemplateImageryProvider({
                            url: "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                            credit: "Esri World Imagery",
                            maximumLevel: 19,
                        })
                    );
                }, 300);

                /* ── Initial view: full Earth visible ── */
                viewer.camera.setView({
                    destination: C.Cartesian3.fromDegrees(78.6, 10.0, 18_000_000),
                    orientation: {
                        heading: C.Math.toRadians(0),
                        pitch: C.Math.toRadians(-90),
                        roll: 0,
                    },
                });

            } catch (err) {
                console.error("Cesium init error:", err);
                if (alive) setCesiumErr(err.message);
            }
        })();

        return () => { alive = false; };
    }, []);

    /* ── Switch imagery ── */
    const switchImagery = useCallback((key) => {
        const viewer = viewerRef.current;
        if (!viewer) return;
        const C = window.Cesium;
        setImagery(key);
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(IMAGERY[key].make(C));
    }, []);

    /* ─────────────────── SEARCH LOGIC ─────────────────── */

    /* Fetch autocomplete suggestions via Nominatim */
    const fetchSuggestions = useCallback((q) => {
        clearTimeout(sugTimer.current);
        if (q.trim().length < 2) { setSuggestions([]); return; }
        sugTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&accept-language=en`
                );
                const data = await res.json();
                setSuggestions(data.map(d => ({
                    display: d.display_name,
                    lat: parseFloat(d.lat),
                    lng: parseFloat(d.lon),
                    type: d.type,
                })));
                setShowSug(true);
            } catch {
                setSuggestions([]);
            }
        }, 320);
    }, []);

    /* Fly Cesium to searched location */
    const flyToPlace = useCallback((place) => {
        const viewer = viewerRef.current;
        if (!viewer || !place) return;
        const C = window.Cesium;

        /* Remove old pin */
        if (searchPinRef.current) { viewer.entities.remove(searchPinRef.current); searchPinRef.current = null; }

        /* Add glowing search result marker */
        searchPinRef.current = viewer.entities.add({
            name: place.display,
            position: C.Cartesian3.fromDegrees(place.lng, place.lat, 0),
            point: {
                pixelSize: 16,
                color: C.Color.fromCssColorString("#ff8c00"),
                outlineColor: C.Color.WHITE,
                outlineWidth: 3,
                heightReference: C.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance: new C.NearFarScalar(1e3, 2, 2e6, 0.5),
            },
            label: {
                text: `📍 ${place.name}`,
                font: "bold 14px 'Rajdhani', monospace",
                fillColor: C.Color.fromCssColorString("#ff8c00"),
                outlineColor: C.Color.BLACK,
                outlineWidth: 3,
                style: C.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new C.Cartesian2(0, -44),
                heightReference: C.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                showBackground: true,
                backgroundColor: C.Color.fromCssColorString("rgba(3,8,14,0.9)"),
                backgroundPadding: new C.Cartesian2(10, 5),
                scaleByDistance: new C.NearFarScalar(1e3, 1, 8e5, 0.4),
            },
            cylinder: {
                length: 1500,
                topRadius: 0,
                bottomRadius: 200,
                material: C.Color.fromCssColorString("#ff8c00").withAlpha(0.1),
                outline: true,
                outlineColor: C.Color.fromCssColorString("#ff8c00").withAlpha(0.5),
                numberOfVerticalLines: 0,
            },
        });

        /* Street-level fly-in */
        viewer.camera.flyTo({
            destination: C.Cartesian3.fromDegrees(place.lng, place.lat - 0.01, 1_500),
            orientation: {
                heading: C.Math.toRadians(10),
                pitch: C.Math.toRadians(-32),
                roll: 0,
            },
            duration: 4.0,
            easingFunction: C.EasingFunction.QUINTIC_IN_OUT,
        });

        /* Switch to satellite for street-level detail */
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(IMAGERY.satellite.make(C));
        setImagery("satellite");
    }, []);

    /* Main search — first try Python backend, fallback to Nominatim */
    const doSearch = useCallback(async (searchQuery) => {
        const q = (searchQuery || query).trim();
        if (!q) return;
        setSearching(true);
        setSearchErr(null);
        setShowSug(false);
        setSuggestions([]);

        try {
            /* 0️⃣ Check for direct coordinates */
            const coordMatch = q.match(/^\s*(-?\d+(\.\d+)?)\s*[,\s]\s*(-?\d+(\.\d+)?)\s*$/);
            if (coordMatch) {
                const lat = parseFloat(coordMatch[1]);
                const lng = parseFloat(coordMatch[3]);
                const result = {
                    name: "Target Coordinates",
                    lat: lat,
                    lng: lng,
                    display: `Lat: ${lat}, Lng: ${lng}`
                };
                setSearchRes(result);
                flyToPlace(result);
                return;
            }

            /* 1️⃣ Try Python backend (fuzzy-matches Tamil Nadu constituencies) */
            let backendLat = null, backendLng = null, backendName = null;
            try {
                const pyRes = await fetch(
                    `http://localhost:5001/safety_data`
                );
                if (pyRes.ok) {
                    const pyData = await pyRes.json();
                    const found = pyData.find(d =>
                        d.AC_NAME?.toLowerCase().includes(q.toLowerCase()) ||
                        d.DIST_NAME?.toLowerCase().includes(q.toLowerCase())
                    );
                    if (found) {
                        backendLat = found.Latitude;
                        backendLng = found.Longitude;
                        backendName = found.AC_NAME || found.DIST_NAME;
                    }
                }
            } catch { /* backend offline — skip */ }

            /* 2️⃣ Nominatim geocoding (worldwide, always works) */
            const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&accept-language=en`
            );
            const geoData = await geoRes.json();
            const geo = geoData[0];

            /* Prefer backend result (more accurate for Tamil Nadu data) */
            const result = backendLat !== null ? {
                name: backendName,
                lat: backendLat,
                lng: backendLng,
                display: `${backendName} · Tamil Nadu Safety Data`,
            } : geo ? {
                name: geo.display_name.split(",")[0],
                lat: parseFloat(geo.lat),
                lng: parseFloat(geo.lon),
                display: geo.display_name,
            } : null;

            if (!result) {
                setSearchErr(`No results found for "${q}"`);
            } else {
                setSearchRes(result);
                flyToPlace(result);
            }
        } catch (err) {
            setSearchErr("Search failed. Check your connection.");
        } finally {
            setSearching(false);
        }
    }, [query, flyToPlace]);

    /* Pick from autocomplete */
    const pickSuggestion = useCallback((sug) => {
        const place = {
            name: sug.display.split(",")[0],
            lat: sug.lat,
            lng: sug.lng,
            display: sug.display,
        };
        setQuery(place.name);
        setLatQuery("");
        setLngQuery("");
        setShowSug(false);
        setSuggestions([]);
        setSearchRes(place);
        flyToPlace(place);
    }, [flyToPlace]);

    const doCoordSearch = useCallback(() => {
        const lat = parseFloat(latQuery);
        const lng = parseFloat(lngQuery);
        if (isNaN(lat) || isNaN(lng)) {
            setSearchErr("Please enter valid numeric coordinates.");
            return;
        }
        setSearchErr(null);
        setSearching(true);
        const result = {
            name: "Target Coordinates",
            lat: lat,
            lng: lng,
            display: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`
        };
        setTimeout(() => {
            setSearchRes(result);
            flyToPlace(result);
            setSearching(false);
        }, 300);
    }, [latQuery, lngQuery, flyToPlace]);

    const clearSearch = useCallback(() => {
        setQuery("");
        setLatQuery("");
        setLngQuery("");
        setSearchRes(null);
        setSearchErr(null);
        setSuggestions([]);
        setShowSug(false);
        /* Remove pin */
        const viewer = viewerRef.current;
        if (viewer && searchPinRef.current) {
            viewer.entities.remove(searchPinRef.current);
            searchPinRef.current = null;
        }
        /* Zoom back out to full globe */
        if (viewer && window.Cesium) {
            const C = window.Cesium;
            viewer.camera.flyTo({
                destination: C.Cartesian3.fromDegrees(78.6, 10.0, 18_000_000),
                orientation: { heading: 0, pitch: C.Math.toRadians(-90), roll: 0 },
                duration: 2.5,
            });
        }
    }, []);

    /* ─────────── RENDER ─────────── */
    return (
        <div className="cia-root">

            {/* TOP BAR */}
            <header className="cia-header">
                <div className="cia-brand-section">
                    <button className="cia-icon-btn" id="cia-back-btn" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} />
                    </button>
                    <div className="cia-brand-text">
                        <h1>3D GLOBE INTELLIGENCE</h1>
                        <span className="cia-breadcrumb">
                            Command <ChevronRight size={11} /> Geospatial Ops <ChevronRight size={11} />
                            <strong>{selectedUser?.name || "Global View"}</strong>
                        </span>
                    </div>
                </div>
                <div className="cia-telemetry-bar">
                    <div className="cia-tele-item"><Globe size={13} className="tele-green" /><span>ALT: {camInfo.alt} km</span></div>
                    <div className="cia-tele-item"><Layers size={13} className="tele-blue" /><span>HDG: {camInfo.heading}°</span></div>
                    <div className="cia-clock">{clock}</div>
                </div>
            </header>

            {/* MAIN */}
            <main className="cia-stage">

                {/* ── SLIM LEFT PANEL ── */}
                <div className="cia-intel-panel">

                    {/* ── SEARCH BOX ── */}
                    <div className="search-section">
                        <div className="search-label">
                            <Search size={12} />
                            <span>LOCATION SEARCH</span>
                        </div>
                        <div className="search-input-wrap">
                            <div className="search-box-row">
                                <input
                                    id="globe-search-input"
                                    className="search-input"
                                    type="text"
                                    placeholder="Search any place worldwide..."
                                    value={query}
                                    onChange={e => {
                                        setQuery(e.target.value);
                                        fetchSuggestions(e.target.value);
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") doSearch();
                                        if (e.key === "Escape") { setShowSug(false); }
                                    }}
                                    onFocus={() => suggestions.length > 0 && setShowSug(true)}
                                    autoComplete="off"
                                />
                                {query && (
                                    <button className="search-clear-btn" onClick={clearSearch} title="Clear">
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Coordinate Search UI */}
                            <div style={{ display: "flex", gap: "8px", margin: "4px 0" }}>
                                <input
                                    className="search-input"
                                    type="number"
                                    placeholder="Latitude"
                                    value={latQuery}
                                    onChange={e => {
                                        setLatQuery(e.target.value);
                                        if (e.target.value || lngQuery) setQuery(""); // clear text query if using coords
                                    }}
                                    style={{ padding: "8px 12px", flex: 1, minWidth: 0, fontSize: "12px", letterSpacing: "1px" }}
                                    onKeyDown={e => { if (e.key === "Enter") doCoordSearch(); }}
                                />
                                <input
                                    className="search-input"
                                    type="number"
                                    placeholder="Longitude"
                                    value={lngQuery}
                                    onChange={e => {
                                        setLngQuery(e.target.value);
                                        if (latQuery || e.target.value) setQuery(""); // clear text query if using coords
                                    }}
                                    style={{ padding: "8px 12px", flex: 1, minWidth: 0, fontSize: "12px", letterSpacing: "1px" }}
                                    onKeyDown={e => { if (e.key === "Enter") doCoordSearch(); }}
                                />
                            </div>

                            <button
                                className={`search-go-btn ${searching ? "loading" : ""}`}
                                onClick={() => {
                                    if (query.trim()) doSearch();
                                    else if (latQuery && lngQuery) doCoordSearch();
                                }}
                                disabled={searching || (!query.trim() && !(latQuery && lngQuery))}
                                id="globe-search-btn"
                            >
                                {searching ? <Loader size={14} className="spin-anim" /> : <Search size={14} />}
                                {searching ? "SEARCHING..." : "FLY TO LOCATION"}
                            </button>

                            {/* Autocomplete dropdown */}
                            {showSug && suggestions.length > 0 && (
                                <div className="search-dropdown">
                                    {suggestions.map((s, i) => (
                                        <div key={i} className="search-sug-item" onClick={() => pickSuggestion(s)}>
                                            <MapPin size={11} className="sug-icon" />
                                            <div>
                                                <div className="sug-name">{s.display.split(",")[0]}</div>
                                                <div className="sug-detail">{s.display.split(",").slice(1, 3).join(",")}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Search error */}
                        {searchErr && (
                            <div className="search-error">{searchErr}</div>
                        )}

                        {/* Search result card */}
                        {searchRes && !searchErr && (
                            <div className="search-result-card">
                                <div className="src-dot" />
                                <div className="src-content">
                                    <div className="src-name">{searchRes.name}</div>
                                    <div className="src-detail">{searchRes.display}</div>
                                    <div className="src-coords">
                                        {searchRes.lat.toFixed(5)}°N · {searchRes.lng.toFixed(5)}°E
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="panel-divider" />

                    {/* Imagery selector */}
                    <div className="cia-card">
                        <div className="cia-card-label"><Layers size={12} /> IMAGERY LAYER</div>
                        <div className="cia-style-grid">
                            {Object.entries(IMAGERY).map(([k, v]) => (
                                <button key={k} className={`cia-style-btn ${imagery === k ? "active" : ""}`}
                                    onClick={() => switchImagery(k)}>{v.label}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── FULL CESIUM GLOBE ── */}
                <div className="cia-map-container">
                    <div ref={containerRef} className="cia-cesium-globe" />

                    {/* Loading overlay */}
                    {!mapReady && !cesiumErr && (
                        <div className="cia-loading">
                            <div className="cia-globe-spinner">
                                <div className="globe-arc" />
                                <div className="globe-arc" style={{ animationDelay: "-0.5s", opacity: 0.4, width: 56, height: 56 }} />
                                <div className="globe-core" />
                            </div>
                            <div className="cia-loading-text">LOADING 3D GLOBE</div>
                            <div className="cia-loading-sub">Streaming Esri World Satellite Imagery…</div>
                        </div>
                    )}

                    {cesiumErr && (
                        <div className="cia-loading">
                            <div style={{ fontSize: 44 }}>⚠</div>
                            <div className="cia-loading-text" style={{ color: "#ff3700" }}>GLOBE ERROR</div>
                            <div className="cia-loading-sub">{cesiumErr}</div>
                        </div>
                    )}

                    {/* Floating Zoom Controls — always visible when map ready */}
                    {mapReady && (
                        <div className="globe-zoom-controls">
                            <button
                                id="globe-zoom-in"
                                className="globe-zoom-btn"
                                title="Zoom In"
                                onClick={() => {
                                    const v = viewerRef.current;
                                    if (!v) return;
                                    const C = window.Cesium;
                                    const cam = v.camera;
                                    cam.zoomIn(cam.positionCartographic.height * 0.4);
                                }}
                            >
                                +
                            </button>
                            <div className="zoom-alt-display">
                                {camInfo.alt >= 1000
                                    ? `${(camInfo.alt / 1000).toFixed(0)}Mm`
                                    : `${camInfo.alt}km`}
                            </div>
                            <button
                                id="globe-zoom-out"
                                className="globe-zoom-btn"
                                title="Zoom Out"
                                onClick={() => {
                                    const v = viewerRef.current;
                                    if (!v) return;
                                    v.camera.zoomOut(v.camera.positionCartographic.height * 0.5);
                                }}
                            >
                                −
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}