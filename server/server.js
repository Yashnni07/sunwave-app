require('dotenv').config(); // Load environment variables from .env file
const path = require('path');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const fs = require('fs').promises;
const grpc = require('@grpc/grpc-js');
const util = require('util');
const { TextDecoder } = require('util'); // Import TextDecoder to handle Uint8Array decoding
const { exec } = require('child_process');
const crypto = require('crypto'); // Import the crypto module
const execPromise = util.promisify(exec);
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sendOtp = require("./utils/sendOtp");
const resendOtp = require("./utils/resendOtp");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const JWT_SECRET =
  "7b581a59e37875d58a325ac890e7b7ed4aad71e2435a472efd029477b6f2fe1f2d30248ac0fa9da257eeea01784c70b64f6ae550f3aeec584869482dc6a3dd4c"; // Replace with a secure secret
const JWT_REFRESH_SECRET =
  "92862a9cf37f3429b8526ef86f6b6a5639c597ae550a1f5be438a0f61d6e54eba007fa132412ac122adf73d1f1a7c7638d497420abef7071ecdd6ab7208e6156"; // New secret key for refresh tokens
const app = express();
app.use(bodyParser.json());
app.use(cors());
const PORT = 5000;

// Hyperledger Fabric setup remains unchanged
const mspId = 'Org1MSP';
const channelName = 'mychannel';
const chaincodeName = 'student';
const peerEndpoint = 'localhost:7051';
const gatewayPeer = 'peer0.org1.example.com';
const tlsCertPath = path.resolve(__dirname, '..', 'first-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'tlsca', 'tlsca.org1.example.com-cert.pem');
const certPath = path.resolve(__dirname, '..', 'first-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'users', 'Admin@org1.example.com', 'msp', 'signcerts', 'cert.pem');
const keyDirectoryPath = path.resolve(__dirname, '..', 'first-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'users', 'Admin@org1.example.com', 'msp', 'keystore');

let contract;
const otps = {}; // Store OTPs temporarily

// Rest of your Fabric setup
async function newIdentity() {
    try {
        const credentials = await fs.readFile(certPath);
        return {
            mspId,
            credentials,
        };
    } catch (error) {
        console.error(`Failed to read identity file: ${error.message}`);
        return null;
    }
}

async function newSigner() {
    try {
        const files = await fs.readdir(keyDirectoryPath);
        if (files.length === 0) {
            throw new Error('No key files found');
        }
        const keyPath = path.resolve(keyDirectoryPath, files[0]);
        const privateKeyPem = await fs.readFile(keyPath);
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        return signers.newPrivateKeySigner(privateKey);
    } catch (error) {
        console.error(`Failed to create signer: ${error.message}`);
        return null;
    }
}

async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);

    const keyFiles = await fs.readdir(keyDirectoryPath);
    if (keyFiles.length === 0) {
        throw new Error('No key files found in keystore');
    }
    const clientKeyPath = path.resolve(keyDirectoryPath, keyFiles[0]);
    const clientKey = await fs.readFile(clientKeyPath);
    const clientCert = await fs.readFile(certPath);

    const tlsCredentials = grpc.credentials.createSsl(
        tlsRootCert,   // Root certificates for server verification
        clientKey,     // Client's private key
        clientCert     // Client's certificate
    );

    const options = {
        'grpc.ssl_target_name_override': gatewayPeer,
        'grpc.default_authority': gatewayPeer,
    };

    const client = new grpc.Client(peerEndpoint, tlsCredentials, options);

    return client;
}

let adminGateway;

async function setupAdminGateway() {
    const identity = await newIdentity(); // Admin identity
    const signer = await newSigner();
    const client = await newGrpcConnection();

    adminGateway = connect({
        identity,
        signer,
        client,
        evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
        endorseOptions: () => ({ deadline: Date.now() + 15000 }),
        submitOptions: () => ({ deadline: Date.now() + 5000 }),
        commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
    });

    const network = adminGateway.getNetwork(channelName);
    contract = network.getContract(chaincodeName);

    console.log('Admin gateway initialized.');
}

async function main() {
    try {
        await enrollAdminUser();
        await setupAdminGateway();
        await createDefaultAdmin();


        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });

        process.on('SIGINT', async () => {
            console.log('Shutting down gracefully...');
            await adminGateway.close();
            process.exit(0);
        });
    } catch (error) {
        console.error(`Failed to initialize server: ${error.message}`);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(`Failed to run server: ${error.message}`);
    process.exit(1);
});

// Helper function to get the Docker container name for CA server
async function getDockerContainerName() {
    const { stdout, stderr } = await execPromise('docker ps --filter "name=ca_org1" --format "{{.Names}}"');
    if (stderr) {
        console.error(`Error finding Docker container: ${stderr}`);
        throw new Error(stderr);
    }
    const containerName = stdout.trim();
    if (!containerName) {
        throw new Error('No Docker container found with name containing "ca_org1"');
    }
    return containerName;
}

// Function to enroll the admin user
async function enrollAdminUser() {
    const containerName = await getDockerContainerName();
    const command = `docker exec ${containerName} fabric-ca-client enroll -u https://admin:adminpw@localhost:7054 --caname ca-org1 --tls.certfiles /etc/hyperledger/fabric-ca-server/ca-cert.pem`;

    try {
        const { stdout, stderr } = await execPromise(command);
        if (stderr) {
            console.log(`Admin enrollment messages: ${stderr}`);
        }
        console.log(`Admin enrolled successfully: ${stdout}`);
    } catch (error) {
        console.error(`Failed to enroll admin user: ${error}`);
        throw error;
    }
}
  
// Function to invoke chaincode to create the default admin
async function createDefaultAdmin() {
    try {
        // Encrypt the password before passing it to the smart contract
        const encryptedPassword = await bcrypt.hash('Admin@123', 10);  // You can replace this with a dynamic password

        // Call the chaincode function with the encrypted password
        await contract.submitTransaction('createDefaultAdmin', 'admin', 'admin@sunway.edu.my', 'Admin', encryptedPassword);
        console.log('Default admin created on-chain');
    } catch (error) {
        console.error('Error creating default admin:', error.message);
        throw new Error('Failed to create default admin');
    }
}

