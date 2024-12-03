import React, { useState } from "react";
import "./UploadEventPage.css";

const UploadEventPage = () => {
    const [formData, setFormData] = useState({
        title: "",
        date: "",
        time: "",
        description: "",
        image: null,
    });
    const [formErrors, setFormErrors] = useState({});
    const [imagePreview, setImagePreview] = useState(null);

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
        return errors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errors = validateForm();
        if (Object.keys(errors).length === 0) {
            console.log("Form submitted successfully:", formData);
            // Add API call here if needed
        } else {
            setFormErrors(errors);
        }
    };

    return (
        <div className="upload-event-container">
            <h2 className="upload-event-title">Concert Event</h2>

            <form className="upload-event-form" onSubmit={handleSubmit}>
                <label htmlFor="title">Event Title:</label>
                <input
                    type="text"
                    id="title"
                    placeholder="Enter event title"
                    value={formData.title}
                    onChange={handleInputChange}
                />
                {formErrors.title && <span className="error-text">{formErrors.title}</span>}

                <div className="date-time-container">
                    <div>
                        <label htmlFor="date">Event Date:</label>
                        <input
                            type="date"
                            id="date"
                            value={formData.date}
                            onChange={handleInputChange}
                        />
                        {formErrors.date && <span className="error-text">{formErrors.date}</span>}
                    </div>
                    <div>
                        <label htmlFor="time">Event Time:</label>
                        <input
                            type="time"
                            id="time"
                            value={formData.time}
                            onChange={handleInputChange}
                        />
                        {formErrors.time && <span className="error-text">{formErrors.time}</span>}
                    </div>
                </div>

                <label htmlFor="description">Event Description:</label>
                <textarea
                    id="description"
                    placeholder="Enter event description"
                    value={formData.description}
                    onChange={handleInputChange}
                ></textarea>
                {formErrors.description && <span className="error-text">{formErrors.description}</span>}

                <label className="upload-image-container">
                    {imagePreview ? (
                        <img src={imagePreview} alt="Uploaded Preview" className="image-preview" />
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
                {formErrors.image && <span className="error-text">{formErrors.image}</span>}

                <button type="submit" className="upload-event-button">Upload Event</button>
            </form>
        </div>
    );
};

export default UploadEventPage;
