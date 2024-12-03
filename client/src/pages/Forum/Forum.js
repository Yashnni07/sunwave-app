import React, { useEffect, useState } from "react";
import "./Forum.css";
import axios from "axios";
import { useLocation } from "react-router-dom";

const ForumPage = () => {
  const [posts, setPosts] = useState([]); // Initialize as an empty array
  const location = useLocation(); // React hook to get the query parameter
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    image: null,
    preview: null,
  });
  const [user, setUser] = useState({ username: "", email: "", studentId: "" });
  const [comment, setComment] = useState("");
  const [toggleComments, setToggleComments] = useState({}); // Track toggle state for each post
  const [imageError, setImageError] = useState(""); // Manage image validation errors
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState({});

  // Function to fetch posts from the server
  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem("token");

      // Fetch posts
      const postsResponse = await axios.get("http://localhost:5000/posts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Fetched posts:", postsResponse.data); // Debug the response
      setPosts(postsResponse.data || []); // Ensure fallback to an empty array if response is undefined
    } catch (error) {
      console.error("Error fetching posts:", error);
      setPosts([]); // Set to an empty array in case of error
    }
  };

  useEffect(() => {
    const fetchUserAndPosts = async () => {
      try {
        const token = localStorage.getItem("token");
  
        // Fetch user details
        const userResponse = await axios.get(
          "http://localhost:5000/validate-token",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
  
        setUser(userResponse.data.user);
  
        // Fetch posts
        await fetchPosts();
  
        // Scroll to postId if provided
        const queryParams = new URLSearchParams(window.location.search);
        const postId = queryParams.get("postId"); // Get the postId from query params
        if (postId) {
          setTimeout(() => {
            const postElement = document.getElementById(postId);
            if (postElement) {
              postElement.scrollIntoView({ behavior: "smooth" });
            }
          }, 500); // Delay to ensure posts are rendered
        }
      } catch (error) {
        console.error("Error fetching user or posts:", error);
      }
    };
  
    fetchUserAndPosts();
  }, []);
  
  const isValidImageUrl = async (url) => {
    if (!/^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg))$/i.test(url)) {
      return false;
    }
    try {
      const response = await fetch(url, { method: "HEAD" });
      return (
        response.ok && response.headers.get("content-type").startsWith("image/")
      );
    } catch {
      return false;
    }
  };

  const savePost = async (postId) => {
    try {
      const response = await fetch("http://localhost:5000/api/save-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ postId }),
      });
  
      const data = await response.json();
      if (response.ok) {
        alert("Post saved successfully!");
      } else {
        alert(data.message || "Error saving post.");
      }
    } catch (error) {
      console.error("Error saving post:", error);
      alert("Error saving post.");
    }
  };
  
  // Assign ID to each post for scrolling
