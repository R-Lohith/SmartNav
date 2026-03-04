// components/Header.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle } from "lucide-react";
import "../styles/Header.css";

const Header = ({ title }) => {
    const navigate = useNavigate();

    return (
        <div className="app-header">
            <h2 className="header-title">{title}</h2>
            <button
                className="profile-button"
                onClick={() => navigate("/profile")}
            >
                <UserCircle size={28} />
            </button>
        </div>
    );
};

export default Header;