// Register user route
app.post("/register", async (req, res) => {
  console.log("Register endpoint called");
  
  const { username, studentId, password, email, dob } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    console.log("Extracted user details:", { username, studentId, email, dob });

    // Check if email already exists in the ledger (Blockchain)
    console.log("Checking if email exists in blockchain...");
    const existingUserBytes = await contract.submitTransaction('fetchUserByEmail', email);
    console.log("Existing user response from blockchain:", existingUserBytes.toString());

    // If the result is an empty string or empty array, it means the user doesn't exist
    if (existingUserBytes && existingUserBytes.length > 0) {
      return res.status(400).send({ message: "Email already exists" });
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000);
    console.log("Generated OTP:", otp);

    // Submit new user data to the ledger
    console.log("Registering new user in blockchain...");
    await contract.submitTransaction('registerUser', username, studentId, hashedPassword, email, dob, otp.toString());
    console.log("User registration submitted to blockchain");

    // Send OTP to user's email (assuming sendOtp is a function you have for emailing)
    console.log("Sending OTP to user's email...");
    await sendOtp(email, otp);
    console.log("OTP sent to user:", email);

    return res.status(201).send({ message: "Account created successfully" });

  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).send({ message: "Error creating account" });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  console.log("Received request body:", req.body); // Debugging log

  if (!email || !otp) {
      console.error("Email or OTP is missing in the request body.");
      return res.status(400).send({ message: "Email and OTP are required." });
  }

  try {
      // Fetch the user from the ledger using the email
      let userJson = await contract.evaluateTransaction('fetchUserByEmail', email);

      // Convert Uint8Array to string
      userJson = Buffer.from(userJson).toString();

      console.log("Converted userJson:", userJson);

      if (!userJson || userJson.trim() === "") {
          console.error(`No user found with email: ${email}`);
          return res.status(404).send({ message: "User not found" });
      }

      let user;
      try {
          user = JSON.parse(userJson);  // Safe JSON parsing
          console.log("Fetched user from ledger:", user); // Debugging log
      } catch (parseError) {
          console.error("Error during OTP verification - Invalid JSON:", parseError);
          return res.status(500).send({ message: "Invalid user data format" });
      }

      // Check if OTP matches
      if (user.otp && user.otp.toString() === otp.toString()) {
          // Update user status to 'verified' on the ledger
          const userUpdate = { email: email, otp: otp, isVerified: true };  // Include OTP for validation
          await contract.submitTransaction('updateUserVerification', JSON.stringify(userUpdate));

          return res.status(200).send({ message: "Account has been created and verified" });
      } else {
          return res.status(400).send({ message: "Wrong OTP code entered" });
      }
  } catch (error) {
      console.error("Error during OTP verification:", error);
      return res.status(500).send({ message: "Failed to verify OTP" });
  }
});


// Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Received login request with email:", email);

  try {
      // Fetch the user data from the ledger using the fetchUserByEmail function
      let userJson = await contract.evaluateTransaction('fetchUserByEmail', email);

      // Convert Uint8Array to string (same way as in OTP verification)
      userJson = Buffer.from(userJson).toString(); // Convert to string using UTF-8 encoding

      console.log("Converted userJson:", userJson); // Debugging log

      // Check if the response is valid
      if (!userJson || userJson.trim() === "") {
          console.log("No user found in ledger.");
          return res.status(404).send({ success: false, message: "User not found" });
      }

      // Parse the user data
      let user;
      try {
          user = JSON.parse(userJson);  // Safe JSON parsing
          console.log("User found in ledger:", user); // Debugging log
      } catch (parseError) {
          console.error("Error during login - Invalid JSON:", parseError);
          return res.status(500).send({ success: false, message: "Invalid user data format" });
      }

      // Check if the password is valid by comparing the provided password with the stored hash
      const isPasswordValid = bcrypt.compareSync(password, user.password);

      if (!isPasswordValid) {
          console.log("Invalid password for user:", email);
          return res.status(401).send({ success: false, message: "Invalid password" });
      }

      // Generate access and refresh tokens
      const accessToken = jwt.sign(
        {
            id: user.email,  // Use user._id as the unique identifier
            email: user.email,
            role: user.role,
            uniqueTime: Date.now(),
        },
        JWT_SECRET,
        { expiresIn: "15m" }
    );

      const refreshToken = jwt.sign(
          {
              id: email,
              email: user.email,
              role: user.role,
              uniqueTime: Date.now(),
          },
          JWT_REFRESH_SECRET,
          { expiresIn: "7d" } // Refresh token expiration time
      );

      console.log("Generated new access token:", accessToken);
      console.log("Generated new refresh token:", refreshToken);

      // Send response to the client
      return res.status(200).send({
          success: true,
          message: "Login successful",
          accessToken,
          refreshToken,
          role: user.role, // Include role in response for frontend routing
      });
  } catch (error) {
      console.error("Login error:", error);
      return res.status(500).send({ success: false, message: "Login failed", error: error.message });
  }
});

// Resend OTP Route
app.post("/resend-otp", async (req, res) => {
  const { email } = req.body;

  console.log("Received request body:", req.body); // Debugging log

  if (!email) {
      console.error("Email is missing in the request body.");
      return res.status(400).send({ message: "Email is required." });
  }

  try {
      // Fetch the user data from the ledger using the fetchUserByEmail function
      let userJson = await contract.evaluateTransaction('fetchUserByEmail', email);

      // Convert Uint8Array to string (handling potential data formats)
      userJson = Buffer.from(userJson).toString();

      console.log("Converted userJson:", userJson);

      if (!userJson || userJson.trim() === "") {
          console.log("No user found in ledger.");
          return res.status(404).send({ message: "User not found" });
      }

      // Parse the user data
      let user;
      try {
          user = JSON.parse(userJson);  // Safe JSON parsing
          console.log("User found in ledger:", user);  // Debugging log
      } catch (parseError) {
          console.error("Error parsing user data:", parseError);
          return res.status(500).send({ message: "Invalid user data format" });
      }

      // Generate a new OTP
      const newOtp = Math.floor(1000 + Math.random() * 9000);

      // Prepare updated user data to pass to the updateUser chaincode function
      const updatedUserData = {
          ...user,  // Retain existing data
          otp: newOtp.toString(),  // Update OTP field
      };

      // Update the user with new OTP using the updateUser chaincode function
      await contract.submitTransaction('updateUser', email, JSON.stringify(updatedUserData));

      // Send the new OTP to the user's email (assuming sendOtp is a function you have for emailing)
      await sendOtp(email, newOtp);

      return res.status(200).send({ message: "New OTP has been sent to your email" });
  } catch (error) {
      console.error("Error during resend OTP:", error);
      return res.status(500).send({ message: "Failed to resend OTP" });
  }
});

// JWT Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    console.log("Token received for authentication:", token);
  
    if (!token) {
      console.log("No token provided in request");
      return res.status(401).send({ message: "Access Denied" });
    }
  
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.log("Token verification failed:", err.message);
        return res.status(403).send({ message: "Invalid Token" });
      }
  
      req.user = user;
      next();
    });
};

