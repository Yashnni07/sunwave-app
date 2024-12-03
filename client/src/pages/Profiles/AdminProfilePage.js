import React from 'react';
import { Calendar, MessageSquare, Users, Settings } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import './AdminProfilePage.css';

const AdminProfile = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <>

      {/* Main Content */}
      
        <div className="content-wrapper">
          {/* Admin Header */}
          <div className="admin-header">
            <div className="header-content">
              <div className="admin-avatar">
                <img
                  src="admin_icon.png"
                  alt="Admin"
                  className="avatar-image"
                />
              </div>
              <h2 className="admin-title">ADMIN</h2>
            </div>
          </div>

          {/* Button Grid */}
          <div className="button-grid">
            <button onClick={() => handleNavigation('/admin-events')} className="nav-button">
              <Calendar size={48} className="button-icon" />
              <span className="button-text">Events</span>
            </button>

            <button onClick={() => handleNavigation('/del-flagged-posts')} className="nav-button">
              <MessageSquare size={48} className="button-icon" />
              <span className="button-text">Forum</span>
            </button>

            <button onClick={() => handleNavigation('/admin-users')} className="nav-button">
              <Users size={48} className="button-icon" />
              <span className="button-text">User</span>
            </button>

            <button onClick={() => handleNavigation('/admin-settings')} className="nav-button">
              <Settings size={48} className="button-icon" />
              <span className="button-text">Settings</span>
            </button>
          </div>
        </div>
      </>
  );
};

export default AdminProfile;