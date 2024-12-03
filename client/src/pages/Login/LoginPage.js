import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginPage.css';

const LoginPage = ({ setUserAuthenticated }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState({ email: '', password: '', general: '' });
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage({ email: '', password: '', general: '' });

        // Basic validation
        if (!email) {
            setMessage((prev) => ({ ...prev, email: 'Please enter your email' }));
        }
        if (!password) {
            setMessage((prev) => ({ ...prev, password: 'Invalid password.' })); // Show "Invalid password." if empty
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/login', {
                email,
                password,
            });

            const data = response.data;

            if (data.success) {
                localStorage.setItem('token', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);

                setUserAuthenticated(true);
                navigate('/forum');
            } else {
                setMessage((prev) => ({ ...prev, general: data.message || 'Login failed. Please verify your account.' }));
            }
        } catch (error) {
            setMessage((prev) => ({ ...prev, general: 'Invalid email or password. Please try again.' }));
        }
    };

    const handleSignUpClick = () => {
        navigate('/');
    };

    return (
        <div className="login-container">
            <img src="https://i.imgur.com/vPIbC2V.png" alt="Logo" className="login-logo" /> {/* Replace with actual logo URL */}
            <h2>Login</h2>
            <p>Sign in to continue</p>
            <form onSubmit={handleLogin}>
                <div className="form-group">
                    <label>Email:</label>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    {message.email && <p className="error-message">{message.email}</p>}
                </div>

                <div className="form-group">
                    <label>Password:</label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {message.password && <p className="error-message">{message.password}</p>}
                </div>

                <button type="submit" className="login-button">Log In</button>
                {message.general && <p className="error-message general-message">{message.general}</p>}
            </form>
            <p>
                Don't have an account yet?{' '}
                <span onClick={handleSignUpClick} className="signup-link">Sign up</span>
            </p>
        </div>
    );
};

export default LoginPage;
