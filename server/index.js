const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nano = require("nano")("http://admin:adminpw@127.0.0.1:5984"); // Use CouchDB admin credentials
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

// Database setup
const usersDbName = "users";
const adminDbName = "admins";
const postsDbName = "posts";
const eventDbName = "events";
const votingDbName = "voting";
let usersDb;
let adminDb;
let postsDb;
let eventDb;
let votingDb;

// Admin database setup
async function ensureAdminsDatabaseExists() {
  try {
    await nano.db.get(adminDbName);
    console.log(`Database "${adminDbName}" exists.`);
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(`Database "${adminDbName}" not found. Creating...`);
      await nano.db.create(adminDbName);
      console.log(`Database "${adminDbName}" created.`);
    } else {
      console.error("Error checking database existence:", error);
      process.exit(1);
    }
  }
}

// Insert default admin entry
async function createDefaultAdmin() {
  try {
    // Check if the admin already exists
    const existingAdmins = await adminDb.find({ selector: { role: "Admin" } });
    if (existingAdmins.docs.length > 0) {
      console.log("Admin entry already exists.");
      return;
    }

    // Create admin entry
    const username = "admin"; // Default admin username
    const password = "Admin@123"; // Default admin password
    const email = "admin@sunway.edu.my"; // Default admin email
    const role = "Admin"; // Default admin role

    // Hash the admin password
    const hashedPassword = bcrypt.hashSync(password, 8);

    const response = await adminDb.insert({
      username,
      password: hashedPassword,
      email,
      verified: true,
      role,
    });

    console.log("Default admin created successfully:", response);
  } catch (error) {
    console.error("Error creating default admin:", error.message);
  }
}

// General user database setup
async function ensureDatabaseExists(dbName) {
  try {
    await nano.db.get(dbName);
    console.log(`Database "${dbName}" exists.`);
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(`Database "${dbName}" not found. Creating...`);
      await nano.db.create(dbName);
      console.log(`Database "${dbName}" created.`);
    } else {
      console.error("Error checking database existence:", error);
      process.exit(1);
    }
  }
}

// Event database setup
async function ensureEventDatabaseExists() {
  try {
    await nano.db.get(eventDbName);
    console.log(`Database "${eventDbName}" exists.`);
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(`Database "${eventDbName}" not found. Creating...`);
      await nano.db.create(eventDbName);
      console.log(`Database "${eventDbName}" created.`);
    } else {
      console.error("Error checking database existence:", error);
      process.exit(1);
    }
  }
}

// Voting database setup
async function ensureVotingDatabaseExists() {
  try {
    await nano.db.get("voting");
    console.log('Database "voting" exists.');
  } catch (error) {
    if (error.statusCode === 404) {
      console.log('Database "voting" not found. Creating...');
      await nano.db.create("voting");
      console.log('Database "voting" created.');
    } else {
      console.error('Error checking database existence for "voting":', error);
      process.exit(1);
    }
  }
}

async function createEmailIndexView() {
  try {
    // Check if the design document already exists
    await usersDb.get("_design/email_index");
    console.log("Email index design document already exists.");
  } catch (error) {
    if (error.statusCode === 404) {
      // If not found, create the design document
      const designDoc = {
        _id: "_design/email_index",
        views: {
          by_email: {
            map: function (doc) {
              if (doc.email) emit(doc.email, null);
            }.toString(),
          },
        },
      };

      await usersDb.insert(designDoc);
      console.log("Email index design document created successfully.");
    } else {
      console.error(
        "Error checking or creating design document:",
        error.message
      );
      throw error;
    }
  }
}

async function setupDatabases() {
  await ensureDatabaseExists(usersDbName);
  usersDb = nano.db.use(usersDbName);
  await createEmailIndexView();

  await ensureAdminsDatabaseExists();
  adminDb = nano.db.use(adminDbName);
  await createDefaultAdmin();

  await ensureDatabaseExists(postsDbName);
  postsDb = nano.db.use(postsDbName);

  await ensureEventDatabaseExists();
  eventDb = nano.db.use(eventDbName);

  await ensureVotingDatabaseExists();
  votingDb = nano.db.use(votingDbName);
}
setupDatabases();

const otps = {}; // Store OTPs temporarily

// Registration Route
// Add sendOtp call in the register endpoint
app.post("/register", async (req, res) => {
  const { username, studentId, password, email, dob } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);

  try {
    // Check if email already exists
    const existingUser = await fetchUserByEmail(email);
    if (existingUser) {
      return res.status(400).send({ message: "Email already exists" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000); // Generate OTP
    const response = await usersDb.insert({
      username,
      studentId,
      password: hashedPassword,
      email,
      dob,
      verified: false,
      otp: otp,
      role: "User",
      joinedEvents: [],
      votedEvents: [],
    });

    // Send OTP to email
    await sendOtp(email, otp);

    // Respond with success message
    return res.status(201).send({ message: "Account created successfully" });
  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).send({ message: "Error creating account" });
  }
});

