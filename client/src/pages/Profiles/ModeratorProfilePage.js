import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ModeratorProfilePage.css';

const ModProfilePage = () => {
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState({
    username: '',
    studentId: '',
    email: '',
    dob: '',
    gender: '',
    nationality: '',
    program: '',
    intake: '',
  });
  const [isEditing, setIsEditing] = useState(false); // Toggle for editing mode
  const [updatedDetails, setUpdatedDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login'); // Redirect to login if not authenticated
      return;
    }

    axios
      .get('http://localhost:5000/api/role-details', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setUserDetails((prevDetails) => ({
          ...prevDetails,
          ...response.data,
        }));
        setUpdatedDetails(response.data); // Prepare for editing
      })
      .catch((error) => {
        console.error('Error fetching user details:', error);
        navigate('/login');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSaveChanges = async () => {
    const token = localStorage.getItem('token');
    if (!userDetails.id) {
      setMessage('User ID is missing.');
      console.error('User ID is missing.');
      return;
    }

    try {
      await axios.put(
        `http://localhost:5000/api/users/${userDetails.id}`, // Update user in database
        updatedDetails,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUserDetails(updatedDetails); // Update the UI
      setMessage('Profile updated successfully.');
      setIsEditing(false); // Exit editing mode
    } catch (error) {
      console.error('Error saving changes:', error);
      setMessage('Failed to update profile.');
    }
  };

  const handleInputChange = (field, value) => {
    setUpdatedDetails((prev) => ({ ...prev, [field]: value }));
  };

  const renderDropdown = (fieldName, label, options) => (
    <div className="detail-row">
      <span>
        <strong>{label}:</strong>{' '}
        {isEditing ? (
          <select
            value={updatedDetails[fieldName] || ''}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
          >
            <option value="">Select {label}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <span>{userDetails[fieldName] || `Add ${label}`}</span>
        )}
      </span>
    </div>
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="profile-picture">
          <img src="mod_icon.png" alt="Profile" />
        </div>
        <div className="user-details">
          <div className="detail-row">
            <span>
              <strong>Username:</strong> {userDetails.username || 'N/A'}
            </span>
            <span>
              <strong>Student ID:</strong> {userDetails.studentId || 'N/A'}
            </span>
          </div>
          <div className="detail-row">
            <span>
              <strong>Date of Birth:</strong> {userDetails.dob || 'N/A'}
            </span>
            <span>
              <strong>Email:</strong> {userDetails.email || 'N/A'}
            </span>
          </div>
          {renderDropdown('gender', 'Gender', ['Male', 'Female', 'Other'])}
          {renderDropdown('nationality', 'Nationality', [
            'Malaysian',
            'American',
            'Indian',
            'Other',
          ])}
          {renderDropdown('program', 'Program', [
            'Computer Science',
            'Business Management',
            'Psychology',
          ])}
          {renderDropdown('intake', 'Intake', ['Spring 2024', 'Fall 2024', 'Winter 2024'])}
        </div>
        {isEditing && (
          <button className="btn-save" onClick={handleSaveChanges}>
            Save Changes
          </button>
        )}
        {!isEditing && (
          <button className="btn-edit" onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>
        )}
      </header>

      <section className="profile-monitoring">
        <h2>Monitoring</h2>
        <div className="monitoring-buttons">
          <div
            className="monitoring-card"
            onClick={() => navigate('/joined-events')}
          >
            <img
              src="joined_events.png"
              alt="Joined Events"
            />
            <p>Joined Events</p>
            <span>{userDetails.joinedEvents}</span>
          </div>
          <div
            className="monitoring-card"
            onClick={() => navigate('/created-posts')}
          >
            <img
              src="created_posts.png"
              alt="Created Posts"
            />
            <p>Created Posts</p>
            <span>{userDetails.createdPosts}</span>
          </div>
          <div
            className="monitoring-card"
            onClick={() => navigate('/created-events')}
          >
            <img
              src="created_events.png"
              alt="Created Events"
            />
            <p>Created Events</p>
            <span>{userDetails.createdEvents}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ModProfilePage;
