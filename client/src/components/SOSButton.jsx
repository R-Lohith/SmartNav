import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/SOSButton.css';

const SOSButton = () => {
    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);
    const [isAlerting, setIsAlerting] = useState(false);
    const [altMsg, setAltMsg] = useState(false);
    const [coords, setCoords] = useState(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const ADMIN_EMAIL = "lohith.ec23@bitsathy.ac.in";

    // Normalise emergency contact to international format (+91XXXXXXXXXX)
    const normalisePhone = (num) => {
        if (!num) return null;
        const digits = num.replace(/\D/g, '');
        if (digits.length === 10) return `+91${digits}`;
        if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
        if (digits.startsWith('0') && digits.length === 11) return `+91${digits.slice(1)}`;
        return `+${digits}`;
    };

    const EMERGENCY_PHONE = normalisePhone(user.emergency_contact);

    // Alternating alert message
    useEffect(() => {
        let interval;
        if (showConfirm) {
            interval = setInterval(() => setAltMsg(prev => !prev), 1000);
        }
        return () => clearInterval(interval);
    }, [showConfirm]);

    // Live location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.warn('Geolocation error:', err.message)
            );
        }
    }, []);

    const triggerSOSAlert = async () => {
        setIsAlerting(true);
        const mapsLink = coords
            ? `https://maps.google.com/?q=${coords.lat},${coords.lng}`
            : 'Location not available';

        const routeInfo = JSON.parse(localStorage.getItem('currentRoute') || '{}');

        try {
            const response = await fetch('http://localhost:5000/api/sos/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.userId,
                    name: user.name || 'User',
                    email: user.email,
                    phone: EMERGENCY_PHONE,
                    status: 'SOS_ACTIVATED',
                    locationLink: mapsLink,
                    fromLoc: routeInfo.fromLocation || 'Unknown Origin',
                    toLoc: routeInfo.toLocation || 'Unknown Destination',
                    timestamp: new Date().toISOString()
                })
            });

            const data = await response.json();
            setShowConfirm(false);
            setIsAlerting(false);

            // Show result
            if (data.success) {
                const sentTo = [];
                if (data.results?.email) sentTo.push(`📧 Email: ${data.results.email}`);
                if (data.results?.sms) sentTo.push(`📱 SMS: ${data.results.sms}`);
                const warnings = data.warnings?.length ? `\n\n⚠️ Warnings:\n${data.warnings.join('\n')}` : '';
                alert(`✅ Emergency Alert Sent!\n\n${sentTo.join('\n') || 'Notifications dispatched.'}${warnings}\n\nStay safe. Help is on the way.`);
            } else {
                alert('⚠️ Alert sent but some notifications may have failed. Please call emergency services if needed.');
            }

            navigate('/emergency');
        } catch (e) {
            console.error('Emergency notification failed:', e);
            alert('❌ Failed to send alert. Please call emergency services directly.');
            setIsAlerting(false);
        }
    };

    return (
        <>
            <button className="sos-floating-trigger" onClick={() => setShowConfirm(true)} title="EMERGENCY SOS">
                <span className="sos-emoji">🚨</span>
                <span className="sos-label">SOS</span>
            </button>

            {showConfirm && (
                <div className="sos-overlay-backdrop active-siren">
                    <div className="sos-modal-display animate-pop-in">
                        <div className="emergency-alert-msg">
                            <h2>{altMsg ? '⚠️ EMERGENCY ALERT' : '🆘 SOS SIGNAL'}</h2>
                        </div>

                        <div className="modal-header">
                            <div className="warning-icon-wrapper pulse">
                                <AlertCircle size={48} className="danger-text" />
                            </div>
                            <h3>Confirm Emergency Alert</h3>
                        </div>

                        <div className="modal-body">
                            <p className="sos-warning-text">
                                This will instantly send your <strong>LIVE LOCATION</strong> to emergency contacts via <strong>SMS</strong>.
                            </p>

                            <div className="contact-info-list">
                                {EMERGENCY_PHONE && (
                                    <div className="contact-info-item">
                                        <span className="label">📱 SMS TO:</span>
                                        <span className="value">{EMERGENCY_PHONE}</span>
                                    </div>
                                )}
                                <div className="contact-info-item">
                                    <span className="label">📍 LOCATION:</span>
                                    <span className="value" style={{ fontSize: '11px' }}>
                                        {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Fetching...'}
                                    </span>
                                </div>
                            </div>

                            <p className="confirm-question">Do you want to continue?</p>

                            <div className="modal-actions horizontal">
                                <button onClick={() => setShowConfirm(false)} className="abort-btn-alt" disabled={isAlerting}>
                                    Cancel
                                </button>
                                <button onClick={triggerSOSAlert} className="send-sos-btn" disabled={isAlerting}>
                                    {isAlerting ? '⏳ Sending...' : '🚨 SEND SOS'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SOSButton;