// Refresh Token Route
app.post("/refresh-token", (req, res) => {
    const { refreshToken } = req.body;
  
    if (!refreshToken) {
      return res.status(401).send({ message: "Refresh Token Required" });
    }
  
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, user) => {
      if (err) {
        return res.status(403).send({ message: "Invalid Refresh Token" });
      }
  
      // Generate a new access token
      const newAccessToken = jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "15m" }
      );
      console.log("Generated new access token from refresh:", newAccessToken);
  
      res.json({ accessToken: newAccessToken });
    });
});

// Forum Route
app.get("/forum", authenticateToken, (req, res) => {
    res.status(200).send({ message: "Welcome to the forum!" });
});

// Validate Token
// Token Validation Endpoint
app.get("/validate-token", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
      return res.status(401).send({ message: "Token not provided" });
  }

  try {
      // Verify the JWT token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Query the Hyperledger Fabric ledger to fetch the user by email (using the decoded email)
      let userData = await contract.evaluateTransaction('fetchUserByEmail', decoded.email);

      // Convert Uint8Array to string (same parsing logic as in previous routes)
      userData = Buffer.from(userData).toString(); // Convert to string using UTF-8 encoding

      console.log("Converted userData:", userData); // Debugging log

      // If user data is not found in the ledger or is empty
      if (!userData || userData.trim() === "") {
          return res.status(404).send({ message: "User not found in ledger" });
      }

      // Parse the user data returned as a string from the ledger
      let user;
      try {
          user = JSON.parse(userData);  // Safe JSON parsing
          console.log("User fetched from ledger:", user);  // Debugging log
      } catch (parseError) {
          console.error("Error during token validation - Invalid JSON:", parseError);
          return res.status(500).send({ message: "Invalid user data format" });
      }

      // Return response with token validity and user data
      return res.status(200).send({
          message: "Token is valid",
          user: {
              username: user.username,
              email: user.email,
              role: user.role,
              studentId: user.studentId,
          },
      });
  } catch (error) {
      console.error("Error validating token:", error);
      return res.status(403).send({ message: "Invalid or expired token" });
  }
});

// Role Details Endpoint
app.get("/api/role-details", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
      return res.status(401).send({ message: "Token not provided" });
  }

  try {
      // Verify the JWT token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Query the Fabric ledger for user details using email from the decoded token
      let userData = await contract.evaluateTransaction('fetchUserByEmail', decoded.email);

      // Convert Uint8Array to string (same parsing logic as in previous routes)
      userData = Buffer.from(userData).toString(); // Convert to string using UTF-8 encoding

      // If user data is not found in the ledger
      if (!userData || userData.trim() === "") {
          return res.status(404).send({ message: "User not found in ledger" });
      }

      // Parse the user data returned as a string from the ledger
      let user;
      try {
          user = JSON.parse(userData);  // Safe JSON parsing
      } catch (parseError) {
          console.error("Error during role details fetching - Invalid JSON:", parseError);
          return res.status(500).send({ message: "Invalid user data format" });
      }

      // Return user details
      return res.status(200).send({
          id: user.id,
          username: user.username,
          studentId: user.studentId,
          email: user.email,
          dob: user.dob,
          gender: user.gender || '',
          nationality: user.nationality || '',
          program: user.program || '',
          intake: user.intake || '',
          role: user.role,
      });
  } catch (error) {
      console.error("Error fetching role details:", error);
      return res.status(403).send({ message: "Invalid or expired token" });
  }
});

// User Profile Page
// Endpoint for updating user details
app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body; // Contains updated fields (e.g., role, profile data)
  console.log("User ID:", req.params.id);
  console.log("Updated Data:", req.body);

  try {
    // Check if user exists in the ledger
    let userData = await contract.evaluateTransaction('fetchUserByEmail', id);

    // Convert Uint8Array to string (same parsing logic as in previous routes)
    userData = Buffer.from(userData).toString(); // Convert to string using UTF-8 encoding

    console.log("Converted userData:", userData); // Debugging log

    // If user data is not found in the ledger or is empty
    if (!userData || userData.trim() === "") {
      return res.status(404).send({ message: "User not found" });
    }

    // Parse the user data fetched from Fabric
    let user;
    try {
        user = JSON.parse(userData);  // Safe JSON parsing
        console.log("Fetched user from ledger:", user);  // Debugging log
    } catch (parseError) {
        console.error("Error during updating user - Invalid JSON:", parseError);
        return res.status(500).send({ message: "Invalid user data format" });
    }

    // Merge existing user data with the updated data
    const updatedUser = {
      ...user,
      ...updatedData, // Update with provided fields
    };

    // Store the updated user in the ledger
    await contract.submitTransaction('updateUser', id, JSON.stringify(updatedUser));

    // Return the updated user data
    res.status(200).send({
      message: "User details updated successfully",
      updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send({ message: "Error updating user profile" });
  }
});
  
// hold first
// Endpoint to fetch all users with their details
app.get("/api/users", async (req, res) => {
  try {
      // Query to fetch all users with role "User"
      const usersAsBytes = await contract.evaluateTransaction('queryAllUsers'); // Call the chaincode function

      console.log('Raw Users Data:', usersAsBytes);  // Log the raw response to inspect it

      if (!usersAsBytes || usersAsBytes.length === 0) {
          return res.status(404).send({ message: "No users found" });
      }

      // Decode the byte array to a UTF-8 string
      const usersString = Buffer.from(usersAsBytes).toString('utf-8');

      // Parse the JSON data
      const parsedUsers = JSON.parse(usersString);

      // Ensure parsedUsers is an array, then format the user data accordingly
      const users = parsedUsers.map((user) => ({
          id: user.id,
          username: user.username || "N/A",
          studentId: user.studentId || "N/A",
          email: user.email || "N/A",
          program: user.program || "N/A",
          intake: user.intake || "N/A",
          role: user.role || "User", // Default to 'User' if no role exists
      }));

      res.status(200).json(users); // Send the formatted users as JSON
  } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send({ message: "Error fetching users" });
  }
});

