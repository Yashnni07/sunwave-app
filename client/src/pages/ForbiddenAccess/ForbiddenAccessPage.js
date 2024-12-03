// Forbidden.js
import React from 'react';
import './ForbiddenAccessPage.css';

const Forbidden = () => {
    const handleBack = () => {
        window.history.back(); // Go to the previous page
    };

    return (
        <div className="forbidden-container">
            <div className="forbidden-content">
                <h1 className="forbidden-title">403</h1>
                <h2 className="forbidden-subtitle">Forbidden</h2>
                <p className="forbidden-text">
                    You do not have permission to access this page. Please contact your administrator or try navigating to a different page.
                </p>
                <button className="forbidden-button" onClick={handleBack}>
                    Go Back
                </button>
            </div>
        </div>
    );
};

export default Forbidden;
