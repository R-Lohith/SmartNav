import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserCircle, Shield, MapPin, History, Activity, Terminal, ExternalLink, RadioTower, FileText, AlertTriangle, LogOut } from "lucide-react";
import "../styles/PoliceDashboard.css";

const PoliceDashboard = ({ onSelectUser }) => {
    const [query, setQuery] = useState("");
    const [user, setUser] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState("search");
    const [restrictedData, setRestrictedData] = useState({ lat: "", lng: "" });
    const navigate = useNavigate();
    
    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/login");
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
                </div>
            </main>
        </div>
    );
};

export default PoliceDashboard;
