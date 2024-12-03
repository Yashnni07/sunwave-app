const nodemailer = require('nodemailer');

const sendOtp = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'csdummy2000@gmail.com',
            pass: 'ieblwxclvhnaxpdp',
        },
    });

    const mailOptions = {
        from: 'csdummy2000@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP ${otp} sent to email ${email}`);
    } catch (error) {
        console.error('Failed to send OTP:', error);
        throw error; // Re-throw error to be caught in /resend-otp route
    }
};

module.exports = sendOtp;
