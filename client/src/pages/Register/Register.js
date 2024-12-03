import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Register.css';

const Register = () => {
    const [username, setUsername] = useState('');
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [dob, setDob] = useState('');
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors = {};

        if (!username) newErrors.username = 'Please enter your name';
        if (!studentId) newErrors.studentId = 'Please enter your student ID'; 
        if (!password) {
            newErrors.password = 'Please enter a password';
        } else {
            const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])/;
            if (!passwordRegex.test(password)) {
                newErrors.password = 'Password must contain at least one uppercase letter and one special character';
            }
        }
        if (!email) {
            newErrors.email = 'Please enter your email address';
        } else if (!email.endsWith('@imail.sunway.edu.my')) { // Email domain validation
            newErrors.email = 'Email must end with @imail.sunway.edu.my';
        }
        if (!dob) newErrors.dob = 'Please select your date of birth';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const response = await axios.post('http://127.0.0.1:5000/register', {
                username,
                studentId,
                password,
                email,
                dob,
            });
            setMessage(response.data.message);
            if (response.status === 201) {
                navigate('/otp', { state: { email } }); // Pass email to OTP page
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Registration error');
        }
    };

    const handleLoginClick = () => {
        navigate('/login');
    };

    return (
        <div className="register-page">
            <div className="register-info">
                <h1>Welcome to Sunwave</h1>
                <p>
                    Sunwave is a student community platform at Sunway University. Connect, collaborate, and engage with
                    fellow students. Discover events, join discussions, and contribute to a thriving academic community.
                </p>
                <img
                    src="https://i.imgur.com/vPIbC2V.png" // Replace with a relevant image URL
                    alt="Sunwave Community"
                    className="info-image"
                />
            </div>
            <div className="register-form-container">
                <div className="register-header">
                    <h2>Create New Account</h2>
                    <p>
                        Already Registered?{' '}
                        <span onClick={handleLoginClick} className="login-link">
                            Login
                        </span>
                    </p>
                </div>
                <form onSubmit={handleRegister}>
                    <div className="form-group">
                        <label>Your Name:</label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={`form-control ${errors.username ? 'error' : ''}`}
                        />
                        {errors.username && <p className="error-message">{errors.username}</p>}
                    </div>
                    <div className="form-group">
                        <label>Student ID:</label>
                        <input
                            type="text"
                            placeholder="Enter your student ID"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            className={`form-control ${errors.studentId ? 'error' : ''}`}
                        />
                        {errors.studentId && <p className="error-message">{errors.studentId}</p>}
                    </div>
                    <div className="form-group">
                        <label>Email Address:</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`form-control ${errors.email ? 'error' : ''}`}
                        />
                        {errors.email && <p className="error-message">{errors.email}</p>}
                    </div>
                    <div className="form-group">
                        <label>Password:</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`form-control ${errors.password ? 'error' : ''}`}
                        />
                        {errors.password && <p className="error-message">{errors.password}</p>}
                    </div>
                    <div className="form-group">
                        <label>Date of Birth:</label>
                        <input
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className={`form-control ${errors.dob ? 'error' : ''}`}
                        />
                        {errors.dob && <p className="error-message">{errors.dob}</p>}
                    </div>
                    <button type="submit" className="btn-primary">
                        Sign Up
                    </button>
                    {message && <p className="message">{message}</p>}
                </form>
            </div>
        </div>
    );
};

export default Register;
