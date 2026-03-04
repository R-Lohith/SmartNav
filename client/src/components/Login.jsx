import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Mail, ArrowRight, Shield, Map as MapIcon, Loader2 } from "lucide-react";
import { signInWithGoogle } from "../config/firebase";
import "../styles/Login.css";

const Login = ({ onLogin }) => {
    const [loginData, setLoginData] = useState({
        emailOrPhone: "",
        password: "",
    });
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleChange = (e) => {
        setLoginData({ ...loginData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const email = loginData.emailOrPhone.includes("@")
                ? loginData.emailOrPhone
                : "";

            const response = await fetch("http://localhost:5000/api/user/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email,
                    password: loginData.password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Login failed");
            } else {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                const userData = {
                    userId: data.user.userId,
                    name: data.user.name,
                    email: data.user.email,
                    mobile: data.user.mobile,
                    bloodGroup: data.user.bloodGroup,
                    emergencyContact: data.user.emergencyContact,
                    gender: data.user.gender,
                    address: data.user.address,
                    dateOfBirth: data.user.dateOfBirth,
                    role: data.user.role,
                };

                if (onLogin) onLogin(userData);

                if (data.user.role === "police") {
                    navigate("/police");
                } else {
                    navigate("/destination");
                }
            }
        } catch (error) {
            console.error("Error logging in:", error);
            alert("Server error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const user = await signInWithGoogle();
            console.log("Logged in with Google:", user);

            // For now, we trust the Firebase user and create a profile
            const userData = {
                userId: user.uid,
                name: user.displayName,
                email: user.email,
                mobile: user.phoneNumber || "",
                role: "user" // Default role
            };

            localStorage.setItem("user", JSON.stringify(userData));
            if (onLogin) onLogin(userData);
            navigate("/destination");
        } catch (error) {
            console.error("Google login failed:", error);
            if (error.code === 'auth/popup-blocked') {
                alert("Sign-in popup was blocked. Please enable popups for this site.");
            } else if (error.code === 'auth/operation-not-allowed') {
                alert("Google Sign-In is not enabled in your Firebase Console. Please enable it.");
            } else {
                alert(`Google login failed: ${error.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = (e) => {
        e.preventDefault();
        alert(`Password reset instructions sent to ${resetEmail}`);
        setShowForgotPassword(false);
        setResetEmail("");
    };

    return (
        <div className="login-container technical-grid">
            <div className="login-visual-side">
                <div className="visual-content">
                    <div className="logo-section">
                        <div className="logo-icon-wrapper">
                            <MapIcon className="logo-icon" />
                        </div>
                        <h1>SmartNav AI</h1>
                    </div>
                    <p className="visual-tagline">Advanced Geospatial Safety & Navigation Intelligence</p>
                </div>
            </div>

            <div className="login-form-side">
                <div className="login-form-wrapper glass-panel">
                    {!showForgotPassword ? (
                        <>
                            <div className="login-header">
                                <h2>Welcome Back</h2>
                                <p>Authenticate to access the intelligence platform</p>
                            </div>

                            <form onSubmit={handleSubmit} className="actual-form">
                                <div className="form-group">
                                    <label>Identity</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={18} />
                                        <input
                                            type="text"
                                            name="emailOrPhone"
                                            placeholder="Email or phone number"
                                            value={loginData.emailOrPhone}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <div className="label-row">
                                        <label>Secret</label>
                                        <span
                                            className="forgot-password-link"
                                            onClick={() => setShowForgotPassword(true)}
                                        >
                                            Forgot?
                                        </span>
                                    </div>
                                    <div className="input-wrapper">
                                        <Lock className="input-icon" size={18} />
                                        <input
                                            type="password"
                                            name="password"
                                            placeholder="••••••••"
                                            value={loginData.password}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="login-btn" disabled={isLoading}>
                                    {isLoading ? (
                                        <Loader2 className="spinner" size={20} />
                                    ) : (
                                        <>
                                            <span>Sign In</span>
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="divider">
                                <span>or continue with</span>
                            </div>

                            <button type="button" className="google-login-btn" onClick={handleGoogleLogin} disabled={isLoading}>
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                                <span>Sign in with Google</span>
                            </button>

                            <p className="register-text">
                                New to the platform?{" "}
                                <button
                                    className="text-link"
                                    onClick={() => navigate("/register")}
                                >
                                    Create account
                                </button>
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="login-header">
                                <h2>Reset Access</h2>
                                <p>System credentials recovery</p>
                            </div>

                            <form onSubmit={handleForgotPassword} className="actual-form">
                                <div className="form-group">
                                    <label>Registered Email</label>
                                    <div className="input-wrapper">
                                        <Mail className="input-icon" size={18} />
                                        <input
                                            type="email"
                                            placeholder="name@example.com"
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="login-btn">
                                    Send Recovery Email
                                </button>
                            </form>

                            <button
                                className="back-btn"
                                onClick={() => setShowForgotPassword(false)}
                            >
                                Back to login
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
