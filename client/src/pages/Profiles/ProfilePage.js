import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; // To decode the JWT token
import './ProfilePage.css';

const ProfilePage = () => {
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
  const [isEditing, setIsEditing] = useState(false);
  const [updatedDetails, setUpdatedDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token);

    if (!token) {
      setMessage('No token found. Please log in.');
      setLoading(false);
      return;
    }

    try {
      const decodedToken = jwtDecode(token); // Decode JWT token
      console.log('Decoded Token:', decodedToken);

      const userId = decodedToken.email;
      console.log('Decoded User ID:', userId);

      if (!userId) {
        setMessage('User ID is missing in the token.');
        setLoading(false);
        return;
      }

      // Check if the token has expired
      const currentTime = Date.now() / 1000; // Current time in seconds
      console.log('Current Time (seconds):', currentTime);
      console.log('Token Expiration Time (seconds):', decodedToken.exp);

      if (decodedToken.exp < currentTime) {
        setMessage('Token expired. Please log in again.');
        setLoading(false);
        return;
      }

      // Fetch user details using the decoded userId
      axios
        .get('http://localhost:5000/api/role-details', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          console.log('API Response:', response.data);

          setUserDetails((prevDetails) => ({
            ...prevDetails,
            ...response.data,
          }));
          setUpdatedDetails(response.data);
        })
        .catch((error) => {
          console.error('Error fetching user details:', error);
          setMessage('Failed to fetch user details. Please try again.');
        })
        .finally(() => setLoading(false));
    } catch (error) {
      console.error('Error decoding token:', error);
      setMessage('Invalid token. Please log in again.');
      setLoading(false);
    }
  }, [navigate]);

  const handleSaveChanges = async () => {
    const token = localStorage.getItem('token');
    console.log('Token during Save Changes:', token);

    if (!token) {
      setMessage('No token found. Please log in.');
      return;
    }

    try {
      const decodedToken = jwtDecode(token); // Decode JWT token
      console.log('Decoded Token:', decodedToken);

      const userId = decodedToken.email;
      console.log('Decoded User ID:', userId);

      if (!userId) {
        setMessage('User ID is missing.');
        return;
      }

      await axios.put(
        `http://localhost:5000/api/users/${userId}`,
        updatedDetails,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUserDetails(updatedDetails);
      setMessage('Profile updated successfully.');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      setMessage('Failed to update profile. Please try again.');
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
          <img src="user_icon.png" alt="Profile" />
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
            <img src="joined_events.png" alt="Joined Events" />
            <p>Joined Events</p>
            <span>{userDetails.joinedEvents}</span>
          </div>
          <div
            className="monitoring-card"
            onClick={() => navigate('/created-posts')}
          >
            <img src="created_posts.png" alt="Created Posts" />
            <p>Created Posts</p>
            <span>{userDetails.createdPosts}</span>
          </div>
        </div>
      </section>

      {message && <div className="profile-message">{message}</div>}
    </div>
  );
};

export default ProfilePage;
