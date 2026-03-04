import React, { useState } from 'react';
import { MapPin, Navigation, Car, Bus, Train, Users, Bike, UserCircle, Shield, Search, ArrowRight, Loader2 } from 'lucide-react';
import SOSButton from './SOSButton';
import { useNavigate } from 'react-router-dom';
import '../styles/DestinationInput.css';

const DestinationInput = ({ onRouteGenerated }) => {
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [transportMode, setTransportMode] = useState('car');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState({ from: [], to: [] });
    const [isSafetyMap, setIsSafetyMap] = useState(false);
    const [routeInfo, setRouteInfo] = useState(null);

    const navigate = useNavigate();

    const transportModes = [
        { mode: 'car', icon: Car, label: 'Car', color: 'transport-car' },
        { mode: 'bus', icon: Bus, label: 'Bus', color: 'transport-bus' },
        { mode: 'train', icon: Train, label: 'Train', color: 'transport-train' },
        { mode: 'walk', icon: Users, label: 'Walk', color: 'transport-walk' },
        { mode: 'bike', icon: Bike, label: 'Bike', color: 'transport-bike' },
    ];

    const tamilNaduCities = [
        "Alandur", "Alangudi", "Alangulam", "Ambasamudram", "Ambattur", "Ambur", "Anaikattu", "Andipatti", "Anna Nagar", "Anthiyur", "Arakkonam (SC)", "Arani", "Aranthangi", "Aravakurichi", "Arcot", "Ariyalur", "Aruppukkottai", "Athoor", "Attur(SC)", "Avadi", "Avanashi (SC)", "Bargur", "Bhavani", "Bhavanisagar", "Bhuvanagiri", "Bodinayakanur", "CHENNAI", "COIMBATORE", "CUDDALORE", "Chengalpattu", "Chengam (SC)", "Chepauk-Thiruvalliken", "Cheyyar", "Cheyyur (SC)", "Chidambaram", "Coimbatore(North)", "Coimbatore(South)", "Colachel", "Coonoor", "Cuddalore", "Cumbum", "DHARMAPURI", "DINDIGUL", "Dharapuram (SC)", "Dharmapuri", "Dindigul", "Dr.Radhakrishnan Nagar", "ERODE", "Edappadi", "Egmore (SC)", "Erode (East)", "Erode (West)", "Gandharvakottai(SC)", "Gangavalli (SC)", "Gobichettipalayam", "Gudalur (SC)", "Gudiyattam (SC)", "Gummidipoondi", "Harbour", "Harur (SC)", "Hosur", "Jayankondam", "Jolarpet", "KANCHEEPURAM", "KANNIYAKUMARI", "KARUR", "KRISHNAGIRI", "Kadayanallur", "Kalasapakkam", "Kallakurichi (SC)", "Kancheepuram", "Kangayam", "Kanniyakumari", "Karaikudi", "Karur", "Katpadi", "Kattumannarkoil(SC)", "Kavundampalayam", "Killiyoor", "Kilpennathur", "Kilvaithinankuppam(SC)", "Kilvelur (SC)", "Kinathukadavu", "Kolathur", "Kovilpatti", "Krishnagiri", "Krishnarayapuram(SC)", "Kulithalai", "Kumarapalayam", "Kumbakonam", "Kunnam", "Kurinjipadi", "Lalgudi", "MADURAI", "Madathukulam", "Madavaram", "Madurai Central", "Madurai East", "Madurai North", "Madurai South", "Madurai West", "Madurantakam (SC)", "Maduravoyal", "Mailam", "Manachanallur", "Manamadurai(SC)", "Manapparai", "Mannargudi", "Mayiladuthurai", "Melur", "Mettuppalayam", "Mettur", "Modakkurichi", "Mudhukulathur", "Musiri", "Mylapore", "NAGAPATTINAM", "NAMAKKAL", "Nagapattinam", "Nagercoil", "Namakkal", "Nanguneri", "Nannilam", "Natham", "Neyveli", "Nilakkottai (SC)", "Oddanchatram", "Omalur", "Orathanadu", "Ottapidaram(SC)", "PERAMBALUR", "PUDUKKOTTAI", "Padmanabhapuram", "Palacodu", "Palani", "Palayamkottai", "Palladam", "Pallavaram", "Panruti", "Papanasam", "Pappireddippatti", "Paramakudi (SC)", "Paramathi-Velur", "Pattukkottai", "Pennagaram", "Perambalur (SC)", "Perambur", "Peravurani", "Periyakulam", "Perundurai", "Pollachi", "Polur", "Ponneri (SC)", "Poompuhar", "Poonamallee (SC)", "Pudukkottai", "RAMANATHAPURAM", "Radhapuram", "Rajapalayam", "Ramanathapuram", "Ranipet", "Rasipuram (SC)", "Rishivandiyam", "Royapuram", "SALEM", "SIVAGANGA", "Saidapet", "Salem (North)", "Salem (South)", "Salem (West)", "Sankarankovil(SC)", "Sankarapuram", "Sankari", "Sattur", "Senthamangalam(ST)", "Sholavandan(SC)", "Sholingur", "Shozhinganallur", "Singanallur", "Sirkazhi (SC)", "Sivaganga", "Sivakasi", "Sriperumbudur (SC)", "Srirangam", "Srivaikuntam", "Srivilliputhur(SC)", "Sulur", "THANJAVUR", "THE NILGIRIS", "THENI", "THIRUVALLUR", "THIRUVARUR", "THOOTHUKKUDI", "TIRUCHIRAPPALLI", "TIRUNELVELI", "TIRUVANNAMALAI", "Tambaram", "Tenkasi", "Thalli", "Thanjavur", "Thiru-Vi-Ka-Nagar(SC)", "Thirumangalam", "Thirumayam", "Thiruparankundram", "Thiruporur", "Thiruthuraipoondi(SC)", "Thiruvaiyaru", "Thiruvallur", "Thiruvarur", "Thiruverumbur", "Thiruvidaimarudur", "Thiyagarayanagar", "Thondamuthur", "Thoothukkudi", "Thousand Lights", "Thuraiyur (SC)", "Tindivanam (SC)", "Tiruchendur", "Tiruchengodu", "Tiruchirappalli", "Tiruchuli", "Tirukkoyilur", "Tirunelveli", "Tiruppattur", "Tiruppur (North)", "Tiruppur (South)", "Tiruttani", "Tiruvadanai", "Tiruvannamalai", "Tiruvottiyur", "Tittakudi (SC)", "Udhagamandalam", "Udumalaipettai", "Ulundurpettai", "Usilampatti", "Uthangarai (SC)", "Uthiramerur", "VELLORE", "VILUPPURAM", "VIRUDHUNAGAR", "Valparai (SC)", "Vandavasi (SC)", "Vaniyambadi", "Vanur (SC)", "Vasudevanallur(SC)", "Vedaranyam", "Vedasandur", "Veerapandi", "Velachery", "Vellore", "Veppanahalli", "Vikravandi", "Vilathikulam", "Vilavancode", "Villivakkam", "Viluppuram", "Viralimalai", "Virudhunagar", "Virugampakkam", "Vriddhachalam", "Yercaud (ST)"
    ];

    const handleInputChange = (field, value) => {
        if (field === 'from') setFromLocation(value);
        else setToLocation(value);

        if (value.length > 1) {
            const filtered = tamilNaduCities.filter(city =>
                city.toLowerCase().includes(value.toLowerCase())
            );
            setSuggestions(prev => ({ ...prev, [field]: filtered }));
        } else {
            setSuggestions(prev => ({ ...prev, [field]: [] }));
        }
    };

    const selectSuggestion = (field, city) => {
        if (field === 'from') setFromLocation(city);
        else setToLocation(city);
        setSuggestions(prev => ({ ...prev, [field]: [] }));
    };

    const handleGenerateRoute = async () => {
        if (!fromLocation.trim() || !toLocation.trim()) {
            alert('Please enter both from and to locations');
            return;
        }
        if (fromLocation.toLowerCase() === toLocation.toLowerCase()) {
            alert('From and To locations cannot be the same');
            return;
        }

        setIsLoading(true);
        try {
            let routeData;
            if (isSafetyMap) {
                // Generate the state-wide choropleth map as well with focus on the route
                await fetch(`http://localhost:5001/generate_choropleth?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}`);

                const url = `http://localhost:5001/generate_and_save_route?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}&mode=${transportMode}`;
                const response = await fetch(url);
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || `Failed to generate safety map: ${response.status}`);
                }
                const data = await response.json();
                routeData = { ...data, isSafetyMap: true, fromLocation, toLocation, transportMode };
            } else {
                const url = `http://localhost:5001/generate_route?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}&mode=${transportMode}`;
                const response = await fetch(url);
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || `Failed to generate route: ${response.status}`);
                }
                const data = await response.json();
                routeData = { ...data, isSafetyMap: false, fromLocation, toLocation, transportMode };
            }
            setRouteInfo(routeData);
            onRouteGenerated(routeData);
            localStorage.setItem('currentRoute', JSON.stringify(routeData));

            // Adding a small delay to let user see "downwards" info if they want, 
            // or just navigate immediately if that's preferred. 
            // The user said "when click of get route... as down words", 
            // so I'll show it and then provide a follow-up action or auto-navigate after 1.5s
            setTimeout(() => {
                navigate('/map', { state: { routeData } });
            }, 1000);
        } catch (error) {
            console.error('Route generation error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="dest-input-page technical-grid">
            <div className="top-nav">
                <div className="brand">
                    <Navigation className="brand-logo" />
                    <span>SmartNav AI</span>
                </div>
                <div className="nav-actions">
                    <button className="nav-profile-btn" onClick={() => navigate('/profile')}>
                        <UserCircle size={24} />
                    </button>
                    <SOSButton />
                </div>
            </div>

            <main className="dest-main">
                <div className="input-panel glass-panel">
                    <div className="panel-header">
                        <h2>Plan Your Route</h2>
                        <p>Enter your destination and transport mode</p>
                    </div>

                    <div className="route-inputs">
                        <div className="input-group">
                            <label>Origin</label>
                            <div className="input-wrapper">
                                <Search className="input-icon" size={18} />
                                <input
                                    type="text"
                                    value={fromLocation}
                                    onChange={(e) => handleInputChange('from', e.target.value)}
                                    placeholder="Select departure point"
                                />
                                {suggestions.from.length > 0 && (
                                    <div className="suggestions-list">
                                        {suggestions.from.map(city => (
                                            <div key={city} className="suggestion-item" onClick={() => selectSuggestion('from', city)}>
                                                <MapPin size={14} /> {city}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Destination</label>
                            <div className="input-wrapper">
                                <MapPin className="input-icon" size={18} />
                                <input
                                    type="text"
                                    value={toLocation}
                                    onChange={(e) => handleInputChange('to', e.target.value)}
                                    placeholder="Search for destination"
                                />
                                {suggestions.to.length > 0 && (
                                    <div className="suggestions-list">
                                        {suggestions.to.map(city => (
                                            <div key={city} className="suggestion-item" onClick={() => selectSuggestion('to', city)}>
                                                <MapPin size={14} /> {city}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="transport-section">
                        <h3>Transport Mode</h3>
                        <div className="transport-options">
                            {transportModes.map(({ mode, icon: Icon, label }) => (
                                <button
                                    key={mode}
                                    onClick={() => setTransportMode(mode)}
                                    className={`mode-btn ${transportMode === mode ? 'selected' : ''}`}
                                >
                                    <Icon size={20} />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="options-section">
                        <label className="safety-toggle">
                            <div className="toggle-info">
                                <Shield size={16} />
                                <span>Show Safety Zones</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={isSafetyMap}
                                onChange={(e) => setIsSafetyMap(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    <button
                        onClick={handleGenerateRoute}
                        disabled={isLoading}
                        className="execute-btn"
                    >
                        {isLoading ? (
                            <><Loader2 className="spinner" size={20} /> Generating Route...</>
                        ) : (
                            <>Get Route <ArrowRight size={20} /></>
                        )}
                    </button>

                    {routeInfo && (
                        <div className="route-summary-downwards glass-panel">
                            <div className="summary-item">
                                <Navigation size={18} />
                                <div className="summary-text">
                                    <label>Distance</label>
                                    <p>{routeInfo.distance?.toFixed(2) || '0.00'} km</p>
                                </div>
                            </div>
                            <div className="summary-item">
                                <Loader2 size={18} />
                                <div className="summary-text">
                                    <label>Estimated Time</label>
                                    <p>{routeInfo.duration || '0'} min</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="dest-footer">
                <span className="system-status">System Cluster: Active</span>
            </footer>
        </div>
    );
};

export default DestinationInput;