// Helper function to fetch a user by email using the CouchDB design document
const fetchUserByEmail = async (email) => {
  try {
    console.log("Fetching user by email:", email);

    // Query the CouchDB design document view for the email
    const response = await usersDb.view("email_index", "by_email", {
      key: email,
      include_docs: true,
    });

    if (response.rows.length > 0) {
      return response.rows[0].doc; // Return the first document if found
    }

    return null; // Return null if no user is found
  } catch (error) {
    console.error("Error fetching user by email:", error.message);
    throw error;
  }
};

// OTP Verification Route
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  console.log("Received request body:", req.body); // Debugging log

  if (!email) {
    console.error("Email is missing in the request body.");
    return res.status(400).send({ message: "Email is required." });
  }

  try {
    const user = await fetchUserByEmail(email);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    if (user.otp && user.otp.toString() === otp.toString()) {
      await usersDb.insert({
        ...user,
        verified: true,
        otp: null,
        _rev: user._rev,
      });
      return res
        .status(200)
        .send({ message: "Account has been created and verified" });
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
    let userDoc = null;

    // First, check the 'users' database
    const userResponse = await usersDb.find({ selector: { email } });
    if (userResponse.docs.length > 0) {
      userDoc = userResponse.docs[0];
    }

    // If not found in 'users', check 'admins'
    if (!userDoc) {
      const adminResponse = await adminDb.find({ selector: { email } });
      if (adminResponse.docs.length > 0) {
        userDoc = adminResponse.docs[0];
      }
    }

    // If no user is found in any database
    if (!userDoc) {
      console.log("No user found in any database.");
      return res
        .status(404)
        .send({ success: false, message: "User not found" });
    }

    // Validate the password
    const isPasswordValid = bcrypt.compareSync(password, userDoc.password);

    if (!isPasswordValid) {
      console.log("Invalid password for user:", email);
      return res
        .status(401)
        .send({ success: false, message: "Invalid password" });
    }

    // Generate access and refresh tokens
    const accessToken = jwt.sign(
      {
        id: userDoc._id,
        email: userDoc.email,
        role: userDoc.role, // Include the role in the token
        uniqueTime: Date.now(),
      },
      JWT_SECRET,
      { expiresIn: "15m" } // Token expiration time
    );

    const refreshToken = jwt.sign(
      {
        id: userDoc._id,
        email: userDoc.email,
        role: userDoc.role,
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
      role: userDoc.role, // Include role in response for frontend routing
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .send({ success: false, message: "Login failed", error: error.message });
  }
});

// Resend OTP Code
app.post("/resend-otp", async (req, res) => {
  const { email } = req.body;

  console.log("Received request body:", req.body); // Debugging log

  if (!email) {
    console.error("Email is missing in the request body.");
    return res.status(400).send({ message: "Email is required." });
  }

  try {
    const user = await fetchUserByEmail(email);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    const newOtp = Math.floor(1000 + Math.random() * 9000);
    await usersDb.insert({
      ...user,
      otp: newOtp,
      _rev: user._rev,
    });
    await sendOtp(email, newOtp);
    return res
      .status(200)
      .send({ message: "New OTP has been sent to your email" });
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
app.get("/validate-token", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send({ message: "Token not provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check user in users database
    let user = null;
    try {
      user = await usersDb.get(decoded.id);
    } catch (err) {
      if (err.statusCode !== 404) {
        console.error("Error checking users database:", err);
        throw err;
      }
    }

    // Check admin in admins database if not found in users
    if (!user) {
      try {
        user = await adminDb.get(decoded.id);
      } catch (err) {
        if (err.statusCode !== 404) {
          console.error("Error checking admins database:", err);
          throw err;
        }
      }
    }

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    res.status(200).send({
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
    res.status(403).send({ message: "Invalid or expired token" });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
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

    let userDoc = null;

    // Check the 'users' database first
    try {
      const userResponse = await usersDb.get(decoded.id);
      if (userResponse) {
        userDoc = userResponse;
      }
    } catch (err) {
      if (err.statusCode !== 404) {
        throw err; // Unexpected error, rethrow it
      }
    }

    // If not found in 'users', check 'admins' database
    if (!userDoc) {
      try {
        const adminResponse = await adminDb.get(decoded.id);
        if (adminResponse) {
          userDoc = adminResponse;
        }
      } catch (err) {
        if (err.statusCode !== 404) {
          throw err; // Unexpected error, rethrow it
        }
      }
    }

    // If not found in 'admins', check 'moderators' database
    if (!userDoc) {
      try {
        const modResponse = await modDb.get(decoded.id);
        if (modResponse) {
          userDoc = modResponse;
        }
      } catch (err) {
        if (err.statusCode !== 404) {
          throw err; // Unexpected error, rethrow it
        }
      }
    }

    // If the user is still not found
    if (!userDoc) {
      return res.status(404).send({ message: "User not found" });
    }

    // Return user details (username, email, and role)
    return res.status(200).send({
      id: userDoc._id,
      username: userDoc.username,
      studentId: userDoc.studentId,
      email: userDoc.email,
      dob: userDoc.dob,
      gender: userDoc.gender || '', 
      nationality: userDoc.nationality || '', 
      program: userDoc.program || '', 
      intake: userDoc.intake || '',
      role: userDoc.role,
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
    const user = await usersDb.get(id); // Fetch user from the database
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Merge existing user data with the updated data
    const updatedUser = {
      ...user,
      ...updatedData,
      _rev: user._rev,
    };

    // Save the updated user back to the database
    await usersDb.insert(updatedUser);
    res.status(200).send({
      message: "User details updated successfully",
      updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send({ message: "Error updating user profile" });
  }
});

// Endpoint to fetch all users with their details
app.get("/api/users", async (req, res) => {
  try {
    // Fetch all documents from the CouchDB database
    const result = await usersDb.list({ include_docs: true });

    // Extract and format the user data
    const users = result.rows.map((row) => ({
      id: row.id,
      username: row.doc.username || "N/A",
      studentId: row.doc.studentId || "N/A",
      email: row.doc.email || "N/A",
      program: row.doc.program || "N/A",
      intake: row.doc.intake || "N/A",
      role: row.doc.role || "User", // Default to 'User' if no role exists
    }));

    res.status(200).json(users); // Send the formatted users as JSON
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send({ message: "Error fetching users" });
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
      type,
      image,
      location,
      eventType,
      voteOptions,
    } = req.body;

    // Insert event into the database
    const response = await eventDb.insert({
      title,
      description,
      date,
      time,
      type,
      image,
      location,
      eventType,
      voteOptions: voteOptions || [],
      dateCreated: new Date().toISOString(),
    });

    res.status(201).send({
      message: "Event created successfully",
      event: {
        ...response,
      },
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).send({ message: "Error creating event" });
  }
});

// Moderator upload event
app.post("/api/moderator/upload-event", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email; // Retrieve user email from the token
    const {
      title,
      description,
      date,
      time,
      image,
      location,
      eventType,
      voteOptions,
    } = req.body;

    // Fetch the user
    const userResult = await usersDb.find({ selector: { email: userEmail } });
    const user = userResult.docs[0]; // Get the first matched user document
    if (!user) {
      return res.status(404).json({ error: "Moderator not found" });
    }

    if (user.role !== "Moderator") {
      return res.status(403).json({ error: "Unauthorized: Not a Moderator" });
    }

    // Validate event type and vote options for voting events
    if (eventType === "voting" && (!voteOptions || voteOptions.length < 2)) {
      return res
        .status(400)
        .json({ error: "Voting events require at least 2 vote options" });
    }

    const eventDetails = {
      title,
      description,
      date,
      time,
      image,
      location,
      eventType: eventType || "normal", // Default to normal
      voteOptions:
        eventType === "voting"
          ? voteOptions.map((option) => ({ ...option, votes: 0 }))
          : undefined,
      dateCreated: new Date().toISOString(),
    };

    // Insert the event into the appropriate database (normal or voting)
    const dbToUse = eventType === "voting" ? votingDb : eventDb;
    const eventResponse = await dbToUse.insert(eventDetails);

    // Update the moderator's myEvents attribute
    const newEventId = eventResponse.id;
    const updatedMyEvents = [...(user.myEvents || []), newEventId];
    await usersDb.insert({
      ...user,
      myEvents: updatedMyEvents,
      _rev: user._rev,
    });

    res.status(201).json({
      message: "Event uploaded successfully",
      eventId: newEventId,
    });
  } catch (error) {
    console.error("Error uploading event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Post Voting Events (specific to voting)
app.post("/api/post-voting-events", async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      image,
      location,
      eventType,
      voteOptions,
    } = req.body;

    // Validate the required fields
    if (
      !title ||
      !description ||
      !date ||
      !time ||
      !location ||
      !voteOptions ||
      voteOptions.length < 2
    ) {
      return res.status(400).send({
        message:
          "All fields are required, and you must provide at least 2 vote options for a voting event.",
      });
    }

    // Insert voting event into the database
    const response = await votingDb.insert({
      title,
      description,
      date,
      time,
      image,
      location,
      eventType: "voting", // Ensure it's marked as a voting event
      voteOptions: voteOptions.map((option) => ({
        ...option,
        votes: 0, // Initialize votes to 0 for all options
      })),
      dateCreated: new Date().toISOString(),
    });

    res.status(201).send({
      message: "Voting event created successfully",
      event: {
        _id: response.id,
        title,
        description,
        date,
        time,
        image,
        location,
        eventType: "voting",
        voteOptions,
        dateCreated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating voting event:", error);
    res.status(500).send({ message: "Error creating voting event" });
  }
});

// Get all events (normal and voting)
app.get("/api/events", async (req, res) => {
  try {
    const normalEvents = await eventDb.list({ include_docs: true }); // Fetch normal events
    const votingEvents = await votingDb.list({ include_docs: true }); // Fetch voting events

    // Format normal events
    const formattedNormalEvents = normalEvents.rows.map((row) => ({
      _id: row.doc._id || "Unknown ID",
      title: row.doc.title || "Untitled Event",
      description: row.doc.description || "No description available.",
      date: row.doc.date || "Unknown date",
      time: row.doc.time || "Unknown time",
      image: row.doc.image || "",
      location: row.doc.location || "Unknown location",
      eventType: "normal",
      dateCreated: row.doc.dateCreated || null,
    }));

    // Format voting events
    const formattedVotingEvents = votingEvents.rows.map((row) => ({
      _id: row.doc._id || "Unknown ID",
      title: row.doc.title || "Untitled Event",
      description: row.doc.description || "No description available.",
      date: row.doc.date || "Unknown date",
      time: row.doc.time || "Unknown time",
      image: row.doc.image || "",
      location: row.doc.location || "Unknown location",
      eventType: "voting",
      voteOptions: row.doc.voteOptions || [],
      dateCreated: row.doc.dateCreated || null,
    }));

    // Combine normal and voting events
    const allEvents = [...formattedNormalEvents, ...formattedVotingEvents];

        // Sort events by dateCreated in descending order
    const sortedEvents = allEvents.sort(
      (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
    );

    res.status(200).json(sortedEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).send({ message: "Error fetching events" });
  }
});

// Endpoint to delete an event
app.delete("/api/events/:id", async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await eventDb.get(eventId); // Get the event doc

    await eventDb.destroy(event._id, event._rev); // Delete the event
    res.status(200).send({ message: "Event deleted successfully." });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).send({ message: "Error deleting event." });
  }
});

// Endpoint to fetch a user's joined and voted events
app.get("/api/users/events", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Retrieve user ID from the token via `authenticateToken`

    // Fetch the user document by ID
    const user = await usersDb.get(userId);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Return joined and voted events
    res.status(200).json({
      joinedEvents: user.joinedEvents || [],
      votedEvents: user.votedEvents || [],
    });
  } catch (error) {
    console.error("Error fetching user events:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// Endpoint to join an event
app.post("/api/join-event", authenticateToken, async (req, res) => {
  try {
    const { email: userEmail, id: userId, username } = req.user; // Extract user details from token
    const { eventId } = req.body; // Event ID from the request body

    // Fetch the user from the database
    const userResult = await usersDb.get(userId);
    if (!userResult) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch the event from the database
    const eventToJoin = await eventDb.get(eventId);
    if (!eventToJoin) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if the user has already joined the event
    const isEventAlreadyJoined = (userResult.joinedEvents || []).some(
      (joinedEvent) => joinedEvent.eventId === eventId
    );
    if (isEventAlreadyJoined) {
      return res
        .status(400)
        .json({ error: "You have already joined this event." });
    }

    // Add the event to the user's `joinedEvents` array
    const updatedJoinedEvents = [
      ...(userResult.joinedEvents || []),
      {
        eventId: eventToJoin._id,
        title: eventToJoin.title,
        date: eventToJoin.date,
        time: eventToJoin.time,
      },
    ];

    // Save the updated user document
    await usersDb.insert({
      ...userResult,
      joinedEvents: updatedJoinedEvents,
      _rev: userResult._rev, // Include the CouchDB revision ID
    });

    // Add the user to the event's `joinedUsers` array
    const updatedJoinedUsers = [
      ...(eventToJoin.joinedUsers || []),
      {
        userId,
        username,
        email: userEmail,
      },
    ];

    // Increment the event's `totalJoined` count
    const updatedEvent = {
      ...eventToJoin,
      joinedUsers: updatedJoinedUsers,
      totalJoined: (eventToJoin.totalJoined || 0) + 1,
      _rev: eventToJoin._rev, // Include the CouchDB revision ID
    };

    // Save the updated event document
    await eventDb.insert(updatedEvent);

    // Respond with success message and updated event details
    res.status(200).json({
      message: "Event joined successfully!",
      joinedUsers: updatedJoinedUsers,
      totalJoined: updatedEvent.totalJoined,
    });
  } catch (error) {
    console.error("Error joining event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to vote for an event
app.post("/api/vote-event", authenticateToken, async (req, res) => {
  try {
    const { eventId, selectedOption } = req.body;
    const userEmail = req.user.email;

    // Fetch the user
    const userResult = await usersDb.find({ selector: { email: userEmail } });
    const user = userResult.docs[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch the event
    const event = await votingDb.get(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if the user has already voted
    if ((user.votedEvents || []).some((v) => v.eventId === eventId)) {
      return res
        .status(400)
        .json({ error: "User has already voted for this event" });
    }

    // Update the selected option's vote count and voters
    const updatedVoteOptions = event.voteOptions.map((option) => {
      if (option.name === selectedOption) {
        return {
          ...option,
          votes: option.votes + 1,
          votedUsers: [...(option.votedUsers || []), user._id],
        };
      }
      return option;
    });

    // Update the event
    const updatedEvent = {
      ...event,
      voteOptions: updatedVoteOptions,
      _rev: event._rev,
    };
    await votingDb.insert(updatedEvent);

    // Add to user's voted events
    await usersDb.insert({
      ...user,
      votedEvents: [
        ...(user.votedEvents || []),
        { eventId, selectedOption },
      ],
      _rev: user._rev,
    });

    // Return the updated event with the new vote counts
    res.status(200).json({
      message: "Vote submitted successfully",
      updatedEvent, // Return the updated event
    });
  } catch (error) {
    console.error("Error processing vote:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to update event
app.put("/api/update-event/:eventId", authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId; // Retrieve event ID from URL
    const updatedEventData = req.body; // Get updated data from the request body
    const { eventType } = updatedEventData; // Assume `eventType` is sent in the body

    console.log("Updating event:", eventId, updatedEventData);

    // Determine which database to use based on `eventType`
    const dbToUse = eventType === "voting" ? votingDb : eventDb;

    // Fetch the existing event from the appropriate database
    const event = await dbToUse.get(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Merge existing and updated data
    const updatedEvent = {
      ...event,
      ...updatedEventData, // Overwrite with new data
      _rev: event._rev, // Ensure correct CouchDB revision
    };

    // Save the updated event
    const response = await dbToUse.insert(updatedEvent);

    res.status(200).json({
      message: "Event updated successfully",
      event: response,
    });
  } catch (error) {
    console.error("Error updating event:", error.message);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// Endpoint to fetch a user's joined events
app.get("/api/user/joined-events", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Retrieve user ID from the token (ensure authenticateToken middleware is decoding the token properly)

    // Fetch the user from the database
    const user = await usersDb.get(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prepare the response with joined event details
    const joinedEventsDetails = await Promise.all(
      (user.joinedEvents || []).map(async (event) => {
        const eventDetails = await eventDb.get(event.eventId); // Fetch event details from eventDb
        return {
          ...eventDetails,
          date: event.date,
          time: event.time,
        };
      })
    );

    res.status(200).json({ joinedEvents: joinedEventsDetails });
  } catch (error) {
    console.error("Error fetching joined events:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get events created by the current user
app.get("/api/user-created-events", authenticateToken, async (req, res) => {
  try {
      const userId = req.user.id; // User's ID from token
      const user = await usersDb.get(userId);
      
      if (!user.myEvents || user.myEvents.length === 0) {
          return res.status(200).json({ normalEvents: [], votingEvents: [] });
      }
      
      // Fetch events created by this user
      const normalEvents = [];
      const votingEvents = [];
      
      for (const eventId of user.myEvents) {
          const event = await eventDb.get(eventId).catch(() => null);
          const votingEvent = await votingDb.get(eventId).catch(() => null);
          if (event) {
              normalEvents.push(event);
          }
          if (votingEvent) {
              votingEvents.push(votingEvent);
          }
      }
      
      res.status(200).json({ normalEvents, votingEvents });
  } catch (error) {
      console.error("Error fetching user-created events:", error);
      res.status(500).json({ error: "Internal server error" });
  }
});


// Endpoint to fetch joined users for a normal event
app.get("/api/event-joined-users/:id", authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.id; // Event ID from URL
    const event = await eventDb.get(eventId); // Fetch event details by ID

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Return the joined users
    const joinedUsers = event.joinedUsers || [];
    res.status(200).json(joinedUsers);
  } catch (error) {
    console.error("Error fetching joined users:", error);
    res.status(500).json({ error: "Error fetching joined users" });
  }
});


// Endpoint to fetch voting results for a voting event
app.get("/api/voting-results/:eventId", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Fetch the voting event
    const votingEvent = await votingDb.get(eventId);

    if (!votingEvent) {
      return res.status(404).json({ error: "Voting event not found" });
    }

    // Fetch studentID for each votedUser
    const results = await Promise.all(
      votingEvent.voteOptions.map(async (option) => {
        const votersWithDetails = await Promise.all(
          (option.votedUsers || []).map(async (userId) => {
            // Query the users database to fetch studentID
            const user = await usersDb.get(userId);
            return {
              email: user.email, 
            };
          })
        );

        return {
          option: option.name,
          votes: option.votes || 0,
          votedUsers: votersWithDetails, // Replace IDs with user details
        };
      })
    );

    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching voting results:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Forum Posts
app.post("/posts", async (req, res) => {
  const { title, content, image, username, email, studentId } = req.body;

  console.log("Received post data:", req.body); // Debugging log

  if (!title || !content || !username || !email || !studentId) {
    console.error("Missing required fields:", {
      title,
      content,
      username,
      email,
      studentId,
    });
    return res.status(400).send({ message: "Missing required fields" });
  }

  const newPost = {
    title,
    content,
    image,
    username,
    email,
    studentId, // Ensure this is stored
    comments: [],
    createdAt: new Date().toISOString(),
  };

  try {
    const response = await postsDb.insert(newPost);
    const createdPost = await postsDb.get(response.id);
    console.log("Created post in database:", createdPost);
    res.status(201).send(createdPost);
  } catch (error) {
    console.error("Error creating post:", error);
    res
      .status(500)
      .send({ message: "Error creating post", error: error.message });
  }
});

// Comments
app.post("/posts/:id/comments", async (req, res) => {
  const { id } = req.params;
  const { text, username, email, studentId } = req.body;
  const newComment = {
    username,
    email,
    studentId,
    text,
    createdAt: new Date().toISOString(),
  };

  try {
    const post = await postsDb.get(id);
    post.comments.push(newComment);
    const response = await postsDb.insert(post);
    res
      .status(200)
      .send({ message: "Comment added successfully", id: response.id });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Error adding comment", error: error.message });
  }
});

// Get all posts
app.get("/posts", async (req, res) => {
  try {
    const posts = await postsDb.list({ include_docs: true });
    const formattedPosts = posts.rows.map((row) => ({
      _id: row.doc._id,
      title: row.doc.title,
      content: row.doc.content,
      username: row.doc.username,
      studentId: row.doc.studentId,
      email: row.doc.email,
      image: row.doc.image,
      comments: row.doc.comments || [],
      createdAt: row.doc.createdAt,
    }));
    res.status(200).send(formattedPosts);
  } catch (error) {
    res
      .status(500)
      .send({ message: "Error fetching posts", error: error.message });
  }
});

// My Posts
// Updated /api/user-posts
app.get("/api/user-posts", authenticateToken, async (req, res) => {
  try {
    const { email } = req.user; // Extract email from the decoded token
    console.log("Fetching posts for email:", email); // Debugging log

    const posts = await postsDb.find({
      selector: { email }, // Match the posts by user's email
    });

    const userPosts = posts.docs.map((post) => ({
      _id: post._id,
      title: post.title,
      content: post.content,
      image: post.image,
      createdAt: post.createdAt,
    }));

    res.status(200).send(userPosts);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res
      .status(500)
      .send({ message: "Error fetching user posts", error: error.message });
  }
});

// My Posts Delete
app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
  try {
      const postId = req.params.id;

      // Delete the post from the posts database
      const post = await postsDb.get(postId);
      await postsDb.destroy(post._id, post._rev);

      // Remove the post from all users' savedPosts
      const usersWithSavedPost = await usersDb.find({
          selector: {
              savedPosts: { $elemMatch: { _id: postId } },
          },
      });

      for (const user of usersWithSavedPost.docs) {
          user.savedPosts = user.savedPosts.filter((p) => p._id !== postId);
          await usersDb.insert({ ...user, _rev: user._rev });
      }

      res.status(200).json({ message: 'Post and associated saved entries deleted successfully.' });
  } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Failed to delete post.' });
  }
});

// My Posts Edit
app.put("/api/posts/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    const post = await postsDb.get(id);
    if (!post) {
      return res.status(404).send({ message: "Post not found" });
    }

    const updatedPost = {
      ...post,
      ...updatedData,
      _rev: post._rev, // Include the CouchDB revision ID
    };

    await postsDb.insert(updatedPost);
    res.status(200).send({ message: "Post updated successfully", updatedPost });
  } catch (error) {
    console.error("Error updating post:", error);
    res
      .status(500)
      .send({ message: "Error updating post", error: error.message });
  }
});

// Save Post
app.post("/api/save-post", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email; // Retrieve user email from token
    const { postId } = req.body;

    // Fetch the user
    const userResult = await usersDb.find({ selector: { email: userEmail } });
    const user = userResult.docs[0]; // Get the first matched user document
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch the post to save
    const postToSave = await postsDb.get(postId);
    if (!postToSave) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if the post is already saved
    const isPostAlreadySaved = (user.savedPosts || []).some(
      (savedPost) => savedPost._id === postId
    );
    if (isPostAlreadySaved) {
      return res.status(400).json({ error: "Post already saved" });
    }

    const savedPostDetails = {
      _id: postToSave._id,
      title: postToSave.title,
      content: postToSave.content,
      image: postToSave.image,
      createdAt: postToSave.createdAt,
      username: postToSave.username,
      studentId: postToSave.studentId,
    };

    const updatedSavedPosts = [...(user.savedPosts || []), savedPostDetails];
    await usersDb.insert({
      ...user,
      savedPosts: updatedSavedPosts,
      _rev: user._rev,
    });

    res.status(200).json({ message: "Post saved successfully!" });
  } catch (error) {
    console.error("Error saving post:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch saved posts
app.get("/api/saved-posts", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email; // Retrieve user email from token
    const userResult = await usersDb.find({ selector: { email: userEmail } });
    const user = userResult.docs[0]; // Get the first matched user document
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ savedPosts: user.savedPosts || [] });
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove saved post
app.post('/api/remove-saved-post', authenticateToken, async (req, res) => {
  try {
      const userEmail = req.user.email;
      const { postId } = req.body;

      // Fetch user
      const userResult = await usersDb.find({ selector: { email: userEmail } });
      const user = userResult.docs[0]; // Get the first matched user document
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      // Ensure the post exists in savedPosts
      if (!user.savedPosts || !user.savedPosts.some((p) => p._id === postId)) {
          return res.status(404).json({ error: 'Post not found in saved posts' });
      }

      // Filter out the post from savedPosts
      const updatedSavedPosts = user.savedPosts.filter((p) => p._id !== postId);
      await usersDb.insert({
          ...user,
          savedPosts: updatedSavedPosts,
          _rev: user._rev,
      });

      res.status(200).json({ message: 'Post removed successfully!' });
  } catch (error) {
      console.error('Error removing saved post:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

// If post is deleted from forum, how does it affect saved posts?
// Modify the delete post route to clean up savedPosts
// Enhanced delete post route
app.delete('/api/delete-post/:postId', authenticateToken, async (req, res) => {
  try {
      const { postId } = req.params;

      // Delete the post from the posts database
      const post = await postsDb.get(postId);
      if (!post) {
          return res.status(404).json({ error: 'Post not found' });
      }
      await postsDb.destroy(postId, post._rev);

      // Update all users' savedPosts arrays
      const users = await usersDb.find({ selector: {} });
      const userUpdates = users.docs.map(async (user) => {
          const updatedSavedPosts = (user.savedPosts || []).filter((savedPost) => savedPost._id !== postId);
          await usersDb.insert({
              ...user,
              savedPosts: updatedSavedPosts,
              _rev: user._rev,
          });
      });
      await Promise.all(userUpdates);

      res.status(200).json({ message: 'Post deleted and references removed from saved posts.' });
  } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Internal server error.' });
  }
});

// Flag Post
app.post("/api/flag-post", authenticateToken, async (req, res) => {
  const { postId } = req.body;
  const userEmail = req.user.email;

  try {
      const post = await postsDb.get(postId);

      // Check if the user has already flagged this post
      if (post.flaggedBy?.includes(userEmail)) {
          return res.status(400).json({ message: "Post already flagged by this user" });
      }

      // Add user to flaggedBy and update flagVerified
      post.flaggedBy = [...(post.flaggedBy || []), userEmail];
      post.flagVerified = true; // Set flagVerified to true
      post.flagCount = post.flaggedBy.length; // Update flag count

      await postsDb.insert(post);
      res.status(200).json({ message: "Post flagged successfully" });
  } catch (error) {
      console.error("Error flagging post:", error);
      res.status(500).json({ message: "Failed to flag post" });
  }
});

// GET Flagged Posts
app.get("/api/flagged-posts", authenticateToken, async (req, res) => {
  try {
      const flaggedPosts = await postsDb.find({
          selector: { flagVerified: true },
      });

      const formattedPosts = flaggedPosts.docs.map((post) => ({
          _id: post._id,
          title: post.title,
          content: post.content,
          image: post.image,
          createdAt: post.createdAt,
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

  try {
      const post = await postsDb.get(postId);

      // Remove the post from savedPosts for all users
      const allUsers = await usersDb.find({ selector: {} });
      for (const user of allUsers.docs) {
          if (user.savedPosts) {
              user.savedPosts = user.savedPosts.filter((saved) => saved._id !== postId);
              await usersDb.insert(user);
          }
      }

      // Delete the post
      await postsDb.destroy(post._id, post._rev);
      res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
      console.error("Error deleting flagged post:", error);
      res.status(500).json({ message: "Failed to delete flagged post" });
  }
});

// Moderator upload event
app.post("/api/moderator/upload-event", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email; // Retrieve user email from the token
    const {
      title,
      description,
      date,
      time,
      image,
      location,
      eventType,
      voteOptions,
    } = req.body;

    // Fetch the user
    const userResult = await usersDb.find({ selector: { email: userEmail } });
    const user = userResult.docs[0]; // Get the first matched user document
    if (!user) {
      return res.status(404).json({ error: "Moderator not found" });
    }

    if (user.role !== "Moderator") {
      return res.status(403).json({ error: "Unauthorized: Not a Moderator" });
    }

    // Validate event type and vote options for voting events
    if (eventType === "voting" && (!voteOptions || voteOptions.length < 2)) {
      return res
        .status(400)
        .json({ error: "Voting events require at least 2 vote options" });
    }

    const eventDetails = {
      title,
      description,
      date,
      time,
      image,
      location,
      eventType: eventType || "normal", // Default to normal
      voteOptions:
        eventType === "voting"
          ? voteOptions.map((option) => ({ ...option, votes: 0 }))
          : undefined,
      dateCreated: new Date().toISOString(),
    };

    // Insert the event into the appropriate database (normal or voting)
    const dbToUse = eventType === "voting" ? votingDb : eventDb;
    const eventResponse = await dbToUse.insert(eventDetails);

    // Update the moderator's myEvents attribute
    const newEventId = eventResponse.id;
    const updatedMyEvents = [...(user.myEvents || []), newEventId];
    await usersDb.insert({
      ...user,
      myEvents: updatedMyEvents,
      _rev: user._rev,
    });

    res.status(201).json({
      message: "Event uploaded successfully",
      eventId: newEventId,
    });
  } catch (error) {
    console.error("Error uploading event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to fetch user-created events
// Get events created by the current user
app.get("/api/user-created-events", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Extract the user ID from the token

    // Fetch normal events created by the user
    const normalEventsResult = await eventDb.find({
      selector: {
        createdBy: userId, // Match the `createdBy` field
        eventType: "normal", // Ensure only normal events are retrieved
      },
    });

    const normalEvents = normalEventsResult.docs.map((event) => ({
      _id: event._id,
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      totalJoined: event.totalJoined || 0,
      joinedUsers: event.joinedUsers || [],
    }));

    // Fetch voting events created by the user
    const votingEventsResult = await votingDb.find({
      selector: {
        createdBy: userId, // Match the `createdBy` field
        eventType: "voting", // Ensure only voting events are retrieved
      },
    });

    const votingEvents = votingEventsResult.docs.map((event) => ({
      _id: event._id,
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      voteOptions: event.voteOptions || [],
    }));

    // Respond with both normal and voting events
    res.status(200).json({
      normalEvents,
      votingEvents,
    });
  } catch (error) {
    console.error("Error fetching user-created events:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to fetch joined users for a normal event
app.get(
  "/api/event-joined-users/:eventId",
  authenticateToken,
  async (req, res) => {
    try {
      const eventId = req.params.eventId;

      const event = await eventDb.get(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const joinedUsers = await Promise.all(
        (event.joinedUsers || []).map(async (userId) => {
          const user = await usersDb.get(userId);
          return {
            username: user.username,
            userId: user._id,
            studentId: user.studentId,
          };
        })
      );

      res.status(200).json(joinedUsers);
    } catch (error) {
      console.error("Error fetching joined users:", error);
      res.status(500).json({ error: "Error fetching joined users" });
    }
  }
);

// Endpoint to fetch voting results for a voting event
app.get("/api/voting-results/:eventId", authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;

    const votingEvent = await votingDb.get(eventId);
    if (!votingEvent) {
      return res.status(404).json({ error: "Voting event not found" });
    }

    const votingResults = await Promise.all(
      votingEvent.voteOptions.map(async (option) => {
        const voters = await Promise.all(
          (option.voters || []).map(async (voterId) => {
            const user = await usersDb.get(voterId);
            return {
              username: user.username,
              userId: user._id,
              studentId: user.studentId,
            };
          })
        );

        return {
          option: option.name,
          votes: option.votes,
          voters,
        };
      })
    );

    res.status(200).json(votingResults);
  } catch (error) {
    console.error("Error fetching voting results:", error);
    res.status(500).json({ error: "Error fetching voting results" });
  }
});

// Endpoint to get an event total joined user count
app.get(
  "/api/users/joined-events-count",
  authenticateToken,
  async (req, res) => {
    try {
      const userEmail = req.user.email; // Extract user email from the token

      // Fetch the user from the database
      const userResult = await usersDb.find({ selector: { email: userEmail } });
      const user = userResult.docs[0];
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
  }
);

// Endpoint to get option vote count
app.get("/api/voting-event/:eventId", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Fetch the voting event by ID
    const event = await votingDb.get(eventId);
    if (!event || event.eventType !== "voting") {
      return res.status(404).json({ error: "Voting event not found" });
    }

    // Extract vote options and their counts
    const voteOptions = event.voteOptions.map((option) => ({
      name: option.name,
      votes: option.votes,
    }));

    res.status(200).json({ voteOptions });
  } catch (error) {
    console.error("Error fetching voting event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
