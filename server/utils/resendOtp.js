const sendOtp = require('./sendOtp');
const nano = require('nano')('http://admin:admin@localhost:5984'); // Use your actual CouchDB credentials
const usersDb = nano.use('users'); // Replace with your database name

const resendOtp = async (previousOtp) => {
    try {
        // Find the user document based on the previous OTP
        const userDoc = await usersDb.find({ selector: { otp: previousOtp } });
        if (userDoc.docs.length === 0) {
            console.log('User not found with the provided OTP');
            throw new Error('User not found');
        }

        const user = userDoc.docs[0];
        const email = user.email; // Extract the email from the record
        if (!email) {
            console.error('No email associated with the user document');
            return { success: false, message: 'No email associated with this user' };
        }

        // Generate a new OTP
        const newOtp = Math.floor(1000 + Math.random() * 9000);

        // Update the user's OTP field with the new OTP
        user.otp = newOtp;

        // Save the updated document to CouchDB
        const updateResponse = await usersDb.insert({
            ...user,
            _rev: user._rev, // Required for CouchDB document update
        });

        console.log('OTP updated successfully in the database:', updateResponse);

        // Send the new OTP to the email found in the document
        console.log(`Attempting to send OTP to ${email} with new OTP ${newOtp}`);
        await sendOtp(email, newOtp);
        console.log(`New OTP ${newOtp} has been sent to ${email}`);
        
        return { success: true, message: 'New OTP sent successfully' };
    } catch (error) {
        console.error('Error in resendOtp function:', error);
        return { success: false, message: 'Failed to resend OTP' };
    }
};

module.exports = resendOtp;
