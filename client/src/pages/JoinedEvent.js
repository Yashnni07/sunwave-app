import React, { useState, useEffect } from "react";
import axios from "axios";
import EventPopup from "./EventPopup/EventPopup";
import "./Event/EventPage.css";

const JoinedEventsPage = () => {
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch joined events from the backend API
  useEffect(() => {
    const fetchJoinedEvents = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/user/joined-events",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        // Assuming the response includes an array of full event data
        setJoinedEvents(
          response.data.joinedEvents.map((event) => ({
            ...event,
            isJoined: true, // Mark these events as joined
            isVoted: false, // Optional: Update this if needed
          }))
        );
      } catch (err) {
        console.error("Error fetching joined events:", err);
        setError("Failed to load joined events.");
      } finally {
        setLoading(false);
      }
    };

    fetchJoinedEvents();
  }, []);

  // Handle when an event is clicked
  const handleDetailsClick = (event) => {
    setSelectedEvent(event);
    setIsPopupOpen(true);
  };

  // Close the popup
  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedEvent(null);
  };

  if (loading) return <div>Loading joined events...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="events-page">
      <div className="page-header">
        <h2 className="status-title">Joined Events</h2>
      </div>

      <div className="events-list">
        {joinedEvents.length > 0 ? (
          joinedEvents.map((event) => (
            <div key={event.eventId} className="event-card">
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
                  <div className="event-type">{event.type || "General"}</div>
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
                    src={event.image || "/placeholder.jpg"}
                    alt="Event"
                    className="event-image"
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>You have not joined any events yet.</p>
        )}
      </div>

      {isPopupOpen && selectedEvent && (
        <EventPopup
          title={selectedEvent.title || "No Title"}
          description={selectedEvent.description || ""}
          location={selectedEvent.location || "No Location"}
          time={selectedEvent.time || "No Time"}
          imageUrl={selectedEvent.image || "/placeholder.jpg"}
          eventType={selectedEvent.eventType || "General"}
          voteOptions={selectedEvent.voteOptions || []}
          eventId={selectedEvent.eventId}
          isJoined={selectedEvent.isJoined} // Pass isJoined directly
          isVoted={selectedEvent.isVoted} // Optional: Pass isVoted if needed
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
};

export default JoinedEventsPage;
