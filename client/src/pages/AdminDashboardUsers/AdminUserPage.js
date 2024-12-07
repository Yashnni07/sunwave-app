import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminUserPage.css';

const AdminUserPage = () => {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');

  // Fetch users from the backend on page load
  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/users');
            console.log('Fetched Users:', response.data); // Debugging
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error.response?.data || error.message);
            setMessage('Failed to load users.');
        }
    };

    fetchUsers();
}, []);

  // Handle changing a user's role
  const handleChangeRole = async (id, newRole) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/users/${id}`, {
        role: newRole, // Send only the updated role
      });

      // Update the local state after successful role change
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.email === id ? { ...user, role: response.data.updatedUser.role } : user
        )
      );
      setMessage(`Role updated successfully for User ID: ${id}`);
    } catch (error) {
      console.error('Error updating role:', error);
      setMessage(`Failed to update role for User ID: ${id}`);
    }
  };

  return (
    <div className="content-wrapper">
      {/* Admin Header */}
      <div className="admin-header">
        <div className="header-content">
          <div className="admin-avatar">
            <img
              src="admin_icon.png"
              alt="Admin"
              className="avatar-image"
            />
          </div>
          <h2 className="admin-title">ADMIN</h2>
        </div>
      </div>

      <h3 className="table-title">Admin User Page</h3>

      {/* User Table */}
      <table className="user-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Username</th>
            <th>Student ID</th>
            <th>Email</th>
            <th>Program</th>
            <th>Intake</th>
            <th>Role</th>
            <th>Change Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.email}>
              <td>{index + 1}</td>
              <td>{user.username || 'N/A'}</td>
              <td>{user.studentId || 'N/A'}</td>
              <td>{user.email || 'N/A'}</td>
              <td>{user.program || 'N/A'}</td>
              <td>{user.intake || 'N/A'}</td>
              <td>{user.role || 'User'}</td>
              <td>
                <select
                  className="role-dropdown"
                  onChange={(e) => handleChangeRole(user.email, e.target.value)}
                  value={user.role}
                >
                  <option value="User">User</option>
                  <option value="Moderator">Moderator</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Message Display */}
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default AdminUserPage;
