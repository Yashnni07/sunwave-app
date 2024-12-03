import React, { useState } from 'react';

const AttachmentButton = () => {
    const [fileName, setFileName] = useState('');

    const handleFileChange = (event) => {
        const file = event.target.files[0]; // Get the selected file
        if (file) {
            setFileName(file.name); // Update the file name state
            console.log('File selected:', file); // Log the file for testing
        }
    };

    return (
        <div>
            <label htmlFor="file-upload" className="attachment-button">
                🖼️ Attach File
            </label>
            <input
                type="file"
                id="file-upload"
                style={{ display: 'none' }} // Hide the input element
                onChange={handleFileChange}
            />
            {fileName && <p>Selected File: {fileName}</p>}
        </div>
    );
};

export default AttachmentButton;