app.get('/posts', authenticateToken, async (req, res) => {
  try {
    console.log('GET /posts endpoint hit');

    // Invoke chaincode's getAllPosts method
    const postsBuffer = await contract.evaluateTransaction('getAllPosts');
    
    // Convert the byte array (ASCII codes) into a string
    const postsJSON = String.fromCharCode(...postsBuffer);

    // Log the raw string to inspect
    console.log('Raw posts data from chaincode:', postsJSON);

    // Parse the JSON string
    const posts = JSON.parse(postsJSON);

    console.log('Fetched posts from chaincode:', posts);

    // Format the posts to match the structure of the second example
    const formattedPosts = posts.map((post) => ({
      _id: post._id,                // Assuming _id is part of post data
      title: post.title,
      content: post.content,
      username: post.username,      // Assuming username is part of post data
      studentId: post.studentId,    // Assuming studentId is part of post data
      email: post.email,            // Assuming email is part of post data
      image: post.image,            // Assuming image URL is part of post data
      comments: post.comments || [], // Default empty array if comments is missing
      createdAt: post.createdAt,    // Assuming createdAt is part of post data
    }));

    // Send the formatted posts in the response
    res.status(200).json(formattedPosts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Error fetching posts', error: error.message });
  }
});

// Event Route
// Post events 
app.post("/api/post-events", async (req, res) => {
  try {
      const {
          title,
          description,
          date,
          time,
          eventType,
          image,
          location,
          voteOptions = [],  // Default to an empty array if not provided
          creatorEmail,      // Receive creatorEmail from request body
      } = req.body;

      // Log the incoming request body for debugging
      console.log("Received event data:", req.body);

       // Validate creatorEmail
      if (!creatorEmail || typeof creatorEmail !== 'string') {
        console.log("Error: Missing or invalid creatorEmail.");
        return res.status(400).send({ message: "Missing or invalid creatorEmail" });
      }

      // Check if all required fields are provided
      if (!title || !description || !date || !time || !eventType || !location) {
          console.log("Error: Missing required fields in event data.");
          return res.status(400).send({ message: "Missing required fields" });
      }

      // Log voteOptions to verify it's an array
      console.log("Vote options received:", voteOptions);

      // Validate that voteOptions is an array
      if (eventType === 'voting') {
          if (!Array.isArray(voteOptions)) {
              console.log("Error: voteOptions is not an array!");
              return res.status(400).send({ message: "voteOptions should be an array for voting events." });
          }
          if (voteOptions.length === 0) {
              console.log("Error: voteOptions is an empty array.");
              return res.status(400).send({ message: "voteOptions cannot be empty for voting events." });
          }
      }

      // Generate the current timestamp for dateCreated
      const dateCreated = new Date().toISOString();
      console.log("Generated dateCreated:", dateCreated);

      // Include dateCreated in the event data
      const eventData = {
          title,
          description,
          date,
          time,
          eventType,
          image,
          location,
          voteOptions,
          dateCreated,
          creatorEmail, // Add this line
      };

      // Log the event data to be posted
      console.log("Prepared event data:", eventData);

      // Call the chaincode function to post the event
      console.log("Calling chaincode to post event...");
      const eventId = await contract.submitTransaction('postEvent', 
          eventData.title, 
          eventData.description, 
          eventData.date, 
          eventData.time, 
          eventData.eventType, 
          eventData.image, 
          eventData.location, 
          eventData.creatorEmail, // Pass creatorEmail to chaincode
          JSON.stringify(eventData.voteOptions)  // Ensure voteOptions is passed as a stringified array
      );

      // Log the response from chaincode
      console.log("Chaincode response (Event ID):", eventId);

      // Respond with the created event ID
      res.status(201).send({
          message: "Event created successfully",
          eventId: eventId,
      });

  } catch (error) {
      // Log the error if the try block fails
      console.error("Error creating event:", error);

      res.status(500).send({ message: "Error creating event", error: error.message });
  }
});

app.post("/api/events", authenticateToken, async (req, res) => {
  try {
    const { role, email } = req.user; // Extract role and email from the token

    let normalEventsBuffer, votingEventsBuffer;

    if (role === 'Admin') {
      // Admins get all events
      normalEventsBuffer = await contract.evaluateTransaction('getEvents', 'normal');
      votingEventsBuffer = await contract.evaluateTransaction('getEvents', 'voting');
    } else if (role === 'Moderator') {
      // Moderators get events created by their email
      normalEventsBuffer = await contract.evaluateTransaction('getAllEventsByCreator', 'normal', email);
      votingEventsBuffer = await contract.evaluateTransaction('getAllEventsByCreator', 'voting', email);
    } else {
      return res.status(403).send({ message: "Access denied" });
    }

    // Log the raw buffer data to inspect it
    console.log('Normal Events Buffer:', normalEventsBuffer);
    console.log('Voting Events Buffer:', votingEventsBuffer);

    // Check if the buffers are empty
    if (!normalEventsBuffer || normalEventsBuffer.length === 0) {
      return res.status(404).send({ message: "No normal events found" });
    }

    if (!votingEventsBuffer || votingEventsBuffer.length === 0) {
      return res.status(404).send({ message: "No voting events found" });
    }

    // Decode the byte arrays to UTF-8 strings
    const normalEventsString = Buffer.from(normalEventsBuffer).toString('utf-8');
    const votingEventsString = Buffer.from(votingEventsBuffer).toString('utf-8');

    console.log('Normal Events String:', normalEventsString);
    console.log('Voting Events String:', votingEventsString);

    // Parse the JSON strings into arrays
    let normalEvents = [];
    let votingEvents = [];

    // Parse normal events if it's a valid JSON string
    if (normalEventsString && normalEventsString !== '[]') {
      try {
        normalEvents = JSON.parse(normalEventsString);
      } catch (error) {
        console.error('Error parsing normal events:', error);
        return res.status(500).send({ message: 'Error parsing normal events' });
      }
    }

    // Parse voting events if it's a valid JSON string
    if (votingEventsString && votingEventsString !== '[]') {
      try {
        votingEvents = JSON.parse(votingEventsString);
      } catch (error) {
        console.error('Error parsing voting events:', error);
        return res.status(500).send({ message: 'Error parsing voting events' });
      }
    }

    // Combine normal and voting events
    const allEvents = [...normalEvents, ...votingEvents];

    // Sort events by dateCreated in descending order
    const sortedEvents = allEvents.sort(
      (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
    );

    // Send the sorted events as a response
    res.status(200).json(sortedEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).send({ message: "Error fetching events" });
  }
});

app.get("/api/allevents", async (req, res) => {
  try {
    // Fetch events from the contract (normal and voting)
    const normalEventsBuffer = await contract.evaluateTransaction('getAllEvents', 'normal');
    const votingEventsBuffer = await contract.evaluateTransaction('getAllEvents', 'voting');

    // Log the raw buffer data for debugging
    console.log('Normal Events Buffer:', normalEventsBuffer);
    console.log('Voting Events Buffer:', votingEventsBuffer);

    // Check if the buffers are empty or null
    if (!normalEventsBuffer || normalEventsBuffer.length === 0) {
      return res.status(404).send({ message: "No normal events found" });
    }

    if (!votingEventsBuffer || votingEventsBuffer.length === 0) {
      return res.status(404).send({ message: "No voting events found" });
    }

    // Decode the byte arrays to UTF-8 strings
    const normalEventsString = Buffer.from(normalEventsBuffer).toString('utf-8');
    const votingEventsString = Buffer.from(votingEventsBuffer).toString('utf-8');

    console.log('Normal Events String:', normalEventsString);
    console.log('Voting Events String:', votingEventsString);

    // Parse the JSON strings into arrays
    let normalEvents = [];
    let votingEvents = [];

    // Parse normal events if it's a valid JSON string
    if (normalEventsString && normalEventsString !== '[]') {
      try {
        normalEvents = JSON.parse(normalEventsString);
      } catch (error) {
        console.error('Error parsing normal events:', error);
        return res.status(500).send({ message: 'Error parsing normal events' });
      }
    }

    // Parse voting events if it's a valid JSON string
    if (votingEventsString && votingEventsString !== '[]') {
      try {
        votingEvents = JSON.parse(votingEventsString);
      } catch (error) {
        console.error('Error parsing voting events:', error);
        return res.status(500).send({ message: 'Error parsing voting events' });
      }
    }

    // Format events
    const formatEvent = (event, type) => ({
      _id: event._id || "Unknown ID",
      title: event.title || "Untitled Event",
      description: event.description || "No description available.",
      date: event.date || "Unknown date",
      time: event.time || "Unknown time",
      image: event.image || "",
      location: event.location || "Unknown location",
      eventType: type,
      dateCreated: event.dateCreated || null,
      voteOptions: type === "voting" ? event.voteOptions || [] : undefined,
    });

    const formattedNormalEvents = normalEvents.map((event) => formatEvent(event, 'normal'));
    const formattedVotingEvents = votingEvents.map((event) => formatEvent(event, 'voting'));

    // Combine and sort events by dateCreated in descending order
    const allEvents = [...formattedNormalEvents, ...formattedVotingEvents];
    const sortedEvents = allEvents.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

    // Return the sorted events
    res.status(200).json(sortedEvents);

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).send({ message: 'Error fetching events' });
  }
});


// Endpoint to delete an event (soft delete in Hyperledger Fabric)
app.delete("/api/events/:id", authenticateToken, async (req, res) => {
  try {
      const eventId = req.params.id;
      const userEmail = req.user.email; // Retrieve user email from the token

      console.log(`Attempting to delete event ${eventId} by user ${userEmail}`);

      // Fetch user (to ensure role validation)
      console.log(`Fetching user by email: ${userEmail}`);
      const userResult = await contract.evaluateTransaction('fetchUserByEmail', userEmail);
      const user = JSON.parse(Buffer.from(userResult).toString());  // Assuming result is in JSON format

      if (!user) {
          console.error(`User with email ${userEmail} not found`);
          return res.status(404).json({ error: "User not found" });
      }

      // Check if the user has the 'Moderator' or 'Admin' role
      console.log(`Checking user role for ${userEmail}`);
      if (user.role !== "Moderator" && user.role !== "Admin") {
          console.error(`User ${userEmail} is not a Moderator or Admin`);
          return res.status(403).json({ error: "Unauthorized: Not a Moderator or Admin" });
      }

      console.log(`User ${userEmail} has sufficient permissions (Moderator/Admin). Proceeding with event deletion.`);

      // Call chaincode to "delete" the event by marking it as deleted
      console.log(`Submitting transaction to delete event ${eventId}`);
      const result = await contract.submitTransaction('deleteEvent', eventId, userEmail);

      if (result) {
          console.log(`Event ${eventId} deleted successfully`);
          // If the result is successful, return a success message
          res.status(200).send({ message: `Event ${eventId} deleted successfully.` });
      } else {
          console.error(`No result returned when deleting event ${eventId}`);
          res.status(500).send({ message: "Error deleting event. No result returned." });
      }
  } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).send({ message: "Error deleting event." });
  }
});

