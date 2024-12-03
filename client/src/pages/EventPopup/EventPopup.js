import React, { useState, useEffect } from "react";
import axios from "axios";
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
  userId,
  onClose,
  isJoined: isJoinedProp, // New optional prop
  isVoted: isVotedProp, // New optional prop
}) => {
  const [selectedVotes, setSelectedVotes] = useState([]);
  const [hasError, setHasError] = useState(false);
  const [isVoted, setIsVoted] = useState(isVotedProp || false); // Use prop if available
  const [isJoined, setIsJoined] = useState(isJoinedProp || false); // Use prop if available
  const [errorMessage, setErrorMessage] = useState("");
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [voteCounts, setVoteCounts] = useState({});

  // Fetch user's join and vote status only if props are not provided
  useEffect(() => {
    if (isJoinedProp === undefined || isVotedProp === undefined) {
      const fetchUserEventStatus = async () => {
        try {
          // Fetch the user's joined and voted events
          const response = await axios.get(
            `http://127.0.0.1:5000/api/users/events`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`, // Send token to authenticate the user
              },
            }
          );

          const { joinedEvents, votedEvents } = response.data;

          // Check if the event is joined
          if (isJoinedProp === undefined) {
            const joined = joinedEvents.some(
              (event) => event.eventId === eventId
            );
            setIsJoined(joined);
          }

          // Check if the user has voted
          if (isVotedProp === undefined) {
            const voted = votedEvents.some((vote) => vote.eventId === eventId);
            setIsVoted(voted);
          }
        } catch (error) {
          console.error("Error fetching user event status:", error);
        }
      };

      if (eventId) {
        fetchUserEventStatus(); // Fetch only if an eventId is available
      }
    }
  }, [eventId, isJoinedProp, isVotedProp]);

  const fetchVoteCounts = async () => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:5000/api/voting-event/${eventId}`
      );

      const counts = response.data.voteOptions.reduce((acc, option) => {
        acc[option.name] = option.votes; // Map option name to its vote count
        return acc;
      }, {});

      // Update the vote counts state
      setVoteCounts(counts);
    } catch (error) {
      console.error("Error fetching vote counts:", error);
    }
  };

  const handleImageClick = (imageUrl, e) => {
    e.stopPropagation();
    setPreviewImage(imageUrl);
    setShowImagePreview(true);
  };

  const handleClosePreview = () => {
    setShowImagePreview(false);
    setPreviewImage(null);
  };

  const handleVoteChange = (optionName) => {
    setSelectedVotes([optionName]); // Always overwrite to allow only one option
    setHasError(false);
    setErrorMessage("");
  };

  const handleVoteSubmit = async () => {
    if (selectedVotes.length === 0) {
      setHasError(true);
      setErrorMessage("Please select one option before submitting.");
      return;
    }

    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/api/vote-event",
        { eventId, selectedOption: selectedVotes[0] },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setIsVoted(true); // Mark the user as having voted
      setErrorMessage(""); // Clear any previous errors

      // Update voteOptions in state with the new data from the response
      const updatedEvent = response.data.updatedEvent;
      setVoteCounts(
        updatedEvent.voteOptions.reduce((acc, option) => {
          acc[option.name] = option.votes;
          return acc;
        }, {})
      );

      console.log("Vote submitted successfully:", response.data);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Error submitting votes. Please try again."
      );
      console.error("Error voting for event:", error);
    }
  };

  const handleJoinEvent = async () => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/api/join-event",
        { eventId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setIsJoined(true);
      console.log("Event joined successfully:", response.data);
      setErrorMessage(""); // Clear any previous error
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "Error joining event. Please try again."
      );
      console.error("Error joining event:", error);
    }
  };

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
            disabled={isJoined}
          >
            {isJoined ? "Joined!" : "Join"}
          </button>
        </div>
      </div>
    </div>
  );

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
          disabled={isVoted}
          className={`submit-button ${isVoted ? "voted" : ""}`}
        >
          {isVoted ? "Voted" : "Submit Vote"}
        </button>
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
    </div>
  );
};

export default EventPopup;
