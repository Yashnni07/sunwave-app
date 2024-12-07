// EventPopup.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode"; // Correct import
import { X, AlertCircle, MapPin, Clock } from "lucide-react";
import "./EventPopup.css";

const EventPopup = ({
  title,
  description,
  location,
  time,
  imageUrl = "/api/placeholder/400/320",
  eventType,
  voteOptions = [],
  eventId,
  onClose,
}) => {
  const [selectedVotes, setSelectedVotes] = useState([]);
  const [hasError, setHasError] = useState(false);
  const [isVoted, setIsVoted] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [voteCounts, setVoteCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Base API URL
  const API_BASE_URL = "http://127.0.0.1:5000/api";

  // Extract user email from token
  const token = localStorage.getItem("token");
  let userEmail = "";

  if (token) {
    try {
      const decoded = jwtDecode(token);
      userEmail = decoded.email; // Adjust based on your token's payload structure
      console.log("User Email:", userEmail); // Debugging
    } catch (error) {
      console.error("Invalid token:", error);
    }
  }

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setIsLoading(true);
        console.log(`Fetching details for event: ${eventId}`);

        let eventData;

        if (eventType === "voting") {
          // Fetch voting event details
          const response = await axios.get(`${API_BASE_URL}/voting-event/${eventId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          eventData = response.data;
          console.log("Response Data (Voting Event):", eventData);
        } else if (eventType === "normal") {
          // Fetch normal event joined users
          const response = await axios.get(`${API_BASE_URL}/event-joined-users/${eventId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          eventData = response.data;
          console.log("Response Data (Normal Event):", eventData);
        }

        if (eventData) {
          if (eventType === "voting") {
            // For voting events, handle joinedUsers and voting logic
            const joined = eventData.joinedUsers && eventData.joinedUsers.some(user => user.email === userEmail);
            setIsJoined(joined);
            console.log("User has joined (voting):", joined);

            const voted = eventData.voteOptions.some(option =>
              option.votedUsers.includes(userEmail)
            );
            setIsVoted(voted);
            console.log("User has voted:", voted);

            const counts = eventData.voteOptions.reduce((acc, option) => {
              acc[option.name] = option.votes;
              return acc;
            }, {});
            setVoteCounts(counts);
            console.log("Vote Counts:", counts);
          } else if (eventType === "normal") {
            // For normal events, eventData is an array of users
            // Check if any user's userId matches the userEmail
            const isUserJoined = Array.isArray(eventData) && eventData.some(user => user.userId === userEmail);
            setIsJoined(isUserJoined);
            console.log("User has joined (normal event):", isUserJoined);
          }
        } else {
          console.error("Event data is missing expected structure:", eventData);
        }
      } catch (error) {
        console.error("Error fetching event details:", error);
        setErrorMessage("Unable to fetch event details. Please try again later.");
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId, token, userEmail, eventType]);  // Ensure all dependencies are included
  
  // Handle image preview
  const handleImageClick = (imageUrl, e) => {
    e.stopPropagation();
    setPreviewImage(imageUrl);
    setShowImagePreview(true);
  };

  const handleClosePreview = () => {
    setShowImagePreview(false);
    setPreviewImage(null);
  };

  // Handle vote selection
  const handleVoteChange = (optionName) => {
    setSelectedVotes([optionName]); // Allow only one selection for radio buttons
    setHasError(false);
    setErrorMessage("");
  };

  // Handle voting submission
  const handleVoteSubmit = async () => {
    if (selectedVotes.length === 0) {
      setHasError(true);
      setErrorMessage("Please select one option before submitting.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_BASE_URL}/voting-event/${eventId}/vote`,
        { selectedOption: selectedVotes[0] },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 200) {
        setIsVoted(true); // Mark the user as having voted
        setErrorMessage(""); // Clear any previous errors

        // Update voteCounts in state with the new data from the response
        const updatedEvent = response.data.updatedEvent;
        const updatedCounts = updatedEvent.voteOptions.reduce((acc, option) => {
          acc[option.name] = option.votes;
          return acc;
        }, {});
        setVoteCounts(updatedCounts);

        console.log("Vote submitted successfully:", response.data);
      } else {
        setErrorMessage("Failed to submit vote.");
        setHasError(true);
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Error submitting vote. Please try again."
      );
      console.error("Error voting for event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle joining the event
  const handleJoinEvent = async () => {
    try {
      setIsLoading(true);
  
      const response = await axios.get(
        `${API_BASE_URL}/join-event/${eventId}`, // eventId passed in the URL
        {
          headers: { Authorization: `Bearer ${token}` }, // Include the auth token
        }
      );
  
      if (response.status === 200) {
        setIsJoined(true);
        setErrorMessage(""); // Clear any previous error
        console.log("Event joined successfully:", response.data);
      } else {
        setErrorMessage("Failed to join event.");
        setHasError(true);
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Error joining event. Please try again."
      );
      console.error("Error joining event:", error);
    } finally {
      setIsLoading(false);
    }
  };  

  // Define VotingEventLayout
  const VotingEventLayout = () => (
    <div className="popup-container voting">
      <button onClick={onClose} className="close-button">
        <X size={24} />
      </button>

      <div className="event-header">
        <div className="event-image-wrapper">
          <img
            src={imageUrl}
            alt={title}
            className="event-image"
            onClick={(e) => handleImageClick(imageUrl, e)}
          />
        </div>

        <div className="event-details">
          <h2 className="event-title">{title}</h2>
          <div className="event-descriptions">
            {description.split("\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <div className="detail-item">
            <MapPin size={16} className="detail-icon" />
            <span className="detail-value">{location}</span>
          </div>

          <div className="detail-item">
            <Clock size={16} className="detail-icon" />
            <span className="detail-value">{time}</span>
          </div>
        </div>
      </div>

      <div className="candidates-section">
        <h3 className="candidates-title">Candidates</h3>
        <div className="voting-options">
          {voteOptions.map((option, index) => (
            <label
              key={index}
              className={`vote-option ${
                selectedVotes.includes(option.name) ? "selected" : ""
              }`}
            >
              <div className="vote-option-content">
                {option.image && (
                  <img
                    src={option.image}
                    alt={option.name}
                    className="vote-option-image"
                  />
                )}
                <span className="vote-option-text">{option.name}</span>
                {isVoted && (
                  <span className="vote-count-message">
                    Vote Count: {voteCounts[option.name] || option.votes || 0}
                  </span>
                )}
              </div>
              <input
                type="radio"
                name="voteOption"
                checked={selectedVotes.includes(option.name)}
                onChange={() => handleVoteChange(option.name)}
                className="vote-radio"
                disabled={isVoted}
              />
            </label>
          ))}
        </div>

        {errorMessage && (
          <div className="error-message">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          onClick={handleVoteSubmit}
          disabled={isVoted || isLoading}
          className={`submit-button ${isVoted ? "voted" : ""}`}
        >
          {isVoted ? "Voted" : isLoading ? "Submitting..." : "Submit Vote"}
        </button>
      </div>
    </div>
  );

  // Define NormalEventLayout
  const NormalEventLayout = () => (
    <div className="popup-container">
      <button onClick={onClose} className="close-button">
        <X size={24} />
      </button>

      <div className="event-image-wrapper">
        <img
          src={imageUrl}
          alt={title}
          className="event-image"
          onClick={(e) => handleImageClick(imageUrl, e)}
        />
      </div>

      <div className="event-content">
        <h2 className="event-title">{title}</h2>
        <div className="event-descriptions">
          {description.split("\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <div className="event-details">
          <div className="detail-item">
            <MapPin size={16} className="detail-icon" />
            <span className="detail-value">{location}</span>
          </div>

          <div className="detail-item">
            <Clock size={16} className="detail-icon" />
            <span className="detail-value">{time}</span>
          </div>
        </div>

        <div className="event-actions">
          <button
            onClick={handleJoinEvent}
            className={`join-button ${isJoined ? "joined" : ""}`}
            disabled={isJoined || isLoading}
          >
            {isJoined ? "Joined!" : isLoading ? "Joining..." : "Join"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="popup-overlay">
      {eventType === "voting" ? <VotingEventLayout /> : <NormalEventLayout />}

      {showImagePreview && (
        <div className="image-preview-modal" onClick={handleClosePreview}>
          <div
            className="image-preview-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="preview-close-button"
              onClick={handleClosePreview}
            >
              <X size={24} />
            </button>
            <img src={previewImage} alt="Preview" className="preview-image" />
          </div>
        </div>
      )}

      {hasError && errorMessage && (
        <div className="error-message-global">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default EventPopup;
