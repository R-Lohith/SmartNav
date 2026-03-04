import React from "react";
import { Shield, ArrowLeft, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/RestrictedLogs.css";

const RestrictedLogs = () => {
    const navigate = useNavigate();

    // Fake data as requested
    const fakeLogs = [
        { id: "RL-101", name: "Ramesh K", contact: "9876543210", lat: 13.0827, lng: 80.2707, entry: "2023-10-25 08:30", exit: "2023-10-25 09:45", status: "Exited", missingMatch: false },
        { id: "RL-102", name: "Murugan K", contact: "9123456789", lat: 13.0827, lng: 80.2707, entry: "2023-10-25 10:15", exit: "--", status: "Not Exited", missingMatch: true },
        { id: "RL-103", name: "Suresh P", contact: "8765432109", lat: 11.0168, lng: 76.9558, entry: "2023-10-25 11:00", exit: "2023-10-25 11:20", status: "Exited", missingMatch: false },
        { id: "RL-104", name: "Anbu M", contact: "9988776655", lat: 11.6643, lng: 78.1460, entry: "2023-10-25 14:05", exit: "--", status: "Not Exited", missingMatch: true },
        { id: "RL-105", name: "Vikram S", contact: "8877665544", lat: 9.9252, lng: 78.1198, entry: "2023-10-25 16:30", exit: "2023-10-25 18:00", status: "Exited", missingMatch: false },
    ];

    return (
        <div className="restricted-logs-page technical-grid">
            <header className="logs-header">
                <button className="back-btn" onClick={() => navigate('/police')}>
                    <ArrowLeft size={20} /> Back to Dashboard
                </button>
                <div className="header-title">
                    <TriangleAlert size={28} className="alert-icon" />
                    <h1>Restricted Area Logs</h1>
                </div>
            </header>

            <div className="logs-content glass-panel">
                <div className="table-wrapper">
                    <table className="data-table logs-table">
                        <thead>
                            <tr>
                                <th>Log ID</th>
                                <th>Name</th>
                                <th>Contact</th>
                                <th>Latitude</th>
                                <th>Longitude</th>
                                <th>Entry Time</th>
                                <th>Exit Time</th>
                                <th>Status</th>
                                <th>Alert</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fakeLogs.map(log => (
                                <tr key={log.id} className={log.missingMatch ? "row-danger" : ""}>
                                    <td>{log.id}</td>
                                    <td>{log.name}</td>
                                    <td>{log.contact}</td>
                                    <td>{log.lat}</td>
                                    <td>{log.lng}</td>
                                    <td>{log.entry}</td>
                                    <td>{log.exit}</td>
                                    <td>
                                        <span className={`status-badge ${log.status === 'Exited' ? 'exited' : 'not-exited'}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td>
                                        {log.missingMatch ? (
                                            <span className="blinking-alert">⚠️ MATCHING!</span>
                                        ) : (
                                            <span className="safe-alert">✅ NOT MATCHING</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RestrictedLogs;