// Endpoint to fetch a user's joined and voted events
app.get("/api/users/events", authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email; // Retrieve user email from the token via `authenticateToken`

        // Fetch user profile from blockchain using the email
        const userResult = await contract.evaluateTransaction('fetchUserByEmail', userEmail);
        const user = Buffer.from(userResult).toString(); // Assuming result is in JSON format

        if (!user) {
            return res.status(404).send({ message: "User not found" });
        }

        // Fetch events that the user has joined and voted on from the blockchain
        const joinedEvents = await contract.evaluateTransaction('getUserJoinedEvents', userEmail);
        const votedEvents = await contract.evaluateTransaction('getUserVotedEvents', userEmail);

        // Parse the results
        const joinedEventsList = Buffer.from(userResult).toString();
        const votedEventsList = Buffer.from(userResult).toString();

        // Return the joined and voted events
        res.status(200).json({
            joinedEvents: joinedEventsList || [],
            votedEvents: votedEventsList || [],
        });
    } catch (error) {
        console.error("Error fetching user events:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

// Endpoint to join an event
app.get("/api/join-event/:eventId", authenticateToken, async (req, res) => {
  try {
      const { email: userEmail, id: userId } = req.user; // Extract user details from token
      const { eventId } = req.params; // Get eventId from URL params

      // Log extracted user details and eventId
      console.log("User Details:", { userEmail, userId });
      console.log("Received eventId:", eventId);

      if (!eventId) {
          return res.status(400).json({ error: "eventId is required" });
      }

      // Call the chaincode to join the event, pass userEmail and userId, but not username
      const result = await contract.submitTransaction(
          'joinEvent',   // The chaincode function
          userEmail,     // User's email
          userId,        // User's ID
          eventId        // Event ID
      );

      // Log the result from chaincode
      console.log("Chaincode response:", result.toString());

      res.status(200).json({
          message: result.toString(),  // Return the success message from chaincode
      });
  } catch (error) {
      console.error("Error joining event:", error);
      res.status(500).json({ error: "Internal server error", details: error.message });
  }
});


// Endpoint to vote for an event
app.post("/api/vote-event", authenticateToken, async (req, res) => {
    try {
        const { eventId, selectedOption } = req.body;
        const userEmail = req.user.email;  // Extract user email from token

        // Call the chaincode to submit the vote
        const result = await contract.submitTransaction(
            'voteEvent',   // The chaincode function
            userEmail,     // User's email
            eventId,       // Event ID
            selectedOption // Selected vote option
        );

        // Respond with success message and updated event data
        res.status(200).json({
            message: result,  // Success message returned by chaincode
        });
    } catch (error) {
        console.error("Error processing vote:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

// Endpoint to update event
app.put("/api/update-event/:eventId", authenticateToken, async (req, res) => {
  try {
      const eventId = req.params.eventId; // Retrieve event ID from URL
      const updatedEventData = req.body;  // Get updated data from the request body
      const { eventType } = updatedEventData; // Assume `eventType` is sent in the body

      // Log the event ID and updated event data
      console.log("Received request to update event with ID:", eventId);
      console.log("Updated event data:", updatedEventData);
      
      // Call the chaincode to update the event on the blockchain
      console.log("Calling chaincode to update event...");
      const result = await contract.submitTransaction(
          'updateEvent',   // The chaincode function name
          eventId,         // Event ID
          JSON.stringify(updatedEventData)  // Updated event data
      );
      
      // Log the result from the chaincode transaction
      console.log("Chaincode result:", result);

      // Respond with success message and updated event data
      res.status(200).json({
        message: result.toString(),  // Success message returned by chaincode
    });
  } catch (error) {
      // Log the error details
      console.error("Error updating event:", error.message);
      res.status(500).json({ error: "Failed to update event", details: error.message });
  }
});

app.get("/api/user/joined-events", authenticateToken, async (req, res) => {
  try {
      // Retrieve user email from the token (ensure `authenticateToken` middleware is decoding the token properly)
      const userEmail = req.user.email;

      // Call the chaincode to fetch the joined events using the user email
      const joinedEventsResult = await contract.evaluateTransaction('getUserJoinedEvents', userEmail);
      
      // Convert the Buffer result to string using utf-8 encoding
      const joinedEventsString = Buffer.from(joinedEventsResult).toString(); 

      // Log the raw response from the chaincode to check the result
      console.log("Raw joined events result:", joinedEventsString);

      // Parse the response string to JSON format
      const joinedEvents = JSON.parse(joinedEventsString);

      // Check if no events are returned
      if (!joinedEvents || joinedEvents.length === 0) {
          return res.status(404).json({ message: "No joined events found" });
      }

      // Map the event data to the desired structure
      const joinedEventsDetails = joinedEvents.map(event => {
          return {
              eventId: event.eventId,
              title: event.title,
              description: event.description,
              date: event.date,
              time: event.time,
              location: event.location,
              status: event.status,
          };
      });

      // Send the response with the joined events
      res.status(200).json({ joinedEvents: joinedEventsDetails });
  } catch (error) {
      console.error("Error fetching joined events:", error);
      res.status(500).json({ message: "Internal server error" });
  }
});


// Forum Posts Endpoint
app.post("/posts", authenticateToken, async (req, res) => {
    const { title, content, image, username, email, studentId } = req.body;
  
    console.log("Received post data:", req.body); // Debugging log
  
    // Check for missing required fields
    if (!title || !content || !username || !email) {
      console.error("Missing required fields:", {
        title,
        content,
        username,
        email,
      });
      return res.status(400).send({ message: "Missing required fields" });
    }
  
    const newPost = {
      title,
      content,
      image,
      username,
      email,
      studentId,  // Ensure this is stored
      comments: [],
      createdAt: new Date().toISOString(), // The date is set in the API layer
    };
  
    try {
      // Call the chaincode to create the post
      const postId = await contract.submitTransaction(
        'createForumPost',
        email,  // User email for verification
        JSON.stringify(newPost)  // Post data, including the createdAt date
      );
  
      // Respond with the created post
      res.status(201).send({
        message: "Forum post created successfully",
        postId, // Return the post ID
      });
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).send({ message: "Error creating post", error: error.message });
    }
});

// Comments Endpoint
app.post("/posts/:id/comments", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const commentData = req.body;  // The entire comment object
  
  // Optional: validate the structure of the commentData to ensure it's a valid object
  if (!commentData || !commentData.text || !commentData.username || !commentData.studentId) {
    return res.status(400).send({
      message: "Invalid comment data",
    });
  }

  try {
    // Call the chaincode to add the comment to the post
    const updatedPostBytes = await contract.submitTransaction(
      'addCommentToPost',   // Chaincode function
      id,                   // Post ID
      JSON.stringify(commentData) // Pass the entire comment object as stringified JSON
    );

    // Parse and send back the updated post
    const updatedPost = Buffer.from(updatedPostBytes).toString();
    res.status(200).send({
      message: "Comment added successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).send({
      message: "Error adding comment",
      error: error.message,
    });
  }
});
  
// Get posts created by the current user
app.get("/api/user-posts", authenticateToken, async (req, res) => {
  try {
    const { email } = req.user; // Extract email from the decoded token
    console.log("Fetching posts for email:", email); // Debugging log
  
    // Fetch posts from the blockchain using the email
    let postsBytes = await contract.evaluateTransaction('getUserPostsByEmail', email);
  
    // Convert Uint8Array to string (same parsing logic as in previous routes)
    postsBytes = Buffer.from(postsBytes).toString(); // Convert to string using UTF-8 encoding
    console.log("Converted postsBytes:", postsBytes); // Debugging log
  
    // If no posts are found
    if (!postsBytes || postsBytes.trim() === "") {
      return res.status(404).send({ message: "No posts found for this user" });
    }
  
    // Parse the posts data returned as a string from the ledger
    let posts;
    try {
      posts = JSON.parse(postsBytes);  // Safe JSON parsing
      console.log("Fetched posts from ledger:", posts);  // Debugging log
    } catch (parseError) {
      console.error("Error during user posts fetching - Invalid JSON:", parseError);
      return res.status(500).send({ message: "Invalid posts data format" });
    }
  
    // Check if posts is an array, if not handle it as a single post object (this might happen if there is only one post)
    if (!Array.isArray(posts)) {
      posts = [posts];  // Wrap the single post object in an array
    }
  
    // Format the posts to return only necessary fields
    const userPosts = posts.map((post) => ({
      _id: post.postId || post._id, // Unique post ID (either postId or _id)
      title: post.title,
      content: post.content,
      image: post.image,
      createdAt: post.createdAt,
    }));
  
    res.status(200).send(userPosts); // Send back the formatted posts
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).send({ message: "Error fetching user posts", error: error.message });
  }
});

// Delete a post and associated saved entries
app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
  try {
      const postId = req.params.id; // Get post ID from URL

      // Call the chaincode to delete the post and associated saved entries
      const response = await contract.submitTransaction('deletePost', postId);

      // Parse the response from chaincode (message of success)
      const result = Buffer.from(response).toString(); // Convert to string using UTF-8 encoding

      res.status(200).json({ message: result.message }); // Respond with success message
  } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Failed to delete post.' });
  }
});
  
