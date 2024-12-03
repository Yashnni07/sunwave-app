import React, { useState } from 'react';
import './AdminSettingsPage.css';

const AdminSettingsPage = () => {
  const [usePerspectiveAPI, setUsePerspectiveAPI] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('Disabled');
  const [requestTimeout, setRequestTimeout] = useState('');

  const handleUpdate = () => {
    alert(`Settings Updated:
    Use Perspective API: ${usePerspectiveAPI}
    Provider: ${selectedProvider}
    Timeout (ms): ${requestTimeout}`);
    // Add logic to save the settings here
  };

  return (
<>
      {/* Main Content */}
    
        <div className="content-wrapper">
          <div className="settings-container">
            <div className="settings-header">
              <h2>Settings</h2>
            </div>
            <div className="settings-form">
              <h3>Service Preferences</h3>
              <div className="form-group">
                <label>
                <span className="label-text">User Perspective API for content moderation</span>
                  <input
                    type="checkbox"
                    checked={usePerspectiveAPI}
                    onChange={() => setUsePerspectiveAPI(!usePerspectiveAPI)}
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                <span className="label-text">Category filtering service provider</span>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                  >
                    <option value="Disabled">Disabled</option>
                    <option value="TextRazor">TextRazor</option>
                    <option value="InterfaceAPI">InterfaceAPI</option>
                    <option value="ClassifierAPI">ClassifierAPI</option>
                  </select>
                </label>
              </div>
              <div className="form-group">
                <label>
                  <span className="label-text">Category filtering request timeout (ms)</span>
                  <input
                    type="number"
                    value={requestTimeout}
                    onChange={(e) => setRequestTimeout(e.target.value)}
                    placeholder="Enter timeout in ms"
                  />
                </label>
              </div>
              <button className="update-button" onClick={handleUpdate}>
                Update
              </button>
            </div>
          </div>
        </div>
        </>
  );
};

export default AdminSettingsPage;