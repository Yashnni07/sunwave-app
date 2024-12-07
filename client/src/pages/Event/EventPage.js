import React, { useState, useEffect } from "react";
import axios from "axios";
import EventPopup from "../EventPopup/EventPopup";
import "./EventPage.css";

const EventPage = () => {
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // For search functionality
  const [selectedEvent, setSelectedEvent] = useState(null); // For the popup
  const [isPopupOpen, setIsPopupOpen] = useState(false); // Controls popup visibility

  // Fetch events from the backend API
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/allevents")
      .then((response) => setEvents(response.data))
      .catch((error) => console.error("Error fetching events:", error));
  }, []);

  // Filter events based on search query
  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        {/* Search bar */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Event listing */}
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
                  <img src={event.image} alt="Event" className="event-image" />
                </div>
              </div>
            </div>
          ))}
        </div>
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

export default EventPage;
