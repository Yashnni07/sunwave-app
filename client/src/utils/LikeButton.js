import React, { useState } from 'react';

const LikeButton = () => {
    const [isLiked, setIsLiked] = useState(false); // Track the like state

    const handleLike = () => {
        setIsLiked(!isLiked); // Toggle like/unlike state
        console.log(isLiked ? "Liked!" : "Unliked!"); // Log the action
    };

    return (
        <button
            onClick={handleLike}
            style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                outline: "none",
            }}
        >
            <img
                src={
                    isLiked
                        ? "https://th.bing.com/th/id/OIP.20_KwfKl-7HXs3iKE4xr0AHaHa?rs=1&pid=ImgDetMain"
                        : "https://th.bing.com/th/id/OIP.CUp_ZAgqa7D87MgVjZCKRAHaHa?w=178&h=180&c=7&r=0&o=5&dpr=1.3&pid=1.7"
                }
                alt={isLiked ? "Like" : "Unlike"}
                style={{ width: "25px", height: "25px" }} // Adjust image size
            />
        </button>
    );
};

export default LikeButton;
