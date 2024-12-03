import React, { useState } from 'react';

const SaveButton = () => {
    const [isSaved, setIsSaved] = useState(false); // Track the save state

    const handleSave = () => {
        setIsSaved(!isSaved); // Toggle Save/unsave state
        console.log(isSaved ? "Save!" : "Unsaved!"); // Log the action
    };

    return (
        <button
            onClick={handleSave}
            style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                outline: "none",
            }}
        >
            <img
                src={
                    isSaved
                        ? "https://creazilla-store.fra1.digitaloceanspaces.com/icons/3217549/bookmark-icon-md.png"
                        : "https://th.bing.com/th?id=OIP.gHL_r4NyrG7P8tGxNbnNHAHaHa&w=250&h=250&c=8&rs=1&qlt=90&o=6&dpr=1.3&pid=3.1&rm=2"
                }
                alt={isSaved ? "Save" : "Unsave"}
                style={{ width: "25px", height: "25px" }}
            />
        </button>
    );
};

export default SaveButton;
