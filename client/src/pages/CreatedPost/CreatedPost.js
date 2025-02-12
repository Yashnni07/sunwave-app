import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CreatedPost.css';
import { toast } from 'react-toastify';

const CreatedPost = () => {
    const [userPosts, setUserPosts] = useState([]);
    const [editPost, setEditPost] = useState(null);
    const [updatedPost, setUpdatedPost] = useState({ title: '', content: '' });
    const [loading, setLoading] = useState(false); // Add loading state

    const fetchUserPosts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/user-posts', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUserPosts(response.data);
        } catch (error) {
            console.error('Error fetching user posts:', error);
        }
    };

    const handleEdit = (post) => {
        setEditPost(post);
        setUpdatedPost({ title: post.title, content: post.content });
    };

    const handleUpdate = async () => {
        try {
            const token = localStorage.getItem('token'); // Ensure token is defined
    
            setLoading(true);  // Show loading spinner
            
            // Optimistic UI Update - Update the post in the local state immediately
            setUserPosts((prevPosts) =>
                prevPosts.map((post) =>
                    post._id === editPost._id ? { ...post, ...updatedPost } : post
                )
            );
    
            // Send the update request to the backend
            await axios.put(`http://localhost:5000/api/posts/${editPost._id}`, updatedPost, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            setLoading(false); // Hide loading spinner
            setEditPost(null); // Reset the edit post state
    
            alert('Post updated successfully!');
    
            fetchUserPosts();  // Refetch posts from the backend if necessary
        } catch (error) {
            setLoading(false); // Hide loading spinner
            console.error('Error updating post:', error);
            alert('There was an error updating the post. Please try again later.');
        }
    };

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('token');
            
            // Optimistically remove the post from the UI
            setUserPosts((prevPosts) => prevPosts.filter((post) => post._id !== id));
    
            // Send the delete request to the backend
            await axios.delete(`http://localhost:5000/api/posts/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
    
            toast.success('Post deleted successfully!');
    
            fetchUserPosts();  // Optionally, refetch posts from the backend if necessary
        } catch (error) {
            console.error('Error deleting post:', error);
            toast.error('There was an error deleting the post. Please try again later.');
        }
    };

    useEffect(() => {
        fetchUserPosts();
    }, []);

    return (
        <div className="created-posts-container">
            <div className="myprofile-header">
                <div className="myprofile-info">
                    <img
                        src="https://cdn-icons-png.flaticon.com/512/8089/8089875.png"
                        alt="Profile"
                        className="myprofile-icon"
                    />
                    <div className="myprofile-text">
                        <h1 className="myusername">Welcome!</h1>
                        <p className="myuser-role">Manage your posts easily here.</p>
                    </div>
                </div>
            </div>
            <h2>Created Posts</h2>
            <table className="post-table">
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>Post Title</th>
                        <th>Image</th>
                        <th>Date Created</th>
                        <th>Edit</th>
                        <th>Remove</th>
                    </tr>
                </thead>
                <tbody>
                    {userPosts.length > 0 ? (
                        userPosts.map((post, index) => (
                            <tr key={post._id}>
                                <td>{index + 1}</td>
                                <td>{post.title}</td>
                                <td>
                                    {post.image ? (
                                        <img src={post.image} alt="Post" className="post-image" />
                                    ) : (
                                        'No Image'
                                    )}
                                </td>
                                <td>
                                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </td>
                                <td>
                                    <button
                                        className="edit-button"
                                        onClick={() => handleEdit(post)}
                                    >
                                        ✏️
                                    </button>
                                </td>
                                <td>
                                    <button
                                        className="delete-button"
                                        onClick={() => handleDelete(post._id)}
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="6">No posts found.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {editPost && (
                <div className="edit-popup">
                    <h3>Edit Post</h3>
                    <input
                        type="text"
                        value={updatedPost.title}
                        onChange={(e) => setUpdatedPost({ ...updatedPost, title: e.target.value })}
                    />
                    <textarea
                        value={updatedPost.content}
                        onChange={(e) =>
                            setUpdatedPost({ ...updatedPost, content: e.target.value })
                        }
                    ></textarea>
                    <button onClick={handleUpdate} disabled={loading}>
                        {loading ? 'Updating...' : 'Update'}
                    </button>
                    <button onClick={() => setEditPost(null)}>Cancel</button>
                </div>
            )}
        </div>
    );
};

export default CreatedPost;
