import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './OtpPage.css';

const OtpPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email; // Extract email passed from navigation state

    const [otp, setOtp] = useState(['', '', '', '']);
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(30);
    const [isResendDisabled, setIsResendDisabled] = useState(true);

    // Debugging: Log email to ensure it's correctly passed
    useEffect(() => {
        console.log('Email passed to OtpPage:', email);
        if (!email) {
            setMessage('Email is missing. Please restart the registration process.');
        }
    }, [email]);

    const handleOtpChange = (value, index) => {
        if (!/^\d*$/.test(value)) return; // Only allow numeric input

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Automatically move to the next input if value is entered
        if (value && index < otp.length - 1) {
            document.getElementById(`otp-input-${index + 1}`).focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpCode = otp.join('');

        if (otpCode.length !== 4) {
            setMessage('Please enter a 4-digit code.');
            return;
        }

        try {
            console.log('Sending email and OTP:', { email, otp: otpCode });
            const response = await axios.post('http://localhost:5000/verify-otp', { email, otp: otpCode });
            if (response.data.message === 'Account has been created and verified') {
                setMessage('Verification successful!');
                navigate('/login');
            } else {
                setMessage(response.data.message);
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error during verification');
        }
    };

    const handleResendOtp = async () => {
        setIsResendDisabled(true);
        setCountdown(10);

        try {
            const response = await axios.post('http://localhost:5000/resend-otp', { email });
            setMessage(response.data.message);
        } catch (error) {
            setMessage('Failed to resend OTP');
        }
    };

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setIsResendDisabled(false);
        }
    }, [countdown]);

    return (
        <div className="otp-container">
            <h2>OTP Verification</h2>
            <img src="https://uxwing.com/wp-content/themes/uxwing/download/communication-chat-call/otp-icon.png" alt="OTP Icon" className="otp-icon" />
            <p><strong>Please check your email</strong></p>
            <p>Enter the code you received on your email.</p>
            {email ? (
                <form onSubmit={handleSubmit}>
                    <div className="otp-input-container">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                id={`otp-input-${index}`}
                                type="text"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleOtpChange(e.target.value, index)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Backspace' && index > 0 && !otp[index]) {
                                        document.getElementById(`otp-input-${index - 1}`).focus();
                                    }
                                }}
                            />
                        ))}
                    </div>
                    <button 
                        type="submit" 
                        className="verify-button" 
                        style={{ backgroundColor: '#FF6F00', color: '#fff' }}
                    >
                        Verify code
                    </button>
                    {message && <p className="message">{message}</p>}
                </form>
            ) : (
                <p className="error-message">Email is missing. Please restart the registration process.</p>
            )}
            <div className="resend-container">
                <button onClick={handleResendOtp} disabled={isResendDisabled}>
                    Resend code
                </button>
                {isResendDisabled && <span> in {countdown} seconds</span>}
            </div>
        </div>
    );
};

export default OtpPage;
