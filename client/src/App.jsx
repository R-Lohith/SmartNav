import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import DestinationInput from "./components/DestinationInput";
import MapView from "./components/MapView";
import EmergencyPage from "./components/EmergencyPage";
import ProfilePage from "./components/ProfilePage";
import Register from "./components/Register";
import LoginPage from "./components/Login";
import PoliceDashboard from "./components/PoliceDashboard";
import PoliceMapView from "./components/PoliceMapView";
import PoliceLocationHistory from "./components/PoliceLocationHistory";
import Home from "./components/Home";
import PoliceMonitoring from "./components/PoliceMonitoring";
import RestrictedLogs from "./components/RestrictedLogs";
import "./styles/App.css";

function App() {
  const [route, setRoute] = useState(null); // Stores generated route
  const [connectionLost, setConnectionLost] = useState(false); // Connection lost state
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      return null;
    }
  }); // Logged-in user
  const [selectedUser, setSelectedUser] = useState(null); // Selected by police

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser && !user) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
  }, [user]);

  return (
    <Router>
      <Routes>
        {/* Default route → Home */}
        <Route path="/" element={<Home />} />

        {/* Login */}
        <Route
          path="/login"
          element={
            <LoginPage
              onLogin={(userData) => {
                setUser(userData);
                localStorage.setItem("user", JSON.stringify(userData));
              }}
            />
          }
        />

        {/* Register */}
        <Route
          path="/register"
          element={
            <Register
              onRegister={(userData) => {
                setUser(userData);
                localStorage.setItem("user", JSON.stringify(userData));
              }}
              onNavigateToLogin={() => (window.location.href = "/login")}
            />
          }
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={
            user ? (
              <ProfilePage
                user={user}
                onLogout={() => {
                  setUser(null);
                  localStorage.removeItem("user");
                }}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ✅ Police Dashboard main */}
        <Route
          path="/police"
          element={
            user?.role === "police" ? (
              <PoliceDashboard onSelectUser={setSelectedUser} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ✅ Police dashboard sub-routes */}
        <Route
          path="/police/map"
          element={
            user?.role === "police" ? (
              <PoliceMapView selectedUser={selectedUser} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/police/history"
          element={
            user?.role === "police" ? (
              <PoliceLocationHistory selectedUser={selectedUser} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ✅ Police CIA Monitoring Dashboard */}
        <Route
          path="/police/monitoring"
          element={
            user?.role === "police" ? (
              <PoliceMonitoring />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ✅ Police Restricted Logs */}
        <Route
          path="/police/restricted-logs"
          element={
            user?.role === "police" ? (
              <RestrictedLogs />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Destination Input */}
        <Route
          path="/destination"
          element={
            user ? (
              <DestinationInput
                onRouteGenerated={(newRoute) => setRoute(newRoute)}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* MapView */}
        <Route
          path="/map"
          element={
            user ? (
              <MapViewWrapper
                route={route}
                userId={user?.userId || selectedUser?.userId}
                setConnectionLost={setConnectionLost}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Emergency Page */}
        <Route
          path="/emergency"
          element={
            user ? (
              <EmergencyPageWrapper
                route={route}
                setConnectionLost={setConnectionLost}
              />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

// Wrapper for MapView
const MapViewWrapper = ({ route, userId, setConnectionLost }) => {
  const navigate = useNavigate();

  const handleSimulateConnectionLoss = () => {
    setConnectionLost(true);
    navigate("/emergency");
  };

  return (
    <MapView
      route={route}
      userId={userId}
      onSimulateConnectionLoss={handleSimulateConnectionLoss}
    />
  );
};

// Wrapper for EmergencyPage
const EmergencyPageWrapper = ({ route, setConnectionLost }) => {
  const navigate = useNavigate();

  const handleFalseAlarm = () => {
    setConnectionLost(false);
    navigate("/map");
  };

  return <EmergencyPage route={route} onFalseAlarm={handleFalseAlarm} />;
};

export default App;