// Update a post
app.put("/api/posts/:id", authenticateToken, async (req, res) => {
    const { id } = req.params; // Get post ID from URL
    const updatedData = req.body; // Get the updated data from the request body
  
    // Optionally, include the timestamp in the request body (ensure client provides this)
    updatedData.updatedAt = new Date().toISOString(); // Set `updatedAt` on the client side
  
    try {
      // Call the chaincode to update the post
      const response = await contract.submitTransaction('updatePost', id, JSON.stringify(updatedData));
  
      // Parse the response from chaincode (message of success and updated post)
      const result = Buffer.from(response).toString(); // Convert to string using UTF-8 encoding
  
      res.status(200).json({ message: result.message, updatedPost: result.updatedPost }); // Respond with success message and updated post
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ error: 'Failed to update post.' });
    }
});

app.post("/api/save-post", authenticateToken, async (req, res) => {
  try {
      const userEmail = req.user.email; // Retrieve user email from token
      const { postId } = req.body;

      // Call chaincode to save the post (store only the postId)
      const response = await contract.submitTransaction('savePost', userEmail, postId);

      const result = Buffer.from(response).toString();
      if (result.error) {
          return res.status(400).json({ error: result.error });
      }

      res.status(200).json({ message: result.message });
  } catch (error) {
      console.error("Error saving post:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch saved posts
app.get("/api/saved-posts", authenticateToken, async (req, res) => {
  try {
      const userEmail = req.user.email; // Retrieve user email from token
      console.log("Fetching saved posts for user:", userEmail);  // Log the user email
      const response = await contract.evaluateTransaction('fetchSavedPosts', userEmail);

      // Log the raw response from the chaincode
      const rawResponse = response.toString();  // Convert to string from Buffer
      // Convert the string from byte values to a proper JSON string
      const jsonString = String.fromCharCode(...rawResponse.split(',').map(val => parseInt(val.trim())));

      // Now try parsing the JSON string
      try {
          const result = JSON.parse(jsonString);  // Parse the string into an object

          // Check if savedPosts exists and is an array
          if (!result.savedPosts || result.savedPosts.length === 0) {
              console.log("No saved posts found for the user.");
              return res.status(404).json({ error: "No saved posts found" });
          }

          console.log("Saved posts found:", result.savedPosts);
          res.status(200).json({ savedPosts: result.savedPosts });
      } catch (err) {
          console.error("Error parsing response:", err);
          return res.status(500).json({ error: "Failed to parse saved posts data" });
      }
  } catch (error) {
      console.error("Error fetching saved posts:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});

// Remove saved post
app.post('/api/remove-saved-post', authenticateToken, async (req, res) => {
  try {
      const userEmail = req.user.email; // Retrieve user email from token
      const { postId } = req.body; // Get the postId from the request body

      // Call chaincode to fetch the user data
      const response = await contract.evaluateTransaction('fetchUserByEmail', userEmail);
      const userString = Buffer.from(response).toString();
      
      if (!userString) {
          return res.status(404).json({ error: 'User not found' });
      }

      // Parse the user string to an object
      let user;
      try {
          user = JSON.parse(userString);  // Parse the string into an object
      } catch (err) {
          return res.status(500).json({ error: 'Error parsing user data' });
      }

      // Ensure savedPosts is an array
      if (!Array.isArray(user.savedPosts)) {
          return res.status(500).json({ error: 'Saved posts not found' });
      }

      // Ensure the post exists in savedPosts
      const postIndex = user.savedPosts.findIndex((p) => p._id === postId);
      if (postIndex === -1) {
          return res.status(404).json({ error: 'Post not found in saved posts' });
      }

      // Remove the post from savedPosts
      user.savedPosts.splice(postIndex, 1);

      // Update the user data in the blockchain
      await contract.submitTransaction('updateUser', userEmail, JSON.stringify(user));

      res.status(200).json({ message: 'Post removed successfully!' });
  } catch (error) {
      console.error('Error removing saved post:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

// Flag Post
app.post("/api/flag-post", authenticateToken, async (req, res) => {
  const { postId } = req.body;
  const userEmail = req.user.email;

  try {
    // Call chaincode to flag the post
    const flagPostResponse = await contract.submitTransaction('flagPost', postId, userEmail);
    
    // Parse the response from chaincode
    const response = Buffer.from(response).toString();

    // Send success response with the message returned by the chaincode
    res.status(200).json({ message: response.message });

  } catch (error) {
    console.error("Error flagging post:", error);
    res.status(500).json({ message: "Failed to flag post", error: error.message });
  }
});

// GET Flagged Posts
app.get("/api/flagged-posts", authenticateToken, async (req, res) => {
  try {
      // Call chaincode to fetch all flagged posts
      const response = await contract.evaluateTransaction('fetchFlaggedPosts');
      
      // Convert the response to a string (Buffer to string)
      const flaggedPostsString = Buffer.from(response).toString();

      // Parse the string into JSON (assuming it's a valid JSON string)
      let flaggedPosts = [];
      try {
          flaggedPosts = JSON.parse(flaggedPostsString);
      } catch (parseError) {
          console.error("Error parsing flagged posts:", parseError);
          return res.status(500).json({ message: "Failed to parse flagged posts" });
      }

      // Now flaggedPosts is an array, and we can safely use .map()
      const formattedPosts = flaggedPosts.map((post) => ({
          _id: post._id,
          title: post.title,
          content: post.content,
          image: post.image,
          image: post.image,
          postId: post.postId,
          flaggedBy: post.flaggedBy || [],
          flagCount: post.flagCount || 0,
          username: post.username,
          studentId: post.studentId,
      }));

      res.status(200).json(formattedPosts);
  } catch (error) {
      console.error("Error fetching flagged posts:", error);
      res.status(500).json({ message: "Failed to fetch flagged posts" });
  }
});

// Delete Flagged Posts
app.delete("/api/flagged-posts/:postId", authenticateToken, async (req, res) => {
    const { postId } = req.params;

    console.log('mathavan');
    console.log(postId);
  
    try {
        // Call chaincode to delete the flagged post and remove it from users' saved posts
        await contract.submitTransaction('deleteFlaggedPost', postId);
  
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Error deleting flagged post:", error);
        res.status(500).json({ message: "Failed to delete flagged post" });
    }
});

app.get("/api/event-joined-users/:eventId", authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    console.log("API hit: Fetching details for event:", eventId);

    // Fetch event details from the blockchain
    const eventResult = await contract.evaluateTransaction('fetchEventById', eventId);
    const event = JSON.parse(Buffer.from(eventResult).toString());

    console.log("Blockchain Response:", event);

    if (!event || !event.eventId) {
      console.error(`Event with ID ${eventId} not found in the blockchain`);
      return res.status(404).json({ error: "Event not found" });
    }

    console.log("Parsed Event Data:", event);

    console.log("Type of event.eventType:", typeof event.eventType);
    console.log("Value of event.eventType:", event.eventType);

    if (event.eventType === "normal") {
      console.log("Handling normal event...");

      const joinedUsers = await Promise.all(
        (event.joinedUsers || []).map(async (user) => {
          console.log("Processing user:", user);
          try {
            console.log("Fetching user for:", user.userId || user.email);
            const userId = user.userId || user.email;
            if (!userId) {
              throw new Error("User ID or Email is missing");
            }

            const userResult = await contract.evaluateTransaction('fetchUserByEmail', userId);
            const userResultString = Buffer.from(userResult).toString();
            console.log(`Raw userResult for ${userId}:`, userResultString); // Logging raw response

            const userData = JSON.parse(userResultString); // Parse after ensuring it's valid JSON

            return {
              username: userData.username,
              userId: userData.email, // Assuming userId is email
              studentId: userData.studentId,
            };
          } catch (error) {
            console.error(`Error fetching user ${user.userId || user.email}:`, error);
            return null; // Gracefully handle errors for individual users
          }
        })
      );

      const validJoinedUsers = joinedUsers.filter(Boolean);
      res.status(200).json(validJoinedUsers);
    } else {
      console.error("Invalid event type.");
      return res.status(400).json({ error: "Invalid event type" });
    }
  } catch (error) {
    console.error("Error fetching joined users:", error);
    res.status(500).json({ error: "Error fetching joined users", details: error.message });
  }
});


// Endpoint to fetch voting results for a voting event
app.get("/api/voting-results/:eventId", authenticateToken, async (req, res) => {
  try {
      const eventId = req.params.eventId;

      // Fetch the voting event from the blockchain
      const votingEventResult = await contract.evaluateTransaction('fetchEventById', eventId);
      const votingEvent = JSON.parse(Buffer.from(votingEventResult).toString());

      // Log the voting event
      console.log("Fetched Voting Event:", votingEvent);

      // Parse the voteOptions string into an array
      const voteOptions = votingEvent.voteOptions; // No need to parse since it's already an array

      // Validate the structure of the voting event
      if (!voteOptions || !Array.isArray(voteOptions)) {
          return res.status(400).json({ error: "Invalid voting event data or no vote options found" });
      }

      // Fetch the voting results for each option
      const votingResults = await Promise.all(
          voteOptions.map(async (option) => {
              // Handle missing voters array
              const votersList = option.voters || [];
              const voters = await Promise.all(
                  votersList.map(async (voterId) => {
                      try {
                          // Fetch user details by voterId
                          const userResult = await contract.evaluateTransaction('fetchUserByEmail', voterId);
                          const user = JSON.parse(userResult.toString());
                          return {
                              username: user.username,
                              userId: user.email,  // Assuming userId is email
                              studentId: user.studentId,
                          };
                      } catch (userError) {
                          console.error(`Error fetching user ${voterId}:`, userError.message);
                          return null; // Gracefully handle errors for individual voters
                      }
                  })
              );

              return {
                  option: option.name,
                  votes: option.votes,
                  voters: voters.filter(Boolean), // Remove null values from voters array
              };
          })
      );

      res.status(200).json(votingResults);
  } catch (error) {
      console.error("Error fetching voting results:", error.message);
      res.status(500).json({ error: "Error fetching voting results", details: error.message });
  }
});


// Endpoint to get an event total joined user count
app.get("/api/users/joined-events-count", authenticateToken, async (req, res) => {
    try {
      const userEmail = req.user.email; // Extract user email from the token
  
      // Fetch the user from the blockchain
      const userResult = await contract.evaluateTransaction('fetchUserByEmail', userEmail);
      const user = JSON.parse(userResult.toString());
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Count the number of joined events
      const joinedEventsCount = (user.joinedEvents || []).length;
  
      res.status(200).json({ joinedEventsCount });
    } catch (error) {
      console.error("Error fetching joined events count:", error);
      res.status(500).json({ error: "Internal server error" });
    }
});

// Endpoint to get option vote count for a voting event
app.get("/api/voting-event/:eventId", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log(`API HIT: Fetching voting event with ID: ${eventId}`);

    // Fetch the voting event by ID from the blockchain
    const eventResult = await contract.evaluateTransaction('fetchVotingEventById', eventId);
    const eventString = Buffer.from(eventResult).toString();
    
    // Log the raw event string
    console.log(`Raw event data fetched from blockchain: ${eventString}`);

    // Parse the JSON string into an object
    let event;
    try {
      event = JSON.parse(eventString);
      console.log(`Parsed event object: ${JSON.stringify(event, null, 2)}`);
    } catch (parseError) {
      console.error("Error parsing event data:", parseError);
      return res.status(500).json({ error: "Failed to parse event data" });
    }

    // Validate the event type
    if (!event || event.eventType !== "voting") {
      console.warn(`Event not found or not a voting event. Event data: ${JSON.stringify(event)}`);
      return res.status(404).json({ error: "Voting event not found" });
    }

    // Optionally, you can log specific parts of the event if needed
    console.log(`Voting Event Found: ${event.eventId} - Title: ${event.title}`);

    // Respond with the entire event object
    res.status(200).json(event);
  } catch (error) {
    console.error("Error fetching voting event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/voting-event/:eventId/vote", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { selectedOption } = req.body;
    const userEmail = req.user.email; // Extracted from the authenticated token

    console.log(`Submitting vote for event ID: ${eventId} by user: ${userEmail}`);
    
    // Validate that a selectedOption is provided
    if (!selectedOption) {
      return res.status(400).json({ error: "selectedOption is required" });
    }

    // Interact with the chaincode to submit the vote
    // Parameters: userEmail, eventId, selectedOption
    const voteResponse = await contract.submitTransaction(
      'voteEvent',
      userEmail,
      eventId,
      selectedOption
    );

    console.log("Chaincode response:", voteResponse.toString());

    // Parse the response from the chaincode
    const responseMessage = voteResponse.toString();

    // Respond with success message
    res.status(200).json({
      message: responseMessage || `Vote for event ${eventId} submitted successfully by ${userEmail}`,
    });
  } catch (error) {
    console.error("Error submitting vote:", error);

    // Handle specific error messages from chaincode
    if (error.message.includes("User has already voted for this event")) {
      return res.status(400).json({ error: "You have already voted for this event." });
    }
    if (error.message.includes("Event with ID")) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("User with email")) {
      return res.status(404).json({ error: error.message });
    }

    // Generic error response
    res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});


  
  