import React, { useState, useEffect } from 'react';
import { AlertCircle, ShieldOff, PhoneForwarded, Shield, Clock, MapPin, Activity } from 'lucide-react';
import SOSButton from './SOSButton';
import { useNavigate } from 'react-router-dom';
import '../styles/EmergencyPage.css';

const EmergencyPage = ({ route }) => {
    const [timer, setTimer] = useState(15 * 60);
    const [familyNotified, setFamilyNotified] = useState(false);
    const [pageOpenedAt] = useState(new Date());

    const navigate = useNavigate();

    useEffect(() => {
        if (!familyNotified && timer > 0) {
            const interval = setInterval(() => {
                setTimer((prevTimer) => {
                    if (prevTimer <= 1) {
                        setFamilyNotified(true);
                        return 0;
                    }
                    return prevTimer - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [familyNotified, timer]);

    const formatClockTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatCountdown = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFalseAlarm = () => {
        if (window.confirm('CONRFIRM: DEACTIVATE EMERGENCY PROTOCOL?')) {
            navigate('/destination');
        }
    };

    const handleNotifyFamily = async () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        try {
            // Original n8n webhook
            fetch("https://n8n-1-szop.onrender.com/webhook/alert_sos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.userId || "123", status: "PERSON_MISSED_AUTO" })
            }).catch(e => console.log("n8n failed"));

            // New server SOS with email lohith.ec23@bitsathy.ac.in
            await fetch("http://localhost:5000/api/sos/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.userId,
                    name: user.name,
                    email: user.email,
                    status: "PERSON_MISSED"
                })
            });

            setFamilyNotified(true);
            setTimer(0);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className={`emergency-protocol-page technical-grid ${familyNotified ? "level-critical" : "level-warning"}`}>
            <header className="protocol-header glass-panel">
                <div className="protocol-title">
                    <AlertCircle className="pulse-danger" size={24} />
                    <div className="title-text">
                        <h1>EMERGENCY ALERT</h1>
                        <span>CONNECTION LOST // STATUS: {familyNotified ? "CRITICAL" : "ELEVATED"}</span>
                    </div>
                </div>
                <SOSButton />
            </header>

            <main className="protocol-main">
                <section className="protocol-grid">
                    <div className="status-panel glass-panel">
                        <div className="panel-label"><Activity size={14} /> Automatic Alert Sequence</div>
                        <div className="countdown-timer">
                            <span className="label">ESTIMATED TIMER</span>
                            <div className="time-val">{formatCountdown(timer)}</div>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${(timer / (15 * 60)) * 100}%` }}></div>
                        </div>
                        <p className="panel-note">Emergency contacts will be automatically mobilized upon counter-zero.</p>
                    </div>

                    <div className="intel-panel glass-panel">
                        <div className="panel-label"><MapPin size={14} /> Location Intelligence</div>
                        <div className="intel-data">
                            <div className="data-item">
                                <label>ORIGIN</label>
                                <span>{route?.fromLocation || 'LAST KNOWN COORDINATES'}</span>
                            </div>
                            <div className="data-item">
                                <label>DESTINATION</label>
                                <span>{route?.toLocation || 'TARGET DESTINATION'}</span>
                            </div>
                            <div className="data-item">
                                <label>LOSS TIMESTAMP</label>
                                <span>{formatClockTime(pageOpenedAt)}</span>
                            </div>
                        </div>
                    </div>

                    {familyNotified && (
                        <div className="notification-alert glass-panel success-fade">
                            <div className="alert-content">
                                <PhoneForwarded size={32} className="success-text" />
                                <div className="text">
                                    <h3>Contacts Mobilized</h3>
                                    <p>Emergency response personnel and designated family members have received your live telemetry.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="action-panel">
                        <button onClick={handleFalseAlarm} className="abort-protocol-btn">
                            <ShieldOff size={20} />
                            <span>DEACTIVATE PROTOCOL</span>
                        </button>

                        <button
                            onClick={handleNotifyFamily}
                            disabled={familyNotified}
                            className={`mobilize-btn ${familyNotified ? 'active' : ''}`}
                        >
                            <Shield size={20} />
                            <span>{familyNotified ? 'RESPONSE TEAM DISPATCHED' : 'IMMEDIATE MOBILIZATION'}</span>
                        </button>
                    </div>
                </section>

                <footer className="protocol-footer">
                    <Clock size={12} />
                    <span>SECURE LINK // {formatClockTime(new Date())}</span>
                </footer>
            </main>
        </div>
    );
};

export default EmergencyPage;
