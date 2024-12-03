import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminUploadEventPage.css";

const AdminUploadEventPage = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    image: "",
    location: "",
    eventType: "normal", // Default to normal
    voteOptions: [],
  });
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [voteOptionInput, setVoteOptionInput] = useState({
    name: "",
    position: "",
    image: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [candidateError, setCandidateError] = useState("");

  // Fetch existing events on page load
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:5000/api/events");
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle adding a vote option
  const handleAddVoteOption = () => {
    const { name, position, image } = voteOptionInput;

    if (!name || !position || !image) {
      setCandidateError("All fields for vote options are required");
      return;
    }

    if (formData.voteOptions.length >= 5) {
      setCandidateError("You can only add up to 5 candidates");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      voteOptions: [...prev.voteOptions, { name, position, image, votes: 0 }], // Add candidate with 0 initial votes
    }));
    setVoteOptionInput({ name: "", position: "", image: "" });
    setCandidateError("");
  };

  // Handle removing a vote option
  const handleRemoveVoteOption = (index) => {
    const updatedVoteOptions = formData.voteOptions.filter(
      (_, i) => i !== index
    );

    setFormData((prev) => ({
      ...prev,
      voteOptions: updatedVoteOptions,
    }));

    // Check if the updated list meets the minimum requirements
    if (formData.eventType === "voting" && updatedVoteOptions.length < 2) {
      setCandidateError("You must have at least 2 vote options");
    } else {
      setCandidateError("");
    }
  };

  // Handle form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
  
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
  
    try {
      const dateCreated = new Date().toISOString();
  
      const apiEndpoint =
        formData.eventType === "voting"
          ? "http://127.0.0.1:5000/api/post-voting-events"
          : "http://127.0.0.1:5000/api/post-events";
  
      const response = await axios.post(apiEndpoint, {
        ...formData,
        dateCreated,
      });
  
      setMessage("Event uploaded successfully!");
  
      // Fetch the latest events after uploading
      await fetchEvents();
  
      // Reset form
      setFormData({
        title: "",
        description: "",
        date: "",
        time: "",
        image: "",
        location: "",
        eventType: "normal",
        voteOptions: [],
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error uploading event:", error);
      setMessage("Failed to upload event.");
    }
  };
  

  // Validate form data
  const validateForm = () => {
    const errors = {};
    if (!formData.title) errors.title = "Event title is required";
    if (!formData.description)
      errors.description = "Event description is required";
    if (!formData.date) errors.date = "Event date is required";
    if (!formData.time) errors.time = "Event time is required";
    if (!formData.location) errors.location = "Event location is required";

    if (formData.eventType === "voting" && formData.voteOptions.length < 2) {
      errors.voteOptions =
        "You must add at least 2 vote options for a voting event";
    }

    return errors;
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <h2 className="month-title">{showForm ? "Upload Event" : "Events"}</h2>
        <button
            className="create-event-button"
            onClick={() => {
              setShowForm((prev) => {
                if (!prev) {
                  setMessage(""); // Clear the message when switching to the form
                }
                return !prev;
              });
            }}
          >
          {showForm ? "Back to Events" : "Upload Events"}
        </button>
      </div>

      {showForm ? (
        <form className="upload-event-form" onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label>Event Title:</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
            {formErrors.title && (
              <span className="error-text">{formErrors.title}</span>
            )}
          </div>

          <div className="form-group">
            <label>Description:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
            {formErrors.description && (
              <span className="error-text">{formErrors.description}</span>
            )}
          </div>

          <div className="form-group">
            <label>Date:</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
            {formErrors.date && (
              <span className="error-text">{formErrors.date}</span>
            )}
          </div>

          <div className="form-group">
            <label>Time:</label>
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
              required
            />
            {formErrors.time && (
              <span className="error-text">{formErrors.time}</span>
            )}
          </div>

          <div className="form-group">
            <label>Image URL:</label>
            <input
              type="text"
              name="image"
              value={formData.image}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>Location:</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
            />
            {formErrors.location && (
              <span className="error-text">{formErrors.location}</span>
            )}
          </div>

          <div className="form-group">
            <label>Event Type:</label>
            <select
              name="eventType"
              value={formData.eventType}
              onChange={handleInputChange}
            >
              <option value="normal">Normal</option>
              <option value="voting">Voting</option>
            </select>
          </div>

          {formData.eventType === "voting" && (
            <div className="vote-options-section">
              <label>Vote Options</label>
              <div className="vote-option-inputs">
                <input
                  type="text"
                  placeholder="Candidate Name"
                  value={voteOptionInput.name}
                  onChange={(e) =>
                    setVoteOptionInput((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
                <input
                  type="text"
                  placeholder="Candidate Position"
                  value={voteOptionInput.position}
                  onChange={(e) =>
                    setVoteOptionInput((prev) => ({
                      ...prev,
                      position: e.target.value,
                    }))
                  }
                />
                <input
                  type="text"
                  placeholder="Candidate Image URL"
                  value={voteOptionInput.image}
                  onChange={(e) =>
                    setVoteOptionInput((prev) => ({
                      ...prev,
                      image: e.target.value,
                    }))
                  }
                />
                <button type="button" onClick={handleAddVoteOption}>
                  Add
                </button>
              </div>
              {candidateError && (
                <span className="error-text">{candidateError}</span>
              )}

              <ul className="vote-options-error">
                {formData.voteOptions.map((option, index) => (
                  <li key={index}>
                    <span>
                      {option.name} - {option.position}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveVoteOption(index)}
                      className="remove-candidate-button"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {formErrors.voteOptions && (
            <span className="error-text">{formErrors.voteOptions}</span>
          )}

          <button type="submit" className="submit-button">
            Upload Event
          </button>
        </form>
      ) : (
        <div className="events-list">
          {events.map((event) => (
            <div key={event._id || Math.random()} className="event-card">
              <div className="event-details">
                <h3 className="event-title">
                  {event.title || "Untitled Event"}
                </h3>
                <p className="event-description">
                  {event.description || "No description available."}
                </p>
                <div className="event-metadata">
                  <span>📅 {event.date || "Unknown date"}</span>
                  <span>⏰ {event.time || "Unknown time"}</span>
                  {event.location && <span>📍 {event.location}</span>}
                </div>
                {event.dateCreated && (
                  <span>
                    <strong>Created On:</strong>{" "}
                    {new Date(event.dateCreated).toLocaleDateString()}
                  </span>
                )}
              </div>
              {event.image && (
                <div className="event-image-container">
                  <img
                    src={event.image}
                    alt={event.title || "Event image"}
                    className="event-image"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default AdminUploadEventPage;
