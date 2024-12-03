import React, { useEffect, useState } from "react";
import axios from "axios";
import "./CreatedEvent.css";

const CreatedEvents = () => {
    const [normalEvents, setNormalEvents] = useState([]);
    const [votingEvents, setVotingEvents] = useState([]);
    const [modalData, setModalData] = useState({ isOpen: false, type: "", data: null });
    const [editData, setEditData] = useState(null); // Edit modal state

    // Fetch all events created by the user
    const fetchUserCreatedEvents = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get("http://localhost:5000/api/user-created-events", {
                headers: { Authorization: `Bearer ${token}` },
            });

            setNormalEvents(response.data.normalEvents);
            setVotingEvents(response.data.votingEvents);
        } catch (error) {
            console.error("Error fetching user-created events:", error);
        }
    };

    // Fetch joined users for a normal event
    const fetchJoinedUsers = async (eventId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`http://localhost:5000/api/event-joined-users/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setModalData({
                isOpen: true,
                type: "joinedUsers",
                data: response.data,
            });
        } catch (error) {
            console.error("Error fetching joined users:", error);
        }
    };

    // Fetch voting results for a voting event
    const fetchVotingResults = async (eventId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`http://localhost:5000/api/voting-results/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setModalData({ isOpen: true, type: "votingResults", data: response.data });
        } catch (error) {
            console.error("Error fetching voting results:", error);
        }
    };

    // Handle editing an event
    const handleEditEvent = async (eventId, updatedData) => {
        try {
            const token = localStorage.getItem("token");

            console.log("Submitting updated event data:", updatedData); // Debugging log

            const response = await axios.put(
                `http://localhost:5000/api/update-event/${eventId}`,
                updatedData, // Must include `_id`, `_rev`, and `eventType`
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            alert("Event updated successfully!");
            setEditData(null); // Close the edit modal
            fetchUserCreatedEvents(); // Refresh the list
        } catch (error) {
            console.error("Error updating event:", error);
            alert("Failed to update event.");
        }
    };

    // Handle deleting an event
    const handleDeleteEvent = async (eventId) => {
        try {
            const token = localStorage.getItem("token");
            if (window.confirm("Are you sure you want to delete this event?")) {
                await axios.delete(`http://localhost:5000/api/events/${eventId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                alert("Event deleted successfully!");
                fetchUserCreatedEvents();
            }
        } catch (error) {
            console.error("Error deleting event:", error);
            alert("Failed to delete event.");
        }
    };

    // Open the edit modal
    const openEditModal = (event) => {
        setEditData(event);
    };

    // Close the modal (edit or joined/voting results)
    const closeModal = () => {
        setModalData({ isOpen: false, type: "", data: null });
        setEditData(null);
    };

    useEffect(() => {
        fetchUserCreatedEvents();
    }, []);

    return (
        <div className="created-events-container">
            <h2 className="section-heading">My Events</h2>

            {/* Normal Events */}
            <div className="events-section">
                <h3 className="subheading">Normal Events</h3>
                <table className="events-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Title</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {normalEvents.map((event, index) => (
                            <tr key={event._id}>
                                <td>{index + 1}</td>
                                <td>{event.title}</td>
                                <td>{new Date(event.date).toLocaleDateString()}</td>
                                <td>{event.time}</td>
                                <td>
                                    <div className="actions-container">
                                        <button className="view-users-btn" onClick={() => fetchJoinedUsers(event._id)}>
                                            View Joined Users ({event.totalJoined})
                                        </button>
                                        <div className="secondary-actions">
                                            <button className="edit-btn" onClick={() => openEditModal(event)}>
                                                Edit
                                            </button>
                                            <button className="delete-btn" onClick={() => handleDeleteEvent(event._id)}>
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Voting Events */}
            <div className="events-section">
                <h3 className="subheading">Voting Events</h3>
                <table className="events-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Title</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {votingEvents.map((event, index) => (
                            <tr key={event._id}>
                                <td>{index + 1}</td>
                                <td>{event.title}</td>
                                <td>{new Date(event.date).toLocaleDateString()}</td>
                                <td>{event.time}</td>
                                <td>
                                    <div className="actions-container">
                                        <button className="show-results-btn" onClick={() => fetchVotingResults(event._id)}>
                                            Show Results
                                        </button>
                                        <div className="secondary-actions">
                                            <button className="edit-btn" onClick={() => openEditModal(event)}>
                                                Edit
                                            </button>
                                            <button className="delete-btn" onClick={() => handleDeleteEvent(event._id)}>
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal for Joined Users or Voting Results */}
            {modalData.isOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <button className="close-button" onClick={closeModal}>
                            ×
                        </button>
                        {modalData.type === "joinedUsers" && modalData.data && (
                            <div className="modal-container">
                                <h3>Joined Users</h3>
                                <ul className="user-list">
                                    {modalData.data.map((user, index) => (
                                        <li key={index}>{user.email}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {modalData.type === "votingResults" && modalData.data && (
                            <div className="modal-container voting-results">
                                <h3>Voting Results</h3>
                                {modalData.data.map((option, index) => (
                                    <div className="vote-item" key={index}>
                                        <div className="vote-option">
                                            <strong>{option.option}</strong>: {option.votes} votes
                                        </div>
                                        <ul className="vote-list">
                                            {option.votedUsers.map((user, idx) => (
                                                <li key={idx}>{user.email}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal for Editing an Event */}
            {editData && (
                <div className="modal">
                    <div className="modal-content">
                        <button className="close-button" onClick={closeModal}>
                            ×
                        </button>
                        <h3>Edit Event</h3>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleEditEvent(editData._id, editData);
                            }}
                        >
                            <label>
                                Title:
                                <input
                                    type="text"
                                    value={editData.title}
                                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                />
                            </label>
                            <label>
                                Description:
                                <textarea
                                    value={editData.description}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                />
                            </label>
                            <label>
                                Date:
                                <input
                                    type="date"
                                    value={editData.date}
                                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                                />
                            </label>
                            <label>
                                Time:
                                <input
                                    type="time"
                                    value={editData.time}
                                    onChange={(e) => setEditData({ ...editData, time: e.target.value })}
                                />
                            </label>
                            <button type="submit" className="edit-btn">
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreatedEvents;
