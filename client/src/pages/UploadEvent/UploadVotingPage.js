import React, { useState } from "react";
import "./UploadVotingPage.css";
import {
  Calendar,
  Home,
  BookMarked,
  MessageSquare,
  LogOut,
  User,
} from "lucide-react";

const UploadVotingPage = () => {
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    description: "",
    image: null,
  });
  const [formErrors, setFormErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); // For the search bar
  const [selectedCandidates, setSelectedCandidates] = useState([]); // For selected candidates
  const [candidateError, setCandidateError] = useState(""); // Error for candidate selection

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
        setFormData((prev) => ({ ...prev, image: file }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title) errors.title = "Event title is required";
    if (!formData.date) errors.date = "Event date is required";
    if (!formData.time) errors.time = "Event time is required";
    if (!formData.description) {
      errors.description = "Event description is required";
    } else if (formData.description.length < 50) {
      errors.description = "Description must be at least 50 characters";
    }
    if (!formData.image) errors.image = "Please upload an event image";

    // Validate candidates
    if (selectedCandidates.length < 3) {
      setCandidateError("At least 3 candidates must be selected");
    } else if (selectedCandidates.length > 5) {
      setCandidateError("Only a maximum of 5 candidates can be selected");
    } else {
      setCandidateError(""); // Clear candidate error if valid
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length === 0 && !candidateError) {
      console.log("Form submitted successfully:", formData, selectedCandidates);
      // Add API call here if needed
    } else {
      setFormErrors(errors);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCandidateSelect = (candidate) => {
    if (!selectedCandidates.includes(candidate)) {
      if (selectedCandidates.length < 5) {
        setSelectedCandidates([...selectedCandidates, candidate]);
        setCandidateError(""); // Clear error if candidate is added and it's valid
      } else {
        setCandidateError("Only a maximum of 5 candidates can be selected");
      }
    }
    setSearchTerm(""); // Clear search term after selection
  };

  const handleRemoveCandidate = (candidate) => {
    setSelectedCandidates(selectedCandidates.filter((c) => c !== candidate));
    if (selectedCandidates.length - 1 < 3) {
      setCandidateError("At least 3 candidates must be selected");
    } else {
      setCandidateError("");
    }
  };

  // Mock candidates for the dropdown
  const candidates = [
    "Jackson Wang",
    "Kim Mingyu",
    "Lee Jieun",
    "Park Jimin",
    "Lisa Manoban",
  ];

  return (
    <div className="upload-event-container">
      <h2 className="upload-event-title">Voting Event</h2>

      <form className="upload-event-form" onSubmit={handleSubmit}>
        <label htmlFor="title">Event Title:</label>
        <input
          type="text"
          id="title"
          placeholder="Enter event title"
          value={formData.title}
          onChange={handleInputChange}
        />
        {formErrors.title && (
          <span className="error-text">{formErrors.title}</span>
        )}

        <div className="date-time-container">
          <div>
            <label htmlFor="date">Event Date:</label>
            <input
              type="date"
              id="date"
              value={formData.date}
              onChange={handleInputChange}
            />
            {formErrors.date && (
              <span className="error-text">{formErrors.date}</span>
            )}
          </div>
          <div>
            <label htmlFor="time">Voting End Time:</label>
            <input
              type="time"
              id="time"
              value={formData.time}
              onChange={handleInputChange}
            />
            {formErrors.time && (
              <span className="error-text">{formErrors.time}</span>
            )}
          </div>
        </div>

        <label htmlFor="description">Event Description:</label>
        <textarea
          id="description"
          placeholder="Enter event description"
          value={formData.description}
          onChange={handleInputChange}
        ></textarea>
        {formErrors.description && (
          <span className="error-text">{formErrors.description}</span>
        )}

        <label className="upload-image-container">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Uploaded Preview"
              className="image-preview"
            />
          ) : (
            <div className="upload-placeholder">
              <span>+</span>
              <p>Upload Image</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="image-upload-input"
          />
        </label>
        {formErrors.image && (
          <span className="error-text">{formErrors.image}</span>
        )}

        {/* Search Bar */}
        <label htmlFor="search">Search Candidates:</label>
        <input
          type="text"
          id="search"
          placeholder="Search for candidates"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <ul className="dropdown-list">
          {candidates
            .filter((candidate) =>
              candidate.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((candidate, index) => (
              <li key={index} onClick={() => handleCandidateSelect(candidate)}>
                {candidate}
              </li>
            ))}
        </ul>

        {/* Selected Candidates */}
        <div className="selected-candidates">
          <h3>Selected Candidates:</h3>
          <ul>
            {selectedCandidates.map((candidate, index) => (
              <li key={index}>
                {candidate}
                <button
                  type="button"
                  onClick={() => handleRemoveCandidate(candidate)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {candidateError && (
            <span className="error-text">{candidateError}</span>
          )}
        </div>

        <button
          type="submit"
          className="upload-event-button"
          disabled={candidateError || Object.keys(formErrors).length > 0}
        >
          Upload Event
        </button>
      </form>
    </div>
  );
};

export default UploadVotingPage;
