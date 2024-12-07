import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './SavedPostPage.css';

const SavedPostPage = () => {
    const [savedPosts, setSavedPosts] = useState([]);
    const [loading, setLoading] = useState(false);  // Add loading state for removal

    // Fetch saved posts
    const fetchSavedPosts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/saved-posts', {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('Fetched saved posts:', response.data.savedPosts); // Debug log
            setSavedPosts(response.data.savedPosts || []); // Ensure fallback to an empty array
        } catch (error) {
            console.error('Error fetching saved posts:', error);
            setSavedPosts([]); // Clear the saved posts on error
        }
    };

    useEffect(() => {
        fetchSavedPosts();
    }, []);

    const navigateToForumPost = (postId) => {
        const forumUrl = `/forum?postId=${postId}`;
        window.location.href = forumUrl;
    };

    const removeSavedPost = async (postId) => {
        setLoading(true); // Set loading to true before making the request
        try {
            const response = await fetch('http://localhost:5000/api/remove-saved-post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ postId }),
            });
    
            const data = await response.json();
            if (response.ok) {
                alert('Post removed successfully!');
                // After removing, re-fetch saved posts to update the UI
                fetchSavedPosts(); // Re-fetch saved posts from the server
            } else {
                alert(data.message || 'Error removing post.');
            }
        } catch (error) {
            console.error('Error removing saved post:', error);
            alert('Error removing post.');
        } finally {
            setLoading(false); // Set loading to false after request completes
        }
    };    

    return (
        <div className="saved-posts-container">
            <h2>Saved Posts</h2>
            <table className="saved-posts-table">
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Image</th>
                        <th>Creator</th>
                        <th>Remove</th>
                    </tr>
                </thead>
                <tbody>
                    {savedPosts.length > 0 ? (
                        savedPosts.map((post, index) => (
                            <tr key={post._id}>
                                {/* Post Number */}
                                <td>{index + 1}</td>

                                {/* Post Title with Link */}
                                <td>
                                    <a
                                        href={`/forum?postId=${post._id}`}
                                        className="post-title-link"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigateToForumPost(post._id); // Scrolls to the post in the forum page
                                        }}
                                    >
                                        {post.title}
                                    </a>
                                </td>

                                {/* Post Content */}
                                <td>{post.content}</td>

                                {/* Post Image */}
                                <td>
                                    <img
                                        src={post.image}
                                        alt={post.title}
                                        className="post-image"
                                    />
                                </td>

                                {/* Username and Student ID */}
                                <td>{post.username} ({post.studentId})</td>

                                {/* Remove Saved Post */}
                                <td>
                                    <button
                                        onClick={() => removeSavedPost(post._id)}
                                        className="remove-post-button"
                                        disabled={loading}  // Disable button when loading
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="6">No saved posts yet.</td>
                        </tr>
                    )}
                </tbody>
            </table>
            {loading && <p>Removing post... Please wait.</p>} {/* Loading message */}
        </div>
    );
};

export default SavedPostPage;
