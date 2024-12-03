import React, { useState } from 'react';

const PostWithAttachment = ({ onSubmit }) => {
    const [postContent, setPostContent] = useState(''); // Stores the user's text input
    const [uploadedImage, setUploadedImage] = useState(null); // Stores the uploaded image data (base64)

    // Handle file upload
    const handleFileChange = (event) => {
        const file = event.target.files[0]; // Get the selected file
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setUploadedImage(e.target.result); // Convert the file to base64
            reader.readAsDataURL(file); // Trigger the reader to load the file
        }
    };

    // Handle post submission
    const handleSubmit = () => {
        const postData = {
            content: postContent, // User's text input
            image: uploadedImage, // Base64 image string (if uploaded)
        };
        onSubmit(postData); // Call the onSubmit prop with the post data
        setPostContent(''); // Clear the text input
        setUploadedImage(null); // Clear the uploaded image
    };

    return (
        <div className="post-with-attachment">
            {/* Textarea for Post Content */}
            <textarea
                placeholder="Write your post here..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                style={{
                    width: '95%',
                    height: '100px',
                    marginBottom: '10px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '2px solid #ccc',
                }}
            />

            {/* Display Uploaded Image Preview */}
            {uploadedImage && (
                <div style={{ marginBottom: '10px' }}>
                    <img
                        src={uploadedImage}
                        alt="Uploaded Preview"
                        style={{ maxWidth: '100%', borderRadius: '8px' }}
                    />
                </div>
            )}

            <div style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center"
            }}>
                {/* Attachment Button */}
                <label
                    htmlFor="file-upload"
                    style={{
                        display: 'inline-block',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        padding: '10px 15px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                    }}
                >
                    Attach Image
                </label>
                <input
                    type="file"
                    id="file-upload"
                    style={{ display: 'none' }} // Hide the default file input
                    onChange={handleFileChange}
                />
                {/* Submit Button */}
            <button
                onClick={handleSubmit}
                style={{
                    backgroundColor: '#28a745',
                    color: '#fff',
                    padding: '10px 15px',
                    marginRight: '20px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    alignItems: ''
                }}
            >
                Post
            </button>
            </div>
        </div>
    );
};

export default PostWithAttachment;
