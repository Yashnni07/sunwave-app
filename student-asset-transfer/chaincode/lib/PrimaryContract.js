/*
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

const { Contract } = require('fabric-contract-api');

class PrimaryContract extends Contract {
   // Function to insert a default admin entry
    async createDefaultAdmin(ctx, username, email, role, password) {
        const adminKey = email;  // Use email as the unique ID and key for the admin entry

        // Check if the admin entry already exists in the ledger (CouchDB)
        const adminExists = await ctx.stub.getState(adminKey);
        if (adminExists && adminExists.length > 0) {
            console.log('Admin entry already exists.');
            return;  // Admin already exists, exit the function
        }

        // Create the default admin object
        const admin = {
            username: username,
            password: password,  // Encrypted password
            email: email,
            role: role,
            verified: true,  // Mark as verified by default
        };

        // Store the admin data in the ledger (CouchDB)
        // Use the email as both the document ID and key for easy retrieval
        await ctx.stub.putState(adminKey, Buffer.from(JSON.stringify(admin)));
        console.log('Default admin created in CouchDB with email as ID and key.');
    }

    // Function to check if a user already exists by email
    async fetchUserByEmail(ctx, email) {
        const userAsBytes = await ctx.stub.getState(email);
        if (!userAsBytes || userAsBytes.length === 0) {
            return null; // User does not exist
        }
        return userAsBytes.toString();
    }

    // Function to register a new user
    async registerUser(ctx, username, studentId, password, email, dob, otp) {
        const existingUser = await this.fetchUserByEmail(ctx, email);
        if (existingUser) {
            throw new Error('Email already exists');
        }

        // Create the user object
        const user = {
            username,
            studentId,
            password,
            email,
            dob,
            verified: false,  // Mark user as not verified initially
            otp,
            role: "User",  // Default role
        };

        // Save the user to the ledger using the email as key
        await ctx.stub.putState(email, Buffer.from(JSON.stringify(user)));
        console.log('User registered successfully');
    }

    // Function to update user verification status
    async updateUserVerification(ctx, userUpdateJson) {
        // Parse the incoming user update data
        const userUpdate = JSON.parse(userUpdateJson);
        const { email, isVerified } = userUpdate;

        // Fetch the user by email from the ledger
        const userAsBytes = await ctx.stub.getState(email);
        if (!userAsBytes || userAsBytes.length === 0) {
            throw new Error(`User with email ${email} not found`);
        }

        const user = JSON.parse(userAsBytes.toString());

        // Check if OTP matches
        if (!user.otp || user.otp !== userUpdate.otp) {
            throw new Error("OTP mismatch.");
        }

        // Update the user verification status
        user.isVerified = isVerified;  // Set user as verified
        user.otp = null;  // Clear OTP after successful verification

        // Save the updated user back to the ledger
        await ctx.stub.putState(email, Buffer.from(JSON.stringify(user)));

        console.log(`User with email ${email} has been verified and status updated.`);

        return "User verification status updated successfully";
    }

    // Function to update user details in Fabric
    async updateUser(ctx, id, userData) {
        const userAsBytes = await ctx.stub.getState(id); // Fetch current user data by ID
        if (!userAsBytes || userAsBytes.length === 0) {
            throw new Error(`User with ID ${id} does not exist`);
        }
    
        const user = JSON.parse(userAsBytes.toString()); // Parse the current user data
    
        // Parse the incoming updated user data
        const updatedUser = JSON.parse(userData);
    
        // Update fields if provided in userData, otherwise retain existing values
        user.username = updatedUser.username || user.username;
        user.email = updatedUser.email || user.email;
        user.dob = updatedUser.dob || user.dob;
        user.gender = updatedUser.gender || user.gender;
        user.nationality = updatedUser.nationality || user.nationality;
        user.program = updatedUser.program || user.program;
        user.intake = updatedUser.intake || user.intake;
        user.role = updatedUser.role || user.role;
    
        // Update the OTP field if a new OTP is provided
        user.otp = updatedUser.otp || user.otp;
    
        // Ensure that savedPosts is initialized as an empty array if not provided
        user.savedPosts = Array.isArray(updatedUser.savedPosts) ? updatedUser.savedPosts : user.savedPosts || [];
    
        // Store the updated user back to the ledger
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(user)));
    
        return JSON.stringify(user); // Return updated user details
    }    

    async queryAllUsers(ctx) {
        const queryString = {
            selector: {
                role: "User", // Filter by role "User"
            },
        };
    
        let resultsIterator;
        try {
            // Get query results
            resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
    
            const allResults = [];
            while (true) {
                const res = await resultsIterator.next();
                if (res.done) {
                    // Close the iterator when done
                    await resultsIterator.close();
                    return allResults;  // Return the accumulated results
                }
                if (res.value && res.value.value.toString()) {
                    const record = JSON.parse(res.value.value.toString('utf8'));
                    allResults.push(record);
                }
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            throw new Error(`Error fetching users: ${error.message}`);  // Throw a new error with more details
        } finally {
            // Ensure the iterator is closed even if an error occurs
            if (resultsIterator) {
                await resultsIterator.close();
            }
        }
    }    

   // Helper function to increment the event count and return the new count
    async incrementEventCount(ctx) {
        const eventCountKey = 'eventCount';  // Key to track the event count
        let eventCountBytes = await ctx.stub.getState(eventCountKey);
        let eventCount = 0;

        if (eventCountBytes && eventCountBytes.length > 0) {
            // If the event count exists, parse the value
            eventCount = parseInt(eventCountBytes.toString());
        }

        // Increment the event count
        eventCount += 1;

        // Save the updated count back to the ledger
        await ctx.stub.putState(eventCountKey, Buffer.from(eventCount.toString()));

        return eventCount;  // Return the updated event count
    }

    // Function to post an event on the ledger
    async postEvent(ctx, title, description, date, time, eventType, image, location, creatorEmail, voteOptions) {
        // Validate eventType
        const validEventTypes = ['normal', 'voting'];
        if (!validEventTypes.includes(eventType)) {
            throw new Error(`Invalid eventType: ${eventType}. Must be one of ${validEventTypes.join(', ')}`);
        }

        // Parse voteOptions if it's a string
        if (eventType === 'voting') {
            if (typeof voteOptions === 'string') {
                try {
                    voteOptions = JSON.parse(voteOptions);
                } catch (error) {
                    throw new Error('voteOptions must be a valid JSON array for voting events');
                }
            }

            if (!Array.isArray(voteOptions)) {
                throw new Error('voteOptions must be an array for voting events');
            }

            if (voteOptions.length === 0) {
                throw new Error('voteOptions cannot be empty for voting events');
            }

            // Validate each voteOption
            voteOptions.forEach((option, index) => {
                if (!option.name || typeof option.name !== 'string') {
                    throw new Error(`voteOptions[${index}].name is required and must be a string`);
                }
                // Initialize votes and votedUsers if not provided
                if (option.votes === undefined) {
                    option.votes = 0;
                }
                if (!Array.isArray(option.votedUsers)) {
                    option.votedUsers = [];
                }
            });
        } else {
            // For non-voting events, ensure voteOptions is undefined or an empty array
            voteOptions = [];
        }

        // Use the helper function to increment the event count and get the new count
        const eventCount = await this.incrementEventCount(ctx); // Use `this` to call incrementEventCount

        // Generate the event ID in the format 'event-1', 'event-2', etc.
        const eventId = `event-${eventCount}`;

        // Create the event object with the provided data
        const event = {
            eventId,      // Set the eventId as generated
            title,
            description,
            date,
            time,
            eventType,    // Use eventType (normal or voting)
            image,
            location,
            voteOptions,  // Already validated and structured
            creatorEmail,     // Include creatorEmail
            status: "active", // Default status field set to "active"
            joinedUsers: [], // Initialize the joinedUsers field as an empty array
        };

        // Save the event data to the ledger using the generated eventId
        await ctx.stub.putState(eventId, Buffer.from(JSON.stringify(event)));

        return eventId;  // Return the event ID
    }

    async getEvents(ctx, eventType) {
        // Build the selector based on whether creatorEmail is provided
        const selector = {
            eventType: eventType,
            status: { $ne: 'deleted' },
        };
    
        const queryString = {
            selector: selector,
        };
    
        // Query the CouchDB state database
        const queryResults = await ctx.stub.getQueryResult(JSON.stringify(queryString));
    
        // Use the getAllResults function (same as in getAllPosts)
        const results = await this.getAllResults(queryResults, false);  // Process the results
    
        if (results.length === 0) {
            console.log("No events found in the ledger.");
        } else {
            console.log("Fetched events from ledger:", results);
        }
    
        // Return the results as a JSON string
        return JSON.stringify(results);
    }

    async getAllEvents(ctx, eventType, creatorEmail = null) {
        // Build the selector based on whether creatorEmail is provided
        const selector = {
            eventType: eventType,
            status: { $ne: 'deleted' },
        };
    
        if (creatorEmail) {
            selector.creatorEmail = creatorEmail;
        }
    
        const queryString = {
            selector: selector,
        };
    
        // Query the CouchDB state database
        const queryResults = await ctx.stub.getQueryResult(JSON.stringify(queryString));
    
        // Use the getAllResults function (same as in getAllPosts)
        const results = await this.getAllResults(queryResults, false);  // Process the results
    
        if (results.length === 0) {
            console.log("No events found in the ledger.");
        } else {
            console.log("Fetched events from ledger:", results);
        }
    
        // Return the results as a JSON string
        return JSON.stringify(results);
    }
    
    async deleteEvent(ctx, eventId, userEmail) {
        // Check if the event exists
        const eventKey = eventId;
        const eventAsBytes = await ctx.stub.getState(eventKey);
    
        if (!eventAsBytes || eventAsBytes.length === 0) {
            throw new Error(`Event with ID ${eventId} not found.`);
        }
    
        const event = JSON.parse(eventAsBytes.toString());
    
        // Fetch user data to check their role
        const userKey = userEmail;
        const userAsBytes = await ctx.stub.getState(userKey);
        
        if (!userAsBytes || userAsBytes.length === 0) {
            throw new Error(`User with email ${userEmail} not found.`);
        }
    
        const user = JSON.parse(userAsBytes.toString());
    
        // Verify that the user has sufficient privileges (role must be either Moderator or Admin)
        if (user.role !== "Moderator" && user.role !== "Admin") {
            throw new Error(`User ${userEmail} is not authorized to delete this event. Must be a Moderator or Admin.`);
        }
    
        // Mark the event as deleted (soft delete)
        event.status = 'deleted';  // or you can use a boolean flag like event.isDeleted = true;
    
        // Update the event data on the blockchain with the new status
        await ctx.stub.putState(eventKey, Buffer.from(JSON.stringify(event)));
    
        // Optionally, log the deletion (or soft delete)
        console.log(`Event ${eventId} marked as deleted by ${userEmail}`);
    
        // Return a structured JSON response
        return JSON.stringify({ message: `Event ${eventId} deleted successfully.` });
    }    
    
    // Fetch events a user has joined
    async getUserJoinedEvents(ctx, userEmail) {
        // Log the incoming user email
        console.log(`Fetching events for user: ${userEmail}`);

        // Query to filter events where the user's email is in the "joinedUsers" array
        const queryString = {
            selector: {
                joinedUsers: {
                    $elemMatch: {
                        email: userEmail  // Match the user's email in the joinedUsers array
                    }
                },
                status: { $ne: 'deleted' }  // Exclude events marked as deleted
            },
        };

        // Log the query string for debugging
        console.log("Query String:", JSON.stringify(queryString));

        try {
            // Execute the query
            const resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));

            // Collect results into an array
            const results = await this.getAllResults(resultsIterator, false);

            // Log the number of results found
            console.log(`Found ${results.length} events for the user.`);

            // Return the full event data directly
            return JSON.stringify(results);  // Return raw event data as it is
        } catch (error) {
            // Log any error that occurs during query execution
            console.error("Error fetching joined events:", error);
            throw new Error("Failed to fetch events for the user.");
        }
    }

    // Fetch events a user has voted on
    async getUserVotedEvents(ctx, userEmail) {
        const queryString = {
            selector: {
                votedBy: userEmail,  // Filter events where the user is listed in "votedBy"
                status: { $ne: 'deleted' },  // Exclude events marked as deleted
            },
        };

        // Execute the query
        const resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = await this.getAllResults(resultsIterator, false);
        return results; // Return the events the user voted on
    }

    async joinEvent(ctx, userEmail, userId, eventId) {
        // Fetch the event by ID
        const eventKey = eventId;
        const eventDataBytes = await ctx.stub.getState(eventKey);
        if (!eventDataBytes || eventDataBytes.length === 0) {
            throw new Error(`Event with ID ${eventId} not found`);
        }
        const eventData = JSON.parse(eventDataBytes.toString());
    
        // Fetch the user by userId
        const userKey = userId;  // Use userId to fetch the user's data
        const userDataBytes = await ctx.stub.getState(userKey);
        if (!userDataBytes || userDataBytes.length === 0) {
            throw new Error(`User with ID ${userId} not found`);
        }
        const userData = JSON.parse(userDataBytes.toString());
    
        // Extract username from userData (if not passed as a parameter)
        const finalUsername = userData.username;  // Fallback to userData.username if not passed
    
        // Check if the user is already in the event's joinedUsers list
        const isUserAlreadyJoined = (eventData.joinedUsers || []).some(
            (user) => user.email === userEmail
        );
        if (isUserAlreadyJoined) {
            throw new Error("User has already joined this event");
        }
    
        // Add the user to the event's joinedUsers array
        const updatedEventData = {
            ...eventData,
            joinedUsers: [
                ...(eventData.joinedUsers || []),
                {
                    userId,
                    username: finalUsername,
                    email: userEmail,
                },
            ],
            totalJoined: (eventData.totalJoined || 0) + 1, // Increment the totalJoined count
        };
    
        // Save the updated event data
        await ctx.stub.putState(eventKey, Buffer.from(JSON.stringify(updatedEventData)));
    
        // Add the event to the user's joinedEvents array
        const updatedUserData = {
            ...userData,
            joinedEvents: [
                ...(userData.joinedEvents || []),
                {
                    eventId,
                    title: eventData.title,
                    date: eventData.date,
                    time: eventData.time,
                },
            ],
        };
    
        // Save the updated user data
        await ctx.stub.putState(userKey, Buffer.from(JSON.stringify(updatedUserData)));
    
        return `User ${userEmail} successfully joined event ${eventId}`;
    }    

    async voteEvent(ctx, userEmail, eventId, selectedOption) {
        // Fetch the event by ID
        const eventKey = eventId;
        const eventDataBytes = await ctx.stub.getState(eventKey);
        if (!eventDataBytes || eventDataBytes.length === 0) {
            throw new Error(`Event with ID ${eventId} not found`);
        }
        const eventData = JSON.parse(eventDataBytes.toString());
    
        // Fetch the user by email
        const userKey = userEmail;
        const userDataBytes = await ctx.stub.getState(userKey);
        if (!userDataBytes || userDataBytes.length === 0) {
            throw new Error(`User with email ${userEmail} not found`);
        }
        const userData = JSON.parse(userDataBytes.toString());
    
        // Check if the user has already voted for this event
        const hasVoted = (userData.votedEvents || []).some(
            (v) => v.eventId === eventId
        );
        if (hasVoted) {
            throw new Error("User has already voted for this event");
        }
    
        // Update the vote options and add the vote to the selected option
        const updatedVoteOptions = eventData.voteOptions.map((option) => {
            if (option.name === selectedOption) {
                return {
                    ...option,
                    votes: option.votes + 1,
                    votedUsers: [...(option.votedUsers || []), userEmail],
                };
            }
            return option;
        });
    
        // Update the event data with the new vote counts
        const updatedEventData = {
            ...eventData,
            voteOptions: updatedVoteOptions,
        };
    
        // Save the updated event
        await ctx.stub.putState(eventKey, Buffer.from(JSON.stringify(updatedEventData)));
    
        // Add the event to the user's votedEvents array
        const updatedUserData = {
            ...userData,
            votedEvents: [
                ...(userData.votedEvents || []),
                { eventId, selectedOption },
            ],
        };
    
        // Save the updated user data
        await ctx.stub.putState(userKey, Buffer.from(JSON.stringify(updatedUserData)));
    
        return `Vote for event ${eventId} submitted successfully by ${userEmail}`;
    }
    
    async updateEvent(ctx, eventId, updatedEventData) {
        // Fetch the event by ID
        const eventKey = eventId;
        const eventDataBytes = await ctx.stub.getState(eventKey);
        if (!eventDataBytes || eventDataBytes.length === 0) {
            throw new Error(`Event with ID ${eventId} not found`);
        }
        const eventData = JSON.parse(eventDataBytes.toString());
    
        // Parse the updatedEventData JSON string into an object
        let updatedData;
        try {
            updatedData = JSON.parse(updatedEventData);
        } catch (error) {
            throw new Error('Invalid JSON format for updatedEventData');
        }
    
        // Ensure there is no _id field in the updated data
        delete updatedData._id;  // Remove _id if it exists
    
        // Merge the existing event data with the updated data using the parsed object
        const updatedEvent = {
            ...eventData,              // Preserve existing data
            ...updatedData,            // Overwrite with new data from parsed object
            joinedUsers: updatedData.joinedUsers || eventData.joinedUsers, // Preserve existing joinedUsers if not updated
            voteOptions: updatedData.voteOptions || eventData.voteOptions, // Preserve existing voteOptions if not updated
            eventId,                   // Ensure the eventId remains unchanged
        };
    
        // Save the updated event back to the blockchain
        await ctx.stub.putState(eventKey, Buffer.from(JSON.stringify(updatedEvent)));
    
        // Optionally, log the update
        console.log(`Event ${eventId} updated successfully`);
    
        // Return a structured JSON response
        return JSON.stringify({ message: `Event with ID ${eventId} updated successfully.` });
    }

    async getUserCreatedEvents(ctx, userEmail) {
        // Query to fetch events created by the user, based on their email
        const queryString = {
            selector: {
                'creatorEmail': userEmail,  // Filter events where the user's email is in the creator field
                status: { $ne: 'deleted' },  // Exclude deleted events
            },
        };
    
        const resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = await this.getAllResults(resultsIterator, false); // Get results from the iterator
    
        return JSON.stringify(results);  // Return events as JSON
    } 
    
    async getEventJoinedUsers(ctx, eventId) {
        // Query to fetch event by eventId
        const eventKey = eventId;
        const eventData = await ctx.stub.getState(eventKey);  // Get event from blockchain
    
        if (!eventData || eventData.length === 0) {
            throw new Error(`Event with ID ${eventId} not found`);
        }
    
        const event = JSON.parse(eventData.toString());
    
        // Return joined users
        return JSON.stringify(event.joinedUsers || []);  // Return joined users array (or empty array if none)
    }
    
    async getVotingResults(ctx, eventId) {
        const eventKey = eventId;
        const eventDataBytes = await ctx.stub.getState(eventKey);
    
        if (!eventDataBytes || eventDataBytes.length === 0) {
            throw new Error(`Voting event with ID ${eventId} not found`);
        }
    
        const eventData = JSON.parse(eventDataBytes.toString());
    
        if (eventData.eventType !== 'voting') {
            throw new Error(`Event with ID ${eventId} is not a voting event`);
        }
    
        // Check if voteOptions is an array
        if (!Array.isArray(eventData.voteOptions)) {
            throw new Error(`voteOptions is not an array for event ${eventId}`);
        }
    
        // Prepare voting results manually
        const results = [];
        for (let i = 0; i < eventData.voteOptions.length; i++) {
            const option = eventData.voteOptions[i];
            const result = {
                option: option.name,
                votes: option.votes || 0,
                votedUsers: option.votedUsers || [], // This will contain user IDs
            };
            results.push(result);
        }
    
        return JSON.stringify(results); // Return results as JSON
    }

    async getNextPostId(ctx) {
        const postIndexKey = 'post-index'; // Key for the post index counter
    
        // Get the current post index (it should be stored in the state)
        const postIndexBytes = await ctx.stub.getState(postIndexKey);
    
        let postIndex = 0;
    
        // If the index does not exist, start from 0
        if (postIndexBytes && postIndexBytes.length > 0) {
            postIndex = parseInt(postIndexBytes.toString());
        }
    
        // Increment the index
        postIndex += 1;
    
        // Store the updated index back in the state
        await ctx.stub.putState(postIndexKey, Buffer.from(postIndex.toString()));
    
        // Return the next postId in the format "post-{postIndex}"
        return `post-${postIndex}`;
    }
    
    async createForumPost(ctx, userEmail, postDetails) {
        // Generate a unique postId using the next post index
        const postId = await this.getNextPostId(ctx);  // Get the next post ID in the format "post-1", "post-2", etc.
    
        // Parse the post details to ensure it's a valid object
        const postData = {
            ...JSON.parse(postDetails),  // Parse the post details into a valid object
            postId: postId,              // Add the generated postId to the post data
            status: "active",            // Set default status to "active"
        };
    
        // Convert the post data to a JSON string
        const postDataString = JSON.stringify(postData);
    
        // Insert the post into the blockchain with the generated post ID
        const postKey = postId; // The key format is `post-{postId}`
        await ctx.stub.putState(postKey, Buffer.from(postDataString));  // Ensure Buffer.from() is passed a string
    
        // Optionally log the creation of the post
        console.log(`Forum post created: ${postId}`);
    
        // Return the post ID to the caller
        return postId;
    }    

    async addCommentToPost(ctx, postId, commentDetails) {
        // Fetch the post from the state using the provided postId
        const postKey = postId;
        const postAsBytes = await ctx.stub.getState(postKey);
        
        if (!postAsBytes || postAsBytes.length === 0) {
            throw new Error(`Post with ID ${postId} not found`);
        }
    
        // Parse the existing post (post is now a JavaScript object)
        const post = JSON.parse(postAsBytes.toString());
    
        // Parse the commentDetails if it is passed as a string (it may be stringified)
        let comment;
        try {
            // Try to parse commentDetails, if it's a string
            comment = typeof commentDetails === 'string' ? JSON.parse(commentDetails) : commentDetails;
        } catch (err) {
            throw new Error("Failed to parse comment details");
        }
    
        // Add the new comment to the post (comment is now a proper object)
        post.comments.push(comment);  // No need to stringify here
    
        // Save the updated post back to the state
        await ctx.stub.putState(postKey, Buffer.from(JSON.stringify(post)));
    }    
      
    async getAllPosts(ctx) {
        const queryString = {
            selector: {
                postId: { $exists: true },  // Ensure postId exists in the document
                status: { $ne: "deleted" } // Exclude posts with status 'deleted'
            },
        };
    
        // Query the CouchDB state database
        const resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = await this.getAllResults(resultsIterator, false);  // Process the results
    
        if (results.length === 0) {
            console.log("No posts found in the ledger.");
        } else {
            console.log("Fetched posts from ledger:", results);
        }
    
        return JSON.stringify(results);  // Return the results as JSON string
    }
    
    async getAllResults(iterator, isHistory) {
        const results = [];
        let res = { done: false };
    
        while (!res.done) {
            res = await iterator.next();
    
            if (res.value) {
                let jsonRes = {};
                if (isHistory && isHistory === true) {
                    jsonRes = {
                        txId: res.value.txId,
                        timestamp: res.value.timestamp,
                        isDelete: res.value.isDelete,
                        value: JSON.parse(res.value.value.toString('utf8')),
                    };
                } else {
                    jsonRes = JSON.parse(res.value.value.toString('utf8')); // Parse the result value
                    jsonRes._id = res.value.key; // Add the document key as an _id field
                }
                results.push(jsonRes); // Push the parsed result into the array
            }
    
            if (res.done) {
                await iterator.close();
            }
        }
    
        return results; // Return the accumulated results as an array
    }
    

    async getUserPostsByEmail(ctx, email) {
        // Query string to find posts by the user's email, excluding deleted posts
        const queryString = {
            selector: {
                email: email,  // Match the posts by user's email
                status: { $ne: 'deleted' }  // Exclude posts with status 'deleted'
            },
        };
    
        const resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = await this.getAllResults(resultsIterator, false); // Helper function to process results
    
        return JSON.stringify(results); // Return the user posts as a JSON string
    }    

    async deletePost(ctx, postId) {
        // Construct the post key
        const postKey = postId;
    
        // Fetch the post by postId
        const postAsBytes = await ctx.stub.getState(postKey);
        if (!postAsBytes || postAsBytes.toString() === '') {
            throw new Error(`Post with ID ${postId} does not exist.`);
        }
    
        const post = JSON.parse(postAsBytes.toString());
    
        // Mark the post as deleted (soft delete)
        post.status = 'deleted'; // or post.isDeleted = true
    
        // Update the post data on the blockchain with the new status
        await ctx.stub.putState(postKey, Buffer.from(JSON.stringify(post)));
    
        // Fetch users who have saved this post
        const queryString = {
            selector: {
                savedPosts: { $elemMatch: { _id: postId } },
            },
        };
    
        const resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = await this.getAllResults(resultsIterator, false);
    
        // Iterate over each user and remove the post from their savedPosts
        for (const user of results) {
            const userAsBytes = await ctx.stub.getState(user.userId);
            if (!userAsBytes || userAsBytes.toString() === '') {
                continue;
            }
    
            const userData = JSON.parse(userAsBytes.toString());
            userData.savedPosts = userData.savedPosts.filter((p) => p._id !== postId);
            await ctx.stub.putState(user.userId, Buffer.from(JSON.stringify(userData)));
        }
    
        // Optionally, log the deletion (soft delete)
        console.log(`Post ${postId} marked as deleted`);
    
        return JSON.stringify({ message: `Post ${postId} deleted successfully.` });
    }    
    
    async updatePost(ctx, postId, updatedData) {
        // Ensure the key format matches the one in CouchDB
        const postKey = postId;
      
        // Fetch the current post by its ID
        const postAsBytes = await ctx.stub.getState(postKey);
        if (!postAsBytes || postAsBytes.toString() === '') {
            throw new Error(`Post with id ${postId} does not exist`);
        }
      
        const post = JSON.parse(postAsBytes.toString());  // Parse the fetched data
      
        // Merge the existing post with the updated data
        const updatedPost = {
            ...post,
            ...updatedData,  // Overwrite existing fields with updated data
        };
      
        // Save the updated post back to the state
        await ctx.stub.putState(postKey, Buffer.from(JSON.stringify(updatedPost)));  // Ensure it's stringified correctly
      
        // Return the updated post correctly serialized as JSON string
        return JSON.stringify(updatedPost);  // Return updated post as a JSON string
    }
          
    async savePost(ctx, userEmail, postId) {
        // Fetch the user by email using the fetchUserByEmail function
        const userAsBytes = await this.fetchUserByEmail(ctx, userEmail);
        if (!userAsBytes) {
            throw new Error(`User with email ${userEmail} does not exist`);
        }
        const user = JSON.parse(userAsBytes);
    
        // Check if the post is already saved by the user
        const isPostAlreadySaved = (user.savedPosts || []).includes(postId);
    
        if (isPostAlreadySaved) {
            return JSON.stringify({ error: "Post already saved" });
        }
    
        // Add the postId to the user's savedPosts array
        const updatedSavedPosts = [...(user.savedPosts || []), postId];
    
        const updatedUser = {
            ...user,
            savedPosts: updatedSavedPosts,
            _rev: user._rev, // Retain the revision ID for consistency
        };
    
        // Save the updated user data back to the blockchain
        await ctx.stub.putState(userEmail, Buffer.from(JSON.stringify(updatedUser)));
    
        return JSON.stringify({ message: "Post saved successfully!" });
    }    

    async fetchSavedPosts(ctx, userEmail) {
        const userAsBytes = await this.fetchUserByEmail(ctx, userEmail); // Use existing function to fetch user by email
        if (!userAsBytes) {
            throw new Error(`User with email ${userEmail} not found`);
        }
    
        const user = JSON.parse(userAsBytes); // Parse the user data
    
        // Fetch full post details for each saved postId
        const savedPosts = await Promise.all(
            (user.savedPosts || []).map(async (postId) => {
                const postAsBytes = await ctx.stub.getState(postId);
                if (!postAsBytes || postAsBytes.toString() === '') {
                    throw new Error(`Post with id ${postId} does not exist`);
                }
                const post = JSON.parse(postAsBytes.toString());
                return {
                    _id: post._id,
                    title: post.title,
                    content: post.content,
                    image: post.image,
                    createdAt: post.createdAt,
                    username: post.username,
                    studentId: post.studentId,
                };
            })
        );
    
        return JSON.stringify({ savedPosts });
    }    

    // Function to remove a saved post from the user's savedPosts
    async removeSavedPost(ctx, userEmail, postId) {
        const userAsBytes = await this.fetchUserByEmail(ctx, userEmail); // Fetch the user by email
        if (!userAsBytes) {
            throw new Error(`User with email ${userEmail} not found`);
        }

        const user = JSON.parse(userAsBytes); // Parse the user data

        // Find and remove the post from savedPosts
        const updatedSavedPosts = user.savedPosts.filter((p) => p._id !== postId);

        // Update the user's data with the modified savedPosts
        user.savedPosts = updatedSavedPosts;

        // Save the updated user object back to the blockchain
        await ctx.stub.putState(userEmail, Buffer.from(JSON.stringify(user)));

        return JSON.stringify({ message: 'Saved post removed successfully' });
    }

    async fetchPost(ctx, postId) {
        // Fetch the post data by postId using the stub
        const postAsBytes = await ctx.stub.getState(postId);
        
        // If the post doesn't exist, throw an error
        if (!postAsBytes || postAsBytes.toString() === '') {
            throw new Error(`Post with id ${postId} does not exist`);
        }
        
        // Parse the post data and return it as a JSON string
        const post = JSON.parse(postAsBytes.toString());
        
        return JSON.stringify(post);
    }

    // Flag a post
    async flagPost(ctx, postId, userEmail) {
        // Fetch the post from the blockchain
        const postAsBytes = await ctx.stub.getState(postId);
        if (!postAsBytes || postAsBytes.length === 0) {
        throw new Error(`Post with ID ${postId} not found`);
        }
    
        const post = JSON.parse(postAsBytes.toString()); // Parse the post object
    
        // Check if the user has already flagged the post
        if (post.flaggedBy && post.flaggedBy.includes(userEmail)) {
        throw new Error(`Post has already been flagged by the user ${userEmail}`);
        }
    
        // Add the user to the flaggedBy array and update flagVerified and flagCount
        post.flaggedBy = [...(post.flaggedBy || []), userEmail];
        post.flagVerified = true; // Mark the post as flagged
        post.flagCount = post.flaggedBy.length; // Update the flag count
    
        // Save the updated post back to the blockchain
        await ctx.stub.putState(postId, Buffer.from(JSON.stringify(post)));
    
        return JSON.stringify({ message: 'Post flagged successfully' });
    }    

    // Fetch Flagged Posts
    async fetchFlaggedPosts(ctx) {
        const allPostsIterator = await ctx.stub.getStateByRange('', ''); // Get all posts in the state
        const flaggedPosts = [];
    
        // Iterate over all posts and filter by flagVerified
        while (true) {
        const res = await allPostsIterator.next();
        if (res.value && res.value.value.toString()) {
            const post = JSON.parse(res.value.value.toString());
    
            // Check if the post is flagged
            if (post.flagVerified) {
            flaggedPosts.push(post);
            }
        }
    
        if (res.done) {
            await allPostsIterator.close();
            break;
        }
        }
    
        return JSON.stringify(flaggedPosts); // Return the flagged posts as a JSON string
    }

    // Soft delete the flagged post and update users' saved posts
    async deleteFlaggedPost(ctx, postId) {
        // Fetch the post to be deleted by postId
        const postAsBytes = await ctx.stub.getState(postId);
        if (!postAsBytes || postAsBytes.length === 0) {
            throw new Error(`Post with ID ${postId} not found`);
        }

        const post = JSON.parse(postAsBytes.toString());

        // Check if the flagVerified is true before proceeding
        if (!post.flagVerified || post.flagVerified !== true) {
            throw new Error(`Post with ID ${postId} has not been flagged as verified`);
        }

        // Soft delete the flagged post by updating its status to 'deleted'
        post.status = 'deleted';  // Update the post status to 'deleted'
        
        // Save the post with the updated status (soft delete)
        await ctx.stub.putState(postId, Buffer.from(JSON.stringify(post)));

        // Fetch all users to remove the post from saved posts
        const allUsersIterator = await ctx.stub.getStateByRange('', '');
        while (true) {
            const res = await allUsersIterator.next();
            if (res.value && res.value.value.toString()) {
                const user = JSON.parse(res.value.value.toString());

                // Check if the user has saved posts
                if (user.savedPosts) {
                    // Filter out the deleted post from saved posts
                    user.savedPosts = user.savedPosts.filter((savedPost) => savedPost._id !== postId);

                    // Update the user with the modified savedPosts
                    await ctx.stub.putState(user.email, Buffer.from(JSON.stringify(user)));
                }
            }

            if (res.done) {
                await allUsersIterator.close();
                break;
            }
        }

        return JSON.stringify({ message: 'Flagged post soft deleted and references removed from users' });
    }

    // Create an event (for voting and normal events)
    async createEvent(ctx, eventDetails, eventDateCreated) {
        const event = JSON.parse(eventDetails);
    
        const eventId = ctx.stub.getTxID(); // Use transaction ID as event ID
        event.id = eventId;  // Assign event ID
        event.dateCreated = eventDateCreated; // Use the event date passed from the server
    
        // Store the event in the ledger
        await ctx.stub.putState(eventId, Buffer.from(JSON.stringify(event)));
    
        return eventId;
    }

    // Update user's "myEvents" attribute after event creation
    async updateUserEvents(ctx, userEmail, updatedMyEvents) {
        const userAsBytes = await ctx.stub.getState(userEmail);
        if (!userAsBytes || userAsBytes.length === 0) {
        throw new Error(`User with email ${userEmail} not found`);
        }
    
        const user = JSON.parse(userAsBytes.toString());
        user.myEvents = updatedMyEvents;  // Update the user's events list
    
        // Save the updated user object back to the blockchain
        await ctx.stub.putState(userEmail, Buffer.from(JSON.stringify(user)));
    
        return JSON.stringify({ message: 'User events updated successfully' });
    }

    // Fetch normal events created by a user
    async fetchNormalEventsByUser(ctx, userEmail) {
        const query = {
        selector: {
            createdBy: userEmail,
            eventType: 'normal', // Only normal events
        },
        };
    
        const resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    
        const events = [];
        while (true) {
        const res = await resultsIterator.next();
        if (res.done) {
            await resultsIterator.close();
            break;
        }
    
        const event = JSON.parse(res.value.value.toString());
        events.push({
            _id: res.value.key,
            title: event.title,
            date: event.date,
            time: event.time,
            location: event.location,
            totalJoined: event.totalJoined || 0,
            joinedUsers: event.joinedUsers || [],
        });
        }
    
        return JSON.stringify({ events });
    }
    
    // Fetch voting events created by a user
    async fetchVotingEventsByUser(ctx, userEmail) {
        const query = {
        selector: {
            createdBy: userEmail,
            eventType: 'voting', // Only voting events
        },
        };
    
        const resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    
        const events = [];
        while (true) {
        const res = await resultsIterator.next();
        if (res.done) {
            await resultsIterator.close();
            break;
        }
    
        const event = JSON.parse(res.value.value.toString());
        events.push({
            _id: res.value.key,
            title: event.title,
            date: event.date,
            time: event.time,
            location: event.location,
            voteOptions: event.voteOptions || [],
        });
        }
    
        return JSON.stringify({ events });
    }
    
    // Fetch event by eventId
    async fetchEventById(ctx, eventId) {
        const eventAsBytes = await ctx.stub.getState(eventId);
        if (!eventAsBytes || eventAsBytes.length === 0) {
        throw new Error(`Event with ID ${eventId} not found`);
        }
        return eventAsBytes.toString();
    }

    // Fetch voting event by ID (eventId)
    async fetchVotingEventById(ctx, eventId) {
        const eventAsBytes = await ctx.stub.getState(eventId);
        if (!eventAsBytes || eventAsBytes.length === 0) {
        throw new Error(`Voting event with ID ${eventId} not found`);
        }
        return eventAsBytes.toString();  // Return the event object as a string
    }
}

module.exports = PrimaryContract;
