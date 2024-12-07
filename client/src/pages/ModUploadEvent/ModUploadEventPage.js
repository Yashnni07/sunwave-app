import React, { useState, useEffect } from "react";
import axios from "axios";
import EventPopup from "../EventPopup/EventPopup";
import "../Event/EventPage.css"; // Reuse EventPage styles
import "../AdminUploadEvent/AdminUploadEventPage.css"; // Include upload styles
import { jwtDecode } from "jwt-decode";

const ModUploadEventPage = () => {
  const [events, setEvents] = useState([]); // All events
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
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
  const [voteOptionInput, setVoteOptionInput] = useState({
    name: "",
    position: "",
    image: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [candidateError, setCandidateError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Fetch events from the backend API
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

  // Filter events based on search query
  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      voteOptions: [...prev.voteOptions, { name, position, image, votes: 0 }],
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

     // Retrieve the token from localStorage
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("User is not authenticated.");
      return;
    }

    // Decode the token to get the email
    let creatorEmail;
    try {
      const decodedToken = jwtDecode(token);
      // Adjust the path based on your JWT payload structure
      creatorEmail = decodedToken.email || decodedToken.user.email;
    } catch (decodeError) {
      console.error("Error decoding token:", decodeError);
      setMessage("Invalid authentication token.");
      return;
    }

    if (!creatorEmail) {
      setMessage("Unable to retrieve user email from token.");
      return;
    }

    try {
      // Prepare the data to be sent to the backend
      const eventData = {
        ...formData,
        creatorEmail, // Include creatorEmail in the request body
        dateCreated: new Date().toISOString(), // Optionally add dateCreated
      };
  
      // Make the POST request to the backend API
      const response = await axios.post(
        "http://127.0.0.1:5000/api/post-events", // Updated API endpoint
        eventData,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Include the token in headers if needed
            'Content-Type': 'application/json',
          },
        }
      );
  
      // Check if the response is successful
      if (response.status === 201) {
        setMessage("Event uploaded successfully!");
        
        // Refresh events after uploading a new event
        await fetchEvents();
        
        // Reset form fields
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
      } else {
        setMessage("Unexpected response from the server.");
      }
    } catch (error) {
      console.error("Error uploading event:", error);
      // Extract error message from response if available
      const errorMsg =
        error.response?.data?.message || "Failed to upload event.";
      setMessage(errorMsg);
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

  // Handle event details button click
  const handleDetailsClick = (event) => {
    setSelectedEvent(event);
    setIsPopupOpen(true);
  };

  // Handle closing the popup
  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div className="event-page">
      <div className="content-wrapper">
        <div className="content-header">
          <h2 className="month-title">
            {showForm ? "Upload Event" : "Events"}
          </h2>
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
            {filteredEvents.map((event) => (
              <div key={event._id} className="event-card">
                {/* Date box */}
                <div className="date-box">
                  {event.date ? (
                    <>
                      <div className="date-month">
                        {new Date(event.date).toLocaleString("default", {
                          month: "short",
                        })}
                      </div>
                      <div className="date-day">
                        {new Date(event.date).getDate()}
                      </div>
                      <div className="date-name">
                        {new Date(event.date).toLocaleString("default", {
                          weekday: "short",
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="date-month">N/A</div>
                      <div className="date-day">N/A</div>
                      <div className="date-name">N/A</div>
                    </>
                  )}
                  <div className="event-time-box">{event.time || "N/A"}</div>
                </div>

                {/* Event content */}
                <div className="event-content">
                  <div className="event-details">
                    <div className="event-type">
                      {event.eventType || "General"}
                    </div>
                    <h3 className="event-title">{event.title}</h3>
                    <p className="event-description">{event.description}</p>
                    <button
                      className="details-button"
                      onClick={() => handleDetailsClick(event)}
                    >
                      Details
                    </button>
                  </div>

                  {/* Event image */}
                  <div className="event-image-container">
                    <img
                      src={event.image}
                      alt="Event"
                      className="event-image"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {message && <p className="message">{message}</p>}
      </div>

      {/* Event Popup */}
      {isPopupOpen && selectedEvent && (
        <EventPopup
          title={selectedEvent.title}
          description={selectedEvent.description}
          location={selectedEvent.location}
          time={selectedEvent.time}
          imageUrl={selectedEvent.image}
          eventType={selectedEvent.eventType}
          voteOptions={selectedEvent.voteOptions}
          eventId={selectedEvent._id}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
};

export default ModUploadEventPage;
