import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Calendar, Activity, Lock, ArrowLeft, Shield, Map as MapIcon, CheckCircle, Loader } from 'lucide-react';
import { auth, signInWithGoogle } from "../config/firebase";
import '../styles/Register.css';

const Register = ({ onRegister }) => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        emergency_contact: '',
        gender: '',
        bloodGroup: '',
        dob: '',
        address: '',
        password: '',
        confirmPassword: ''
    });

    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (formData.password !== formData.confirmPassword) {
            alert('Passwords do not match!');
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/user/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (response.ok) {
                alert('✅ Registration successful! You can now log in.');
                navigate('/login');
            } else {
                alert(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error(error);
            alert('Server error, try again later');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleRegister = async () => {
        setIsLoading(true);
        try {
            const user = await signInWithGoogle();
            const userData = {
                userId: user.uid,
                name: user.displayName,
                email: user.email,
                mobile: user.phoneNumber || "",
                role: "user"
            };
            localStorage.setItem("user", JSON.stringify(userData));
            if (onRegister) onRegister(userData);
            navigate("/destination");
        } catch (error) {
            console.error("Google registration failed:", error);
            if (error.code === 'auth/popup-blocked') {
                alert("Sign-in popup was blocked. Please enable popups for this site.");
            } else if (error.code === 'auth/operation-not-allowed') {
                alert("Google Sign-In is not enabled in your Firebase Console. Please enable it.");
            } else {
                alert(`Google registration failed: ${error.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-container technical-grid">
            <div className="register-header-bar">
                <button className="back-link" onClick={() => navigate('/login')}>
                    <ArrowLeft size={18} />
                    <span>Return to Login</span>
                </button>
            </div>



            <div className="register-content">
                <div className="register-card glass-panel">
                    <div className="card-header">
                        <div className="brand">
                            <MapIcon className="brand-icon" />
                            <h2>Enroll for the SmartNav</h2>
                        </div>
                        <p>Create your secure profile for intelligent navigation services</p>
                    </div>

                    <form onSubmit={handleSubmit} className="register-grid-form">
                        <div className="form-section">
                            <h3>Core Identity</h3>
                            <div className="grid-row">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input type="text" name="name" placeholder="---" value={formData.name} onChange={handleChange} required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <div className="input-wrapper">
                                        <Mail className="input-icon" size={16} />
                                        <input type="email" name="email" placeholder="---" value={formData.email} onChange={handleChange} required />
                                    </div>
                                </div>
                            </div>

                            <div className="grid-row">
                                {/* ─── Mobile ── */}
                                <div className="form-group">
                                    <label>Mobile Number</label>
                                    <div className="input-wrapper">
                                        <Phone className="input-icon" size={16} />
                                        <input
                                            type="tel"
                                            name="mobile"
                                            placeholder="10-digit mobile"
                                            value={formData.mobile}
                                            onChange={handleChange}
                                            required
                                            maxLength={10}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Emergency Contact</label>
                                    <div className="input-wrapper">
                                        <Shield className="input-icon" size={16} />
                                        <input type="tel" name="emergency_contact" placeholder="Guardian contact" value={formData.emergency_contact} onChange={handleChange} required />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Vitals &amp; Logistics</h3>
                            <div className="grid-row">
                                <div className="form-group">
                                    <label>Date of Birth</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input type="date" name="dob" value={formData.dob} onChange={handleChange} required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Blood Group</label>
                                    <div className="input-wrapper">
                                        <Activity className="input-icon" size={16} />
                                        <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} required>
                                            <option value="">Select Group</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label>Gender</label>
                                <div className="gender-selector">
                                    <label className={formData.gender === 'Male' ? 'active' : ''}>
                                        <input type="radio" name="gender" value="Male" checked={formData.gender === 'Male'} onChange={handleChange} required />
                                        <span>Male</span>
                                    </label>
                                    <label className={formData.gender === 'Female' ? 'active' : ''}>
                                        <input type="radio" name="gender" value="Female" checked={formData.gender === 'Female'} onChange={handleChange} required />
                                        <span>Female</span>
                                    </label>
                                    <label className={formData.gender === 'Other' ? 'active' : ''}>
                                        <input type="radio" name="gender" value="Other" checked={formData.gender === 'Other'} onChange={handleChange} required />
                                        <span>Other</span>
                                    </label>
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label>Residential Address</label>
                                <div className="input-wrapper">
                                    <MapPin className="input-icon" size={16} />
                                    <input type="text" name="address" placeholder="Residential location details" value={formData.address} onChange={handleChange} required />
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Security Credentials</h3>
                            <div className="grid-row">
                                <div className="form-group">
                                    <label>Access Password</label>
                                    <div className="input-wrapper">
                                        <Lock className="input-icon" size={16} />
                                        <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required minLength="6" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Verify Password</label>
                                    <div className="input-wrapper">
                                        <Lock className="input-icon" size={16} />
                                        <input type="password" name="confirmPassword" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="register-submit-btn" disabled={isLoading}>
                            {isLoading ? 'Processing...' : 'Complete Registration'}
                        </button>

                        <div className="divider">
                            <span>or continue with</span>
                        </div>

                        <button type="button" className="google-login-btn" onClick={handleGoogleRegister} disabled={isLoading}>
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                            <span>Sign up with Google</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
