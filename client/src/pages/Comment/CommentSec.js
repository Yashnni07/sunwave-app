import React, { useState } from "react";
import "./CommentSec.css"; // Import the CSS for styling

const CommentSec = ({ isOpen, onClose, comments, onAddComment }) => {
  const [newComment, setNewComment] = useState("");

  if (!isOpen) return null;

  const handleAddComment = () => {
    if (newComment.trim() === "") return;
    onAddComment({
      user: "Username", // Replace with dynamic user data
      studentId: "Student_ID", // Replace with dynamic student data
      content: newComment,
    });
    setNewComment(""); // Clear input
  };

  return (
    <div className="comment-sec-overlay">
      <div className="comment-sec-content">
        {/* Header */}
        <div className="comment-sec-header">
          <h2>Comments</h2>
          <button className="close-btn" onClick={onClose}>
            ✖
          </button>
        </div>

        {/* Comments List */}
        <div className="comment-list">
          {comments.map((comment, index) => (
            <div key={comment.id || index} className="comment-item">
              <div className="comment-header">
                <img
                  src="https://www.pngall.com/wp-content/uploads/5/Profile-PNG-File.png"
                  alt="User Avatar"
                  className="comment-avatar"
                />
                <div>
                  <h4 className="username">{comment.user}</h4>
                  <p className="student-id">{comment.studentId}</p>
                </div>
              </div>
              <p className="comment-content">{comment.content}</p>
            </div>
          ))}
        </div>

        {/* Add Comment */}
        <div className="add-comment-section">
          <textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="comment-input"
          ></textarea>
          <button onClick={handleAddComment} className="add-comment-btn">
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentSec;
