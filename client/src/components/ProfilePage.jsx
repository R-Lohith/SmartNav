import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Heart, MapPin, Calendar, LogOut, ArrowLeft, Shield } from "lucide-react";
import "../styles/ProfilePage.css";

const ProfilePage = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
            setUserData(storedUser);
        } else {
            navigate("/login");
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("user");
        navigate("/login");
    };

    if (!userData) {
        return (
            <div className="profile-loading technical-grid">
                <Shield className="spinner" size={48} />
                <span>Decrypting Profile Data...</span>
            </div>
        );
    }

    return (
        <div className="profile-container technical-grid">
            <header className="profile-nav glass-panel">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} />
                    <span>Return</span>
                </button>
                <h1>Profile Page</h1>
                <button className="logout-action-btn" onClick={handleLogout}>
                    <LogOut size={18} />
                    <span>Sign Out</span>
                </button>
            </header>

            <main className="profile-main">
                <div className="profile-card-wrapper glass-panel">
                    <div className="profile-hero">
                        <div className="avatar-large">
                            <User size={64} />
                        </div>
                        <div className="hero-text">
                            <h2>{userData.name}</h2>
                            <p className="email-meta"><Mail size={14} /> {userData.email}</p>
                        </div>
                    </div>

                    <div className="details-grid">
                        <div className="detail-card">
                            <label><Phone size={14} /> Contact Details</label>
                            <div className="data-points">
                                <div className="point">
                                    <span>Primary Mobile</span>
                                    <p>{userData.mobile}</p>
                                </div>
                                <div className="point">
                                    <span>Emergency Liaison</span>
                                    <p className="danger-text">{userData.emergencyContact}</p>
                                </div>
                            </div>
                        </div>

                        <div className="detail-card">
                            <label><User size={14} /> Personnel Specs</label>
                            <div className="data-points">
                                <div className="point">
                                    <span>Gender Identity</span>
                                    <p>{userData.gender}</p>
                                </div>
                                <div className="point">
                                    <span>Blood Type</span>
                                    <p>{userData.bloodGroup}</p>
                                </div>
                            </div>
                        </div>

                        <div className="detail-card full-span">
                            <label><MapPin size={14} /> Registered Residence</label>
                            <div className="data-points">
                                <p className="address-text">{userData.address}</p>
                            </div>
                        </div>

                        <div className="detail-card">
                            <label><Calendar size={14} /> Vital Chronology</label>
                            <div className="data-points">
                                <div className="point">
                                    <span>Date of Birth</span>
                                    <p>{userData.dateOfBirth}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;
