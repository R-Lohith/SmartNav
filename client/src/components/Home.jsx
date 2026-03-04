import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Globe from "react-globe.gl";
import { LogIn, UserPlus, Shield, Globe as GlobeIcon, Zap } from "lucide-react";
import "../styles/Home.css";

const Home = () => {
    const navigate = useNavigate();
    const [dimensions, setDimensions] = useState({
        width: window.innerWidth > 1200 ? 800 : (window.innerWidth - 40),
        height: window.innerWidth > 768 ? 600 : 400
    });
    const globeRef = useRef();

    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth > 1200 ? 800 : (window.innerWidth - 40),
                height: window.innerWidth > 768 ? 600 : 400
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const arcData = [
        { startLat: 1.3521, startLng: 103.8198, endLat: 39.9042, endLng: 116.4074, color: '#357df2' },
        { startLat: 39.9042, startLng: 116.4074, endLat: 37.7739, endLng: -122.4312, color: '#4a90e2' },
        { startLat: 37.7739, startLng: -122.4312, endLat: 40.7306, endLng: -73.9352, color: '#357df2' },
        { startLat: 40.7306, startLng: -73.9352, endLat: 51.5074, endLng: 0.1278, color: '#4a90e2' },
        { startLat: 51.5074, startLng: 0.1278, endLat: 1.3521, endLng: 103.8198, color: '#357df2' },
    ];

    const pointsData = [
        { lat: 1.3521, lng: 103.8198, name: "Singapore", color: "#357df2" },
        { lat: 39.9042, lng: 116.4074, name: "Beijing", color: "#357df2" },
        { lat: 37.7739, lng: -122.4312, name: "San Francisco", color: "#357df2" },
        { lat: 40.7306, lng: -73.9352, name: "New York", color: "#357df2" },
        { lat: 51.5074, lng: 0.1278, name: "London", color: "#357df2" },
    ];

    const ringsData = pointsData.map(p => ({ lat: p.lat, lng: p.lng }));

    useEffect(() => {
        if (globeRef.current) {
            // Set initial position
            globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

            // Enable auto-rotation
            const globeControls = globeRef.current.controls();
            if (globeControls) {
                globeControls.autoRotate = true;
                globeControls.autoRotateSpeed = 0.5;
            }
        }
    }, []);

    // Keep auto-rotate even on dimension changes
    useEffect(() => {
        if (globeRef.current) {
            const controls = globeRef.current.controls();
            if (controls) {
                controls.autoRotate = true;
            }
        }
    }, [dimensions]);

    return (
        <div className="home-container">
            {/* Top Navigation Bar */}
            <nav className="home-nav">
                <button className="nav-btn nav-btn-login" onClick={() => navigate("/login")}>
                    <LogIn size={18} />
                    Login
                </button>
                <button className="nav-btn nav-btn-signup" onClick={() => navigate("/register")}>
                    <UserPlus size={18} />
                    Sign Up
                </button>
            </nav>

            <div className="home-layout">
                {/* START: Header Section */}
                <header className="home-section-top">
                    <h2 className="home-subtitle-large">INTELLIGENT SAFETY FOR ALL</h2>
                    <h1 className="home-title-large">Smart Nav</h1>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                        Empowering tourists with Instant Predictive Mapping and Real-time Security.
                    </p>
                </header>

                {/* CENTER: Earth Animation */}
                <div className="globe-center-div">
                    <div className="globe-wrapper-center">
                        <Globe
                            ref={globeRef}
                            width={dimensions.width}
                            height={dimensions.height}
                            globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
                            bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
                            backgroundColor="rgba(0,0,0,0)"
                            arcsData={arcData}
                            arcColor="color"
                            arcDashLength={0.4}
                            arcDashGap={4}
                            arcDashAnimateTime={2000}
                            pointsData={pointsData}
                            pointColor="color"
                            pointAltitude={0.01}
                            pointRadius={0.6}
                            ringsData={ringsData}
                            ringColor={() => "#357df2"}
                            ringMaxRadius={2.5}
                            ringPropagationSpeed={3}
                            ringRepeatPeriod={800}
                            showAtmosphere={true}
                            atmosphereColor="#357df2"
                            atmosphereDayLightOutSpread={0.5}
                            showGraticules={true}
                        />
                    </div>
                </div>

                {/* END: Context Information */}
                <section className="home-section-bottom">
                    <div className="context-p">
                        Welcome to <strong>Smart Nav</strong>, an intelligent tourist safety and navigation platform designed to make travel safer, smarter, and stress-free. By integrating Predictive Spatial Intelligence and Geo-fencing technologies, Smart Nav provides real-time safety awareness and instant emergency assistance for travelers navigating unfamiliar locations.
                    </div>

                    <div className="context-p">
                        Smart Nav creates a secure digital identity ecosystem for tourists. The platform incorporates geospatial tracking and geo-fencing to detect entry into statically unsafe zones or law-enforcement restricted areas.
                    </div>

                    <div className="context-p">
                        Through interactive Choropleth safety maps and data-driven insights, Smart Nav computes and suggests the safest possible travel routes. In emergency situations, users can trigger 1-click SOS alerts that automatically webhook rapid-response authorities and blast SMS notifications to emergency contacts.
                    </div>

                    <div className="context-p">
                        Smart Nav aims to transform tourism safety by prioritizing proactive protection over simple speed calculation, improving situational awareness, and building confidence among travelers.
                    </div>

                    {/* Features Badges */}
                    <div className="badge-container">
                        <div className="badge-item">
                            <Shield size={20} color="#357df2" />
                            <span>Verified ID</span>
                        </div>
                        <div className="badge-item">
                            <Zap size={20} color="#357df2" />
                            <span>Risk Intelligence</span>
                        </div>
                        <div className="badge-item">
                            <GlobeIcon size={20} color="#357df2" />
                            <span>Global SOS</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Home;
