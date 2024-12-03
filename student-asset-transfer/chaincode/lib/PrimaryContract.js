/*
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

const { Contract } = require('fabric-contract-api');

class PrimaryContract extends Contract {

    // Function to check if the email index view exists
    async checkEmailIndexView(ctx) {
        // Check if the design document for email index exists
        const exists = await ctx.stub.getState('_design/email_index');
        
        // If the design document exists, return true, else false
        if (exists && exists.length > 0) {
            return 'exists';
        }
        return 'not_exists';
    }
    
    // Function to ensure a database exists on the ledger
    async ensureDatabaseExists(ctx, dbName) {
        // Check if database already exists in the ledger
        const dbExists = await ctx.stub.getState(dbName);
        if (dbExists && dbExists.length > 0) {
            console.log(`Database "${dbName}" already exists.`);
        } else {
            // If not found, create database record
            const newDb = { name: dbName };
            await ctx.stub.putState(dbName, Buffer.from(JSON.stringify(newDb)));
            console.log(`Database "${dbName}" created.`);
        }
    }
    
   // Function to insert a default admin entry
    async createDefaultAdmin(ctx, username, email, role, password) {
        const dbName = 'admins';
        const adminExists = await ctx.stub.getState(dbName);

        if (adminExists && adminExists.length > 0) {
            console.log('Admin entry already exists.');
            return;
        }

        // Create the default admin
        const admin = {
            username: username,
            password: password,  // Encrypted password from backend
            email: email,
            role: role,
            verified: true,
        };
        await ctx.stub.putState(dbName, Buffer.from(JSON.stringify(admin)));
        console.log('Default admin created.');
    }

    // Function to create the email index view design document
    async createEmailIndexView(ctx, designDocJSON) {
        // Parse the design document JSON passed from the client
        const designDoc = JSON.parse(designDocJSON);

        // Add the design document to the ledger under the _design/email_index key
        await ctx.stub.putState('_design/email_index', Buffer.from(JSON.stringify(designDoc)));

        console.log('Email index view created successfully.');
    }
}

module.exports = PrimaryContract;
