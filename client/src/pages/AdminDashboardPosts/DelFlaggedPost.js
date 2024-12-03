import React, { useState, useEffect } from "react";
import axios from "axios";
import "./DelFlaggedPost.css";

const DelFlaggedPost = () => {
  const [flaggedPosts, setFlaggedPosts] = useState([]); // Posts fetched from backend
  const [message, setMessage] = useState(""); // Success/Error messages

  // Fetch flagged posts on page load
  useEffect(() => {
    const fetchFlaggedPosts = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/flagged-posts", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setFlaggedPosts(response.data);
      } catch (error) {
        console.error("Error fetching flagged posts:", error);
      }
    };

    fetchFlaggedPosts();
  }, []);

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      // Update local state to remove the deleted post
      setFlaggedPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
      setMessage("Post deleted successfully.");

      // Clear the message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error deleting post:", error);
      setMessage("Failed to delete post.");

      // Clear the error message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="del-flagged-posts-page">
      <h1 className="h1style">Flagged Posts 🚩</h1>
      {message && <div className="notification">{message}</div>}

      {flaggedPosts.length === 0 ? (
        <div className="no-flagged-posts">No flagged posts.</div>
      ) : (
        <table className="flagged-posts-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Title</th>
              <th>Description</th>
              <th>Image</th>
              <th>Creator</th>
              <th>Flags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {flaggedPosts.map((post, index) => (
              <tr key={post._id}>
                <td>{index + 1}</td>
                <td>{post.title}</td>
                <td>{post.content}</td>
                <td>
                  <img
                    src={post.image}
                    alt={post.title}
                    className="post-image"
                  />
                </td>
                <td>
                  {post.username} ({post.studentId})
                </td>
                <td>{post.flagCount}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(post._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DelFlaggedPost;
