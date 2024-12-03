import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  BookMarked,
  MessageSquare,
  LogOut,
  User,
  Settings,
  Users,
} from "lucide-react";
import "./sidebar.css";

const TopBarAndSidebar = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState(null); // User role: 'Admin', 'Moderator', 'User'
  const [userData, setUserData] = useState({ username: "", email: "" });
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const fetchUserDetails = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login"); // Redirect to login if no token
        return;
      }

      try {
        // Fetch the logged-in user data based on the role
        const response = await fetch("http://localhost:5000/api/role-details", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user details");
        }

        const data = await response.json();

        // Set user details and role
        setUserData({ username: data.username, email: data.email });
        setRole(data.role); // E.g., 'Admin', 'User', 'Moderator'
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user details:", error);
        localStorage.removeItem("token"); // Clear token if fetch fails
        navigate("/login"); // Redirect to login if error occurs
      }
    };

    fetchUserDetails();
  }, [navigate]);

  const handleProfileClick = () => {
    // Navigate to the correct profile page based on the user's role
    if (role === "Admin") {
      navigate("/admin-profile");
    } else if (role === "Moderator") {
      navigate("/mod-profile");
    } else {
      navigate("/profile"); // General user profile
    }
  };

  const handleLogout = () => {
    // Clear local storage and navigate to login
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  if (loading) {
    return <div>Loading...</div>; // Show a loading screen while fetching data
  }

  return (
    <div>
      {/* Fixed Top Bar */}
      <div className="top-bar">
        <div className="top-bar-content">
          {/* Search Container */}
          <div className="search-container">
            <input
              type="search"
              placeholder="Search..."
              className="search-input"
            />
            <div className="search-icon">
              <svg
                className="icon"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
          {/* Profile Section */}
          <div className="profile-section">
            <div className="profile-info">
              <div className="profile-name">
                {userData.username || "Loading..."}
              </div>
              <div className="profile-email">
                {userData.email || "Loading..."}
              </div>
            </div>
            <div className="profile-dropdown-container">
              <button className="profile-button" onClick={handleProfileClick}>
                <User className="profile-icon" />
              </button>
              {/* Dropdown Menu */}
              <div className="profile-dropdown">
                <a
                  href="#"
                  className="dropdown-item"
                  onClick={handleProfileClick}
                >
                  Your Profile
                </a>
                <div className="dropdown-divider"></div>
                <a
                  href="#"
                  className="dropdown-item-danger"
                  onClick={handleLogout}
                >
                  Sign out
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">SUNWAVE</h1>
        </div>

        <nav className="sidebar-nav">
          {role === "Admin" && (
            <>
              <a
                href="#"
                className="nav-item"
                onClick={() => navigate("/admin-upload-event")}
              >
                <Calendar className="nav-icon" />
                <span>Events</span>
              </a>
              <a
                href="#"
                className="nav-item"
                onClick={() => navigate("/forum")}
              >
                <MessageSquare className="nav-icon" />
                <span>Forum</span>
              </a>
            </>
          )}
          {/* Needs a change */}
          {role === "Moderator" && (
            <>
              <a
                href="#"
                className="nav-item"
                onClick={() => navigate("/forum")}
              >
                <MessageSquare className="nav-icon" />
                <span>Forum</span>
              </a>
              <a
                href="#"
                className="nav-item"
                onClick={() => navigate("/mod-upload-event")}
              >
                <Calendar className="nav-icon" />
                <span>Events</span>
              </a>
              <a
                href="#"
                className="nav-item"
                onClick={() => navigate("/saved")}
              >
                <BookMarked className="nav-icon" />
                <span>Saved</span>
              </a>
            </>
          )}
          {role === "User" && (
            <>
              <a
                href="#"
                className="nav-item"
                onClick={() => navigate("/forum")}
              >
                <MessageSquare className="nav-icon" />
                <span>Forum</span>
              </a>
              <a
                href="#"
                className="nav-item"
                onClick={() => navigate("/events")}
              >
                <Calendar className="nav-icon" />
                <span>Events</span>
              </a>
              <a
                href="#"
                className="nav-item"
                onClick={() => navigate("/saved")}
              >
                <BookMarked className="nav-icon" />
                <span>Saved</span>
              </a>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <a href="#" className="nav-item" onClick={handleLogout}>
            <LogOut className="nav-icon" />
            <span>Logout</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default TopBarAndSidebar;
