require('dotenv').config(); // Load environment variables from .env file
const path = require('path');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const fs = require('fs').promises;
const grpc = require('@grpc/grpc-js');
const util = require('util');
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
        enrollAdminUser();
        await setupAdminGateway();
        await setupDatabases();

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

// Function to invoke chaincode for ensuring the database exists
async function ensureDatabaseExists(dbName) {
    try {
        await contract.submitTransaction('ensureDatabaseExists', dbName);
        console.log(`Database "${dbName}" checked/created on-chain`);
    } catch (error) {
        console.error(`Error ensuring database "${dbName}" exists:`, error.message);
        throw new Error(`Failed to ensure database "${dbName}" exists`);
    }
}
  
// Function to invoke chaincode to create the default admin
async function createDefaultAdmin() {
    try {
        // Encrypt the password before passing it to the smart contract
        const encryptedPassword = await bcrypt.hash('Admin@123', 10);  // Change 'Admin@123' to a dynamic password if needed

        // Call the chaincode function with the encrypted password
        await contract.submitTransaction('createDefaultAdmin', 'admin', 'admin@sunway.edu.my', 'Admin', encryptedPassword);
        console.log('Default admin created on-chain');
    } catch (error) {
        console.error('Error creating default admin:', error.message);
        throw new Error('Failed to create default admin');
    }
}

// Function to create the email index view in the users database
async function createEmailIndexView() {
    try {
        // Attempt to check if the email index view already exists
        const emailIndexExists = await contract.submitTransaction('checkEmailIndexView');
        if (emailIndexExists === 'exists') {
            console.log("Email index design document already exists.");
            return;
        }

        // If not found, create the email index view
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
        await contract.submitTransaction('createEmailIndexView', JSON.stringify(designDoc));
        console.log("Email index design document created successfully.");
    } catch (error) {
        console.error("Error checking or creating the email index design document:", error.message);
        throw new Error("Failed to create email index view");
    }
}

// Setting up all required databases on the blockchain
async function setupDatabases() {
    try {
        await ensureDatabaseExists('users');
        await ensureDatabaseExists('admins');
        await ensureDatabaseExists('posts');
        await ensureDatabaseExists('events');
        await ensureDatabaseExists('voting');
        await createDefaultAdmin();
        await createEmailIndexView();
        console.log("All databases and views set up successfully.");
    } catch (error) {
        console.error("Error during database setup:", error.message);
        // Handle the error accordingly (you may return or rethrow the error, depending on your needs)
        throw new Error("Database setup failed");
    }
}