const renderPosts = () =>
  posts.map((post) => (
    <div className="forum-post" key={post._id} id={post._id}>
      <h3>{post.title || "No Title"}</h3>
      <p>{post.content || "No Content"}</p>
      {post.image && <img src={post.image} alt="Post" />}
      <div className="post-meta">
        Posted by {post.username || "Unknown"} ({post.studentId || "N/A"}) on{" "}
        {post.createdAt
          ? `${new Date(post.createdAt).toLocaleDateString()} at ${new Date(
              post.createdAt
            ).toLocaleTimeString()}`
          : "Unknown Date"}
      </div>
      <button onClick={() => savePost(post._id)}>Save Post</button>
    </div>
  ));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewPost({ ...newPost, [name]: value });
  };

  const handleToggleComments = (postId) => {
    setToggleComments((prevState) => ({
      ...prevState,
      [postId]: !prevState[postId],
    }));
  };

  let imageValidationTimeout;

  const handleImageChange = async (e) => {
    const { name, value } = e.target;
    setNewPost({ ...newPost, [name]: value });
    setImageLoaded(false);
    setImageError("");

    if (name === "image" && value) {
      const isValid = isValidImageUrl(value);
      if (isValid) {
        try {
          const response = await fetch(value, { method: "HEAD" });
          if (
            response.ok &&
            response.headers.get("content-type").startsWith("image/")
          ) {
            setImageError("");
            setImageLoaded(true);
          } else {
            setImageError("Invalid image URL.");
            setImageLoaded(false);
          }
        } catch {
          setImageError("Invalid image URL.");
          setImageLoaded(false);
        }
      } else {
        setImageError("Please enter a valid image URL.");
        setImageLoaded(false);
      }
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (query === "") {
      setFilteredPosts(posts);
    } else {
      const filtered = posts.filter((post) =>
        post.title?.toLowerCase().includes(query)
      );
      setFilteredPosts(filtered);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const postData = {
      title: newPost.title,
      content: newPost.content,
      image: newPost.image,
      username: user.username,
      email: user.email,
      studentId: user.studentId, // Include studentId here
    };

    console.log("Post Data:", postData); // Debugging log

    try {
      const response = await axios.post(
        "http://localhost:5000/posts",
        postData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Created post:", response.data); // Debugging log
      setPosts((prevPosts) => [response.data, ...prevPosts]);
      setNewPost({ title: "", content: "", image: null }); // Reset the post form
      setImageLoaded(false); // Reset image loaded state
    } catch (error) {
      console.error(
        "Error creating post:",
        error.response?.data || error.message
      );
    }
  };

  const handleCommentChange = (e) => {
    setComment(e.target.value);
  };

  const addComment = async (postId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://localhost:5000/posts/${postId}/comments`,
        {
          text: comment,
          username: user.username,
          email: user.email,
          studentId: user.studentId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComment(""); // Clear the comment input
      await fetchPosts(); // Refresh posts dynamically
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const flagPost = async (postId) => {
    try {
      const response = await axios.post(
        "http://localhost:5000/api/flag-post",
        { postId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
  
      if (response.data.message === "Post already flagged by this user") {
        alert("You have already flagged this post.");
      } else {
        alert("Post flagged successfully.");
      }
    } catch (error) {
      console.error("Error flagging post:", error);
      alert("Failed to flag post.");
    }
  };
  
  return (
    <div className="forum-page">
      {/* Statistics Section */}
      <div className="forum-statistics">
        <div className="stat-item">
          <img
            src="https://cdn-icons-png.flaticon.com/512/12460/12460233.png" // Placeholder for icon
            alt="Thanks List"
            className="stat-icon"
          />
          <p className="stat-number">52</p>
          <p className="stat-label">Thanks List</p>
        </div>
        <div className="stat-item">
          <img
            src="https://cdn-icons-png.flaticon.com/512/7245/7245434.png" // Placeholder for icon
            alt="Total Posts"
            className="stat-icon"
          />
          <p className="stat-number">114</p>
          <p className="stat-label">Total Posts</p>
        </div>
        <div className="stat-item">
          <img
            src="https://cdn-icons-png.flaticon.com/512/2885/2885455.png" // Placeholder for icon
            alt="Online Users"
            className="stat-icon"
          />
          <p className="stat-number">25</p>
          <p className="stat-label">Online Users</p>
        </div>
      </div>
  
      <div className="forum-container">
        {/* Main Forum Section */}
        <div className="forum-content">
          {/* Forum Header */}
          <div className="forum-header">
            <h1>Sunwave Community Forum</h1>
            <p className="subtitle">All things community and engagement</p>
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search the Community..."
                value={searchQuery}
                onChange={handleSearch}
              />
              <button type="button">🔍</button>
            </div>
          </div>
  
          {/* Post Form */}
          <div className="post-form">
            <h2>Create a New Post</h2>
            <form onSubmit={handlePostSubmit}>
              <input
                type="text"
                name="title"
                placeholder="Post Title"
                value={newPost.title}
                onChange={handleChange}
                required
              />
              <textarea
                name="content"
                placeholder="Write your post here..."
                value={newPost.content}
                onChange={handleChange}
                required
              ></textarea>
              <input
                type="text"
                name="image"
                placeholder="Enter image URL"
                value={newPost.image || ""}
                onChange={handleImageChange}
                required
              />
              {imageError && <p className="error-message">{imageError}</p>}
              {newPost.image && imageLoaded && (
                <img
                  src={newPost.image}
                  alt="Preview"
                  className="image-preview"
                  onLoad={() => setImageError("")}
                  onError={() => {
                    setImageError("Invalid image URL.");
                    setImageLoaded(false);
                  }}
                />
              )}
              <button type="submit" disabled={!imageLoaded || !!imageError}>
                Post
              </button>
            </form>
          </div>
  
          {/* Forum Posts */}
          <div className="forum-posts">
            {Array.isArray(posts) && posts.length > 0 ? (
              posts.map((post) => (
                <div
                  className="forum-post"
                  key={post._id}
                  id={post._id} // Add the id to allow scrolling to this specific post
                >
                  <div className="post-header">
                    <div className="user-info">
                      <img
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQsCUNme8Tni4rSleVEs1VRLD29XPfLFv_LYA&s" // Replace with a dynamic or default user icon URL
                        alt="User Icon"
                        className="user-profile-icon"
                      />
                      <div className="user-details">
                        <p className="username">{post.username || "Unknown"}</p>
                        <p className="student-id">{post.studentId || "N/A"}</p>
                      </div>
                    </div>
                    <div className="post-info">
                      <h3>{post.title || "No Title"}</h3>
                      <p>{post.content || "No Content"}</p>
                      <div className="post-meta">
                        Posted on{" "}
                        {post.createdAt
                          ? `${new Date(post.createdAt).toLocaleDateString()} at ${new Date(
                              post.createdAt
                            ).toLocaleTimeString()}`
                          : "Unknown Date"}
                      </div>
                    </div>
                    {/* Ellipsis Button and Dropdown */}
                    <div className="ellipsis-button-container">
                      <img
                        src="https://png.pngtree.com/png-clipart/20230923/original/pngtree-ellipsis-menu-black-glyph-ui-icon-option-ux-web-vector-png-image_12837672.png"
                        alt="Options"
                        className="ellipsis-button"
                      />
                      <div className="dropdown-menu">
                        <button
                          className="dropdown-item-forum"
                          onClick={() => flagPost(post._id)}>Flag Post</button>
                      </div>
                    </div>
                  </div>
                  {post.image && <img src={post.image} alt="Post" />}
                  <div className="post-actions">
                    <button>
                      <img
                        src="https://cdn-icons-png.flaticon.com/256/1077/1077035.png"
                        alt="Like"
                        className="action-icon"
                      />
                    </button>
                    <button onClick={() => handleToggleComments(post._id)}>
                      <img
                        src="https://icons.veryicon.com/png/o/hardware/jackdizhu_pc/comment-25.png"
                        alt="Comments"
                        className="action-icon"
                      />
                    </button>
                    <button onClick={() => savePost(post._id)}>
                      <img
                        src="https://cdn-icons-png.flaticon.com/512/2956/2956783.png"
                        alt="Save"
                        className="action-icon"
                      />
                    </button>
                  </div>
                  {toggleComments[post._id] && (
                    <div className="comment-section">
                      {Array.isArray(post.comments) && post.comments.length > 0 ? (
                        post.comments.map((comment, index) => (
                          <div className="comment" key={index}>
                            <strong>
                              {comment.username || "Anonymous"} ({comment.studentId || "N/A"}):
                            </strong>{" "}
                            {comment.text}
                          </div>
                        ))
                      ) : (
                        <p>No comments yet. Be the first to comment!</p>
                      )}
                      <textarea
                        placeholder="Write a comment..."
                        value={comment}
                        onChange={handleCommentChange}
                      ></textarea>
                      <button onClick={() => addComment(post._id)}>Post Comment</button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="subtitle">No posts available. Be the first to create one!</p>
            )}
          </div>
        </div>
  
        {/* Sidebar Section */}
        <div className="forum-sidebar">
          <div className="top-contributors">
            <h3>Top Contributors</h3>
            <p>People who started the most discussions on Sunwave.</p>
            <ul>
              {[
                { name: "Yashnni", comments: 29, img: "https://media.licdn.com/dms/image/v2/D5603AQG02GFYS6rj_w/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1697546543167?e=2147483647&v=beta&t=oBi3s7rifGonkhg7S7rIWa2uDZ_Y17X6vzBg44gRJPo" },
                { name: "Suhail", comments: 25, img: "https://media.licdn.com/dms/image/v2/D5603AQHVrKJTGKuEOA/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1697465952355?e=2147483647&v=beta&t=CEfddohX0YoJ_psWZGinCuASsLZuyeie_GSWrEDUbYg" },
                { name: "Yitian", comments: 21, img: "https://media.licdn.com/dms/image/v2/D5603AQHfG_l2X01ubA/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1671621510894?e=2147483647&v=beta&t=vTzdnpALq2z6pC_CIsUbUy_tE3iIVhZN-VJpVWTGzyI" },
                { name: "Ci Jie", comments: 18, img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-mi5HWjB5l06q6mBM7mO8JP7YQRcYklb4Ww&s" },
                { name: "Charlie", comments: 15, img: "https://i.imgur.com/U9SqtE4.png" },
              ].map((contributor, index) => (
                <li key={index} className="contributor-item">
                  <img src={contributor.img} alt={contributor.name} className="contributor-avatar" />
                  <span className="contributor-name">{contributor.name}</span>
                  <span className="contributor-comments">
                    <img
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_dg5yzGvpiKP0PshPlwNXijc6kFhmRNEbmw&s" // Placeholder comment icon
                      alt="Comments"
                      className="comment-icon"
                    />
                    {contributor.comments}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );  
};

export default ForumPage;
