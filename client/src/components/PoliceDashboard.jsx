import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserCircle, Shield, MapPin, History, Activity, Terminal, ExternalLink, RadioTower, FileText, AlertTriangle, Lock, Trash2, Plus, LogOut } from "lucide-react";
import { MapContainer, TileLayer, Circle, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/PoliceDashboard.css";

const PoliceDashboard = ({ onSelectUser }) => {
    const [query, setQuery] = useState("");
    const [user, setUser] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState("search");
    const [restrictedData, setRestrictedData] = useState({ lat: "", lng: "" });
    const [tempBlockedData, setTempBlockedData] = useState({ lat: "", lng: "", radius: "500", label: "" });
    const [tempBlockedZones, setTempBlockedZones] = useState([]);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/login");
    };

    useEffect(() => {
        const stored = localStorage.getItem("tempBlockedZones");
        if (stored) setTempBlockedZones(JSON.parse(stored));
    }, []);

    const handleAddTempBlocked = (e) => {
        e.preventDefault();
        const { lat, lng, radius, label } = tempBlockedData;
        if (!lat || !lng) return alert("Latitude and Longitude are required");
        const newZone = {
            id: Date.now(),
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            radius: parseFloat(radius) || 500,
            label: label.trim() || `Blocked Zone`,
            createdAt: new Date().toISOString(),
        };
        const updated = [newZone, ...tempBlockedZones];
        setTempBlockedZones(updated);
        localStorage.setItem("tempBlockedZones", JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        setTempBlockedData({ lat: "", lng: "", radius: "500", label: "" });
    };

    const handleDeleteTempBlocked = (id) => {
        const updated = tempBlockedZones.filter(z => z.id !== id);
        setTempBlockedZones(updated);
        localStorage.setItem("tempBlockedZones", JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
    };

    const dummyComplaints = [
        { id: "C-101", name: "Murugan K", lastMissingTime: "2023-10-12 14:30", lat: 13.0827, lng: 80.2707, place: "Chennai", status: "Missing" },
        { id: "C-102", name: "Divya R", lastMissingTime: "2023-10-14 09:15", lat: 11.0168, lng: 76.9558, place: "Coimbatore", status: "Found" },
        { id: "C-103", name: "Selvam V", lastMissingTime: "2023-10-15 18:45", lat: 9.9252, lng: 78.1198, place: "Madurai", status: "Missing" },
        { id: "C-104", name: "Karthik P", lastMissingTime: "2023-10-16 22:10", lat: 10.7905, lng: 78.7047, place: "Trichy", status: "Found" },
        { id: "C-105", name: "Anbu M", lastMissingTime: "2023-10-17 07:20", lat: 11.6643, lng: 78.1460, place: "Salem", status: "Missing" },
    ];

    const handleSetRestricted = (e) => {
        e.preventDefault();
        if (!restrictedData.lat || !restrictedData.lng) return alert("Coordinates are required");
        const stored = localStorage.getItem("restrictedAreas");
        const updatedLogs = stored ? JSON.parse(stored) : [];
        const newLog = { lat: restrictedData.lat, lng: restrictedData.lng, id: Date.now() };
        updatedLogs.unshift(newLog);
        localStorage.setItem("restrictedAreas", JSON.stringify(updatedLogs));
        setRestrictedData({ lat: "", lng: "" });
        alert("Restricted area coordinates updated successfully!");
    };

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        try {
            const res = await fetch(`http://localhost:5000/api/police/search?q=${query}`);
            if (!res.ok) throw new Error("Failed to fetch user");
            const data = await res.json();
            setUser(data);
        } catch (error) {
            console.error(error);
            alert("Subject not identified in database");
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="police-dashboard technical-grid">
            <aside className="dashboard-sidebar glass-panel">
                <div className="sidebar-brand">
                    <Shield className="brand-icon" />
                    <div className="brand-info">
                        <h2>Welcome</h2>
                        <span>Central Command Center</span>
                    </div>
                </div>

                <div className="command-search">
                    <label><Terminal size={12} /> Search Database</label>
                    <div className="search-input-wrapper">
                        <input
                            type="text"
                            placeholder="Identify subject (Name, Email, UID)..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch} disabled={isSearching}>
                            {isSearching ? <Activity className="spinner" size={16} /> : <Search size={16} />}
                        </button>
                    </div>
                </div>

                <nav className="dashboard-nav">
                    <div className={`nav-item ${activeTab === "search" ? "active" : ""}`} onClick={() => setActiveTab("search")}>
                        <Activity size={18} />
                        <span>Personnel Search</span>
                    </div>
                    <div className={`nav-item ${activeTab === "complaints" ? "active" : ""}`} onClick={() => setActiveTab("complaints")}>
                        <FileText size={18} />
                        <span>Complaints</span>
                    </div>
                    <div className={`nav-item ${activeTab === "restricted" ? "active" : ""}`} onClick={() => setActiveTab("restricted")}>
                        <AlertTriangle size={18} />
                        <span>Restricted Zones</span>
                    </div>
                    <div className={`nav-item ${activeTab === "tempblocked" ? "active" : ""}`} onClick={() => setActiveTab("tempblocked")} style={{ background: activeTab === "tempblocked" ? 'rgba(0,180,255,0.1)' : '', border: activeTab === "tempblocked" ? '1px solid rgba(0,180,255,0.3)' : '', color: activeTab === "tempblocked" ? '#00b4ff' : '' }}>
                        <Lock size={18} style={{ color: activeTab === "tempblocked" ? '#00b4ff' : '' }} />
                        <span>Temp Blocked Zones</span>
                        {tempBlockedZones.length > 0 && <span style={{ marginLeft: 'auto', background: '#00b4ff', color: '#000', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{tempBlockedZones.length}</span>}
                    </div>
                    <div className="nav-item" onClick={() => navigate('/police/restricted-logs')}>
                        <FileText size={18} />
                        <span>Restricted Area Logs</span>
                    </div>
                    <div className="nav-item" onClick={() => navigate('/police/map')}>
                        <MapPin size={18} />
                        <span>3D GPS Track</span>
                    </div>
                    <div
                        className="nav-item"
                        onClick={() => navigate('/police/monitoring')}
                        style={{ marginTop: 8, background: 'rgba(255,55,0,0.08)', border: '1px solid rgba(255,55,0,0.25)', borderRadius: 8, color: '#ff6030' }}
                    >
                        <RadioTower size={18} style={{ color: '#ff4400' }} />
                        <span style={{ fontWeight: 700, letterSpacing: 1 }}>⚡ Activate Monitoring</span>
                    </div>
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="main-header">
                    <div className="header-meta">
                        <h1>Security Intel Platform</h1>
                    </div>
                    <div className="operator-info">
                        <span>Operator: Chief Admin</span>
                        <div className="status-indicator"></div>
                        <button className="police-logout-btn" onClick={handleLogout} title="Sign Out">
                            <LogOut size={16} />
                        </button>
                    </div>
                </header>

                <div className="content-area">
                    {activeTab === "search" && (
                        user ? (
                            <div className="subject-profile glass-panel">
                                <div className="profile-top">
                                    <div className="subject-id-card">
                                        <div className="avatar-wrapper">
                                            <UserCircle size={80} />
                                            <span className={`trust-badge ${user.role}`}>Verified Subject</span>
                                        </div>
                                        <div className="id-details">
                                            <h2>{user.name}</h2>
                                            <span className="uid">UID: {user.userId || 'SEC-00412'}</span>
                                        </div>
                                    </div>
                                    <div className="quick-actions">
                                        <button className="primary-action" onClick={() => { onSelectUser(user); navigate("/police/map"); }}>
                                            <MapPin size={18} />
                                            <span>GPS Track</span>
                                        </button>
                                        <button className="secondary-action" onClick={() => { onSelectUser(user); navigate("/police/history"); }}>
                                            <History size={18} />
                                            <span>🔥 Heat Trail</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="profile-grid">
                                    <div className="intel-block">
                                        <label>Contact Intelligence</label>
                                        <div className="data-row"><span>Email:</span> <p>{user.email}</p></div>
                                        <div className="data-row"><span>Mobile:</span> <p>{user.phone}</p></div>
                                        <div className="data-row"><span>Emergency:</span> <p className="danger-text">{user.emergency_number}</p></div>
                                    </div>
                                    <div className="intel-block">
                                        <label>Biometric Profile</label>
                                        <div className="data-row"><span>Blood Group:</span> <p>{user.blood_group}</p></div>
                                        <div className="data-row"><span>Gender:</span> <p>{user.gender}</p></div>
                                        <div className="data-row"><span>DOB:</span> <p>{user.dob}</p></div>
                                    </div>
                                    <div className="intel-block full-width">
                                        <label>Residential Coordinates</label>
                                        <p className="address-val">{user.address}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="dashboard-empty glass-panel">
                                <Shield size={48} className="empty-icon" />
                                <h3>Awaiting Subject Identification</h3>
                                <p>Utilize the console in the left sidebar to query the SmartNav Personnel Database.</p>
                            </div>
                        )
                    )}

                    {activeTab === "complaints" && (
                        <div className="complaints-section glass-panel">
                            <h2><FileText size={20} /> Regional Complaints (Tamil Nadu)</h2>
                            <div className="table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Subject Name</th>
                                            <th>District (Place)</th>
                                            <th>Time of Last Missing</th>
                                            <th>Coordinates</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dummyComplaints.map(c => (
                                            <tr key={c.id}>
                                                <td>{c.id}</td>
                                                <td>{c.name}</td>
                                                <td>{c.place}</td>
                                                <td>{c.lastMissingTime}</td>
                                                <td style={{ fontFamily: "monospace" }}>{c.lat}, {c.lng}</td>
                                                <td>
                                                    <span className={`status-badge ${c.status.toLowerCase()}`}>
                                                        {c.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "restricted" && (
                        <div className="restricted-section">
                            <div className="form-panel glass-panel">
                                <h2><AlertTriangle size={20} /> Set Restricted Area Entry</h2>
                                <form className="restricted-form" onSubmit={handleSetRestricted}>
                                    <div className="form-group row">
                                        <div className="input-group">
                                            <label>Latitude</label>
                                            <input type="number" step="any" value={restrictedData.lat} onChange={e => setRestrictedData({ ...restrictedData, lat: e.target.value })} required placeholder="e.g. 13.0827" />
                                        </div>
                                        <div className="input-group">
                                            <label>Longitude</label>
                                            <input type="number" step="any" value={restrictedData.lng} onChange={e => setRestrictedData({ ...restrictedData, lng: e.target.value })} required placeholder="e.g. 80.2707" />
                                        </div>
                                    </div>
                                    <button type="submit" className="primary-action full-btn">Set Restricted Coordinates</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === "tempblocked" && (
                        <div className="tempblocked-section">
                            {/* Add Zone Form */}
                            <div className="form-panel glass-panel tempblocked-form-panel">
                                <h2><Lock size={20} style={{ color: '#00b4ff' }} /> Add Temporary Blocked Zone</h2>
                                <p className="tempblocked-desc">Define a temporary restricted perimeter. It will appear on both the Admin Map and Live Monitoring Map in <span style={{ color: '#00b4ff', fontWeight: 700 }}>blue</span>.</p>
                                <form className="restricted-form" onSubmit={handleAddTempBlocked}>
                                    <div className="form-group row">
                                        <div className="input-group">
                                            <label>Zone Label</label>
                                            <input
                                                type="text"
                                                value={tempBlockedData.label}
                                                onChange={e => setTempBlockedData({ ...tempBlockedData, label: e.target.value })}
                                                placeholder="e.g. VIP Corridor, Protest Area"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group row">
                                        <div className="input-group">
                                            <label>Latitude</label>
                                            <input type="number" step="any" value={tempBlockedData.lat} onChange={e => setTempBlockedData({ ...tempBlockedData, lat: e.target.value })} required placeholder="e.g. 13.0827" />
                                        </div>
                                        <div className="input-group">
                                            <label>Longitude</label>
                                            <input type="number" step="any" value={tempBlockedData.lng} onChange={e => setTempBlockedData({ ...tempBlockedData, lng: e.target.value })} required placeholder="e.g. 80.2707" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Radius (meters)</label>
                                        <input
                                            type="number"
                                            min="100" max="50000" step="100"
                                            value={tempBlockedData.radius}
                                            onChange={e => setTempBlockedData({ ...tempBlockedData, radius: e.target.value })}
                                            placeholder="e.g. 500"
                                        />
                                        <span className="radius-hint">Perimeter radius in metres (min 100m, max 50km)</span>
                                    </div>
                                    <button type="submit" className="primary-action full-btn tempblocked-submit-btn">
                                        <Plus size={16} /> Activate Blocked Zone
                                    </button>
                                </form>
                            </div>

                            {/* Mini-Map Preview */}
                            {tempBlockedData.lat && tempBlockedData.lng && !isNaN(parseFloat(tempBlockedData.lat)) && !isNaN(parseFloat(tempBlockedData.lng)) && (
                                <div className="form-panel glass-panel" style={{ padding: 20 }}>
                                    <h2 style={{ fontSize: 14, marginBottom: 12 }}><MapPin size={16} style={{ color: '#00b4ff' }} /> Zone Preview</h2>
                                    <div style={{ height: 220, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,180,255,0.3)' }}>
                                        <MapContainer
                                            key={`${tempBlockedData.lat}-${tempBlockedData.lng}-${tempBlockedData.radius}`}
                                            center={[parseFloat(tempBlockedData.lat), parseFloat(tempBlockedData.lng)]}
                                            zoom={13}
                                            style={{ width: '100%', height: '100%' }}
                                            zoomControl={false}
                                            attributionControl={false}
                                            scrollWheelZoom={false}
                                        >
                                            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                            <Circle
                                                center={[parseFloat(tempBlockedData.lat), parseFloat(tempBlockedData.lng)]}
                                                radius={parseFloat(tempBlockedData.radius) || 500}
                                                pathOptions={{ color: '#00b4ff', fillColor: '#00b4ff', fillOpacity: 0.25, weight: 2.5 }}
                                            >
                                                <Tooltip permanent direction="top"><span style={{ color: '#00b4ff', fontFamily: 'monospace', fontSize: 11 }}>🔵 {tempBlockedData.label || 'Temp Blocked Zone'}</span></Tooltip>
                                            </Circle>
                                        </MapContainer>
                                    </div>
                                </div>
                            )}

                            {/* Active Zones List */}
                            {tempBlockedZones.length > 0 && (
                                <div className="form-panel glass-panel">
                                    <h2><Lock size={18} style={{ color: '#00b4ff' }} /> Active Temp Blocked Zones <span style={{ color: '#00b4ff', fontSize: 12, marginLeft: 8 }}>({tempBlockedZones.length})</span></h2>
                                    <div className="tempblocked-list">
                                        {tempBlockedZones.map(zone => (
                                            <div key={zone.id} className="tempblocked-list-item">
                                                <div className="tmpz-pulse" />
                                                <div className="tmpz-info">
                                                    <div className="tmpz-label">{zone.label}</div>
                                                    <div className="tmpz-coords">
                                                        LAT: {zone.lat.toFixed(5)} · LNG: {zone.lng.toFixed(5)} · R: {zone.radius}m
                                                    </div>
                                                    <div className="tmpz-time">Added: {new Date(zone.createdAt).toLocaleString('en-IN')}</div>
                                                </div>
                                                <button className="tmpz-delete-btn" onClick={() => handleDeleteTempBlocked(zone.id)} title="Remove Zone">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default PoliceDashboard;
