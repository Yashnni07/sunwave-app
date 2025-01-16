# Sunwave

A blockchain-powered platform for a transparent, secure, and collaborative student community.


## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technologies](#technologies)
- [Getting Started](#getting-started)


## Project Overview

The project is a student community platform built using **CERN (CouchDB, Express.js, React.js, Node.js)** stack. It incorporates a major feature that similar platforms lack: blockchain integration. Alongside this are the primary and common features that can be found in social media applications, including forum posts, commenting on posts, profile creation, joining events, saving posts, and more.

### Blockchain Integration

The platform's blockchain integration leverages **Hyperledger Fabric** to ensure transparency, security, and decentralization. Key features include:

- Identity Management: Hyperledger Fabric’s Membership Service Provider (MSP) manages and authenticates user identities.
- Smart Contracts: Custom chaincode implemented for handling transactions, maintaining data integrity, and enforcing business logic.
- Decentralized Ledger: All platform data, such as user activities and content interactions, is securely stored and maintained across a distributed ledger to enhance traceability and reduce tampering risks.

A backend service has been developed to interact with the Hyperledger Fabric network, allowing seamless integration with the platform. This service:

- Implements the Fabric SDK to connect with peers and invoke smart contracts.
- Manages transactions in a secure and efficient manner.
- Handles queries to retrieve historical and real-time data from the blockchain ledger.
- The system is designed for modularity, allowing the flexibility to add or modify chaincode and network configurations without disrupting overall functionality.

For example, When a user interacts with the platform (e.g., posting content or reporting inappropriate material), relevant actions are logged on the blockchain, ensuring tamper-proof auditing.

### User Roles

There are three distinct user roles within the system:

1. Students: Create, view, and interact with posts, join events, and report content.
2. Moderators: Manage events, review reported posts, and ensure community engagement.
3. Sunwave Administrators: Oversee content, enforce guidelines, manage events, and track user statistics.


## Features

- [x] Post creation and management
- [x] Posting comments
- [x] Liking posts
- [x] Flagging posts
- [x] Saving posts
- [x] Event creation and management
- [x] Joining events
- [x] Voting events
- [x] Saving events
- [x] Role-based Access Control (RBAC)
- [x] Admin dashboard
- [x] Moderator dashboard
- [x] User Management
- [x] User profile
- [x] Email notifications for OTP


## Technologies

- React.js
- Node.js
- Express.js
- CouchDB
- JWT Authentication
- Bcrypt
- Nodemailer
- Crypto-js
- CSS


## Getting Started

### Prerequisites

Before running the application, make sure you have the following installed:

- Node.js
- CouchDB

### Installation

1. Clone the repository

```bash
git clone https://github.com/Yashnni07/sunwave-test.git
```

2. Go to the project directory and install dependencies for both the client and server

```bash
cd client
npm install
```

```bash
cd server
npm install
```

3. Go to the first-network folder which have the fabric files to bring the network up

```bash
cd first-network
./network up
```

4. Bring up the backend server

```bash
cd server
node server.js
```

5. Run the react module for bringing up the frontend of the system

```bash
cd client
npm start
```

6. The system will be accessible with

 http://localhost:3000
