# Chat Application API

A production-ready **NestJS-based real-time chat API** with JWT authentication, MongoDB persistence, and comprehensive error handling.

## 📋 Quick Overview

- **Framework:** NestJS 11.x with TypeScript
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT with refresh tokens (15m/7d expiration)
- **Real-time:** Socket.io on a dedicated port `3002` with namespace `/chat`
- **API Documentation:** Swagger/OpenAPI integrated
- **Architecture:** Modular design (Auth, Chat, Users modules)
- **API Versioning:** `/api/v1/` prefix

## � Installation & Setup

### Prerequisites

- Node.js 18+ and pnpm
- MongoDB instance (local or cloud)
- Environment configuration file

### Installation

```bash
# Install dependencies
pnpm install

# Create .env file with required variables
cp .env.example .env

# Run development server
pnpm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb://localhost:27017/chat_app
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
NODE_ENV=development
```

## 📁 Project Structure

```sh
src/
├── app.controller.ts          # Root controller
├── app.module.ts               # Root module with middleware
├── app.service.ts              # Root service
├── main.ts                      # Application bootstrap
├── common/
│   ├── exceptions/             # Custom exception classes
│   │   └── http-exceptions.ts  # Standardized error responses
│   ├── filters/                # Global exception filter
│   │   └── all-exceptions.filter.ts
│   ├── guards/                 # Authentication guards
│   │   └── jwt-auth.guard.ts
│   ├── middleware/             # Request logging
│   │   └── request-logging.middleware.ts
│   ├── interfaces/             # Shared interfaces
│   └── utils/                  # Utility functions
│       └── chat-helper.util.ts  # Chat room ID generation
├── database/                   # Database module
│   ├── database.module.ts
│   └── database.service.ts
└── modules/
    ├── auth/                   # Authentication module
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── auth.module.ts
    │   ├── dto/
    │   │   ├── auth-response.dto.ts
    │   │   ├── login.dto.ts
    │   │   └── register.dto.ts
    │   ├── guards/
    │   │   └── refresh-token.guard.ts
    │   └── strategies/
    │       ├── jwt.strategy.ts
    │       └── refresh-token.strategy.ts
    ├── chat/                   # Chat messaging module
    │   ├── chat.controller.ts  # REST endpoints
    │   ├── chat.gateway.ts     # WebSocket gateway (real-time events)
    │   ├── chat.service.ts     # Business logic for private & group chats
    │   ├── chat.module.ts
    │   ├── dto/
    │   │   ├── create-message.dto.ts
    │   │   ├── fetch-chat-messages.dto.ts
    │   │   ├── message-response.dto.ts
    │   │   └── group.dto.ts    # CreateGroupDto, UpdateGroupDto, etc.
    │   └── schemas/
    │       ├── chat.schema.ts  # Message schema (private & group)
    │       └── group.schema.ts # Group chat schema
    └── users/                  # User management module
        ├── users.module.ts
        └── schemas/
            └── user.schema.ts
```

## 🔐 Core Modules

### Auth Module

**Features:**

- User registration and login
- JWT access token (15m expiration)
- Refresh token mechanism (7d expiration)
- Password hashing with bcrypt

**Endpoints:**

- `POST /api/v1/auth/register` - Create new user account
- `POST /api/v1/auth/login` - Authenticate and receive tokens
- `POST /api/v1/auth/refresh` - Refresh access token (requires refresh token)
- `POST /api/v1/auth/logout` - Logout user (requires auth)

### Chat Module

**Features:**

- **Private Messages** - Direct messaging between two users with message status tracking
- **Group Chats** - Create groups, manage members, and send group messages
- Create and fetch messages with pagination
- Message status tracking (SENT → DELIVERED → READ)
- Group message read receipts (track which members read a message)
- User online status and last-seen tracking
- Chat room aggregation with unread counts
- Real-time message delivery via WebSocket
- Typing indicators and presence notifications

**REST Endpoints - Messages:**

- `POST /api/v1/chat/message` - Create new message (private or group)
- `POST /api/v1/chat/messages/fetch` - Fetch messages with pagination
- `PUT /api/v1/chat/message/:messageId/status` - Update message status
- `GET /api/v1/chat/messages/undelivered/:userId/:partnerId` - Get undelivered private messages

**REST Endpoints - Group Management:**

- `POST /api/v1/chat/group` - Create new group
- `GET /api/v1/chat/group/:groupId` - Get group details with members
- `PUT /api/v1/chat/group/:groupId` - Update group info
- `POST /api/v1/chat/group/:groupId/member` - Add member to group
- `DELETE /api/v1/chat/group/:groupId/member/:userId` - Remove member from group
- `GET /api/v1/chat/user/:userId/groups` - Get all groups for user
- `GET /api/v1/chat/group-rooms/:userId` - Get group chat list with latest messages
- `DELETE /api/v1/chat/group/:groupId` - Delete/deactivate group
- `GET /api/v1/chat/groups/search?q=search` - Search groups by name

**REST Endpoints - User Presence:**

- `PUT /api/v1/chat/user/:userId/last-seen` - Update last seen timestamp
- `PUT /api/v1/chat/messages/delivered/:userId/:partnerId` - Mark private messages as delivered
- `PUT /api/v1/chat/messages/read/:userId/:partnerId` - Mark private messages as read
- `GET /api/v1/chat/user/:userId/last-seen` - Get last seen timestamp
- `GET /api/v1/chat/user/:userId/online-status` - Get online status
- `GET /api/v1/chat/rooms/:userId` - Get all private chat rooms with latest messages

**WebSocket Events:**

| Event | Direction | Purpose |
| --- | --- | --- |
| `sendMessage` | Client → Server | Send message to private or group chat |
| `messageReceived` | Server → Client | Receive real-time message in private chat |
| `groupMessageReceived` | Server → Client | Receive real-time message in group chat |
| `messageSent` | Server → Client | Confirmation of sent message |
| `messageDelivered` | Client → Server | Mark message as delivered |
| `messageStatus` | Server → Broadcast | Broadcast message status updates |
| `messageRead` | Client → Server | Mark message/group message as read |
| `fetchMessages` | Client → Server | Request message history |
| `messagesFetched` | Server → Client | Return fetched messages |
| `userTyping` | Client → Server | Broadcast typing indicator |
| `userStoppedTyping` | Client → Server | Clear typing indicator |
| `getUserStatus` | Client → Server | Query user online status |
| `userStatus` | Server → Client | Return user status |
| `updateLastSeen` | Client → Server | Update user's last seen time |
| `joinPrivateChat` | Client → Server | Join private chat room |
| `leavePrivateChat` | Client → Server | Leave private chat room |
| `userJoinedChat` | Server → Broadcast | Notify user joined chat |
| `userLeftChat` | Server → Broadcast | Notify user left chat |
| `joinGroup` | Client → Server | Join group chat room |
| `leaveGroup` | Client → Server | Leave group chat room |
| `userJoinedGroup` | Server → Broadcast | Notify user joined group |
| `userLeftGroup` | Server → Broadcast | Notify user left group |
| `getGroupMessages` | Client → Server | Request group message history |
| `groupMessagesFetched` | Server → Client | Return group messages |
| `groupCall` | Client → Server | Initiate group call |
| `groupCallIncoming` | Server → Broadcast | Notify incoming group call |
| `userOnline` | Server → Broadcast | Broadcast user online |
| `userOffline` | Server → Broadcast | Broadcast user offline |
| `error` | Server → Client | Send error messages |

### Users Module

**Features:**

- User profile management
- Online status tracking
- User schema with indexing

**Database Fields:**

- `username` (unique, required)
- `email` (unique, required)
- `password` (required, bcrypt hashed)
- `firstName`, `lastName` (optional)
- `avatar` (optional, profile picture URL)
- `lastSeen` (Date, auto-updated)
- `isOnline` (boolean, indexed)
- `refreshToken` (optional, for token refresh)

## 📊 Database Schemas

### User Schema

```typescript
{
  username: string (unique, required)
  email: string (unique, required)
  password: string (bcrypt hashed)
  firstName?: string
  lastName?: string
  avatar?: string (URL)
  lastSeen: Date
  isOnline: boolean (indexed)
  refreshToken?: string
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

### Message Schema

```typescript
{
  chatRoomId: string (indexed)
  messageId: string (unique, indexed)
  chatType: enum ['PRIVATE', 'GROUP'] (default: 'PRIVATE')
  sender: ObjectId -> User (indexed, required)
  receiver?: ObjectId -> User (for private messages only)
  groupId?: ObjectId -> Group (for group messages only)
  message: string (required)
  attachment?: string (URL for files/images)
  status: enum ['SENT', 'DELIVERED', 'READ'] (indexed)
  readBy?: ObjectId[] (group members who read the message)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}

// Indexes
- Compound: (chatRoomId, createdAt)
- Compound: (sender, status)
- Compound: (groupId, createdAt)
- Compound: (chatType, createdAt)
```

### Group Schema

```typescript
{
  groupName: string (unique, required)
  groupDescription?: string
  groupAvatar?: string (URL)
  createdBy: ObjectId -> User (required)
  members: ObjectId[] -> User (array of member IDs)
  admins: ObjectId[] -> User (array of admin IDs)
  isActive: boolean (default: true, indexed)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}

// Indexes
- Compound: (members, createdAt)
- Single: (createdBy)
- Single: (isActive)
```

## ✨ Key Features

### Error Handling

- **Custom Exception System** - 6 standardized exception classes (BadRequest, Unauthorized, Forbidden, NotFound, Conflict, InternalServerError)
- **Global Exception Filter** - Handles both custom exceptions and MongoDB errors
- **Type-Safe Error Mapping** - HTTP status codes mapped to error messages
- **Production-Safe** - No sensitive details leaked in error responses

### Request Processing

- **Request Logging Middleware** - Logs method, URL, IP, user-agent, and response timing
- **Conditional Log Levels** - Error (5xx), warn (4xx), log (2xx/3xx)
- **Input Validation** - Class-validator with @IsMongoId() for MongoDB ObjectIds
- **Data Transformation** - Automatic type casting for DTOs

### API Design

- **API Versioning** - `/api/v1/` prefix for forward compatibility
- **JWT Authentication** - @ApiBearerAuth protection on all chat endpoints
- **Swagger Documentation** - Complete API documentation with schemas
- **CORS Security** - Environment-based allowed origins

### Database Design

- **Proper Indexing** - Compound indexes on frequently queried fields
- **Message Pagination** - Efficient skip/limit for large chat histories
- **Aggregation Pipeline** - Complex queries for chat room data
- **Data Integrity** - Unique constraints and type validation

## 🧪 Testing the API

### Register a New User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Response includes: accessToken, refreshToken, user object
```

### Create a Private Message (Requires JWT)

> **Note:** `sender` and `messageId` are always set server-side from the verified JWT — do not include them in the request body.

```bash
curl -X POST http://localhost:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "chatRoomId": "user1_user2",
    "chatType": "PRIVATE",
    "receiver": "507f1f77bcf86cd799439012",
    "message": "Hello, how are you?"
  }'
```

### Create a Group

```bash
curl -X POST http://localhost:3000/api/v1/chat/group \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "groupName": "Project Developers",
    "groupDescription": "Discussion group for project team",
    "members": [
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439013"
    ]
  }'

# Response includes: groupId, members array, createdBy, admins
```

### Create a Group Message

```bash
curl -X POST http://localhost:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "chatRoomId": "group_507f1f77bcf86cd799439020",
    "chatType": "GROUP",
    "groupId": "507f1f77bcf86cd799439020",
    "message": "Great work on the feature!"
  }'
```

### Add Member to Group

```bash
curl -X POST http://localhost:3000/api/v1/chat/group/507f1f77bcf86cd799439020/member \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "userId": "507f1f77bcf86cd799439014"
  }'
```

### Fetch Messages with Pagination (Private)

```bash
curl -X POST http://localhost:3000/api/v1/chat/messages/fetch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "currentUserId": "507f1f77bcf86cd799439011",
    "senderId": "507f1f77bcf86cd799439011",
    "receiverId": "507f1f77bcf86cd799439012",
    "page": 1,
    "limit": 20
  }'
```

### Fetch Group Messages

```bash
curl -X POST http://localhost:3000/api/v1/chat/messages/fetch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "currentUserId": "507f1f77bcf86cd799439011",
    "groupId": "507f1f77bcf86cd799439020",
    "page": 1,
    "limit": 20
  }'
```

### Get User's Groups

```bash
curl -X GET http://localhost:3000/api/v1/chat/user/507f1f77bcf86cd799439011/groups \
  -H "Authorization: Bearer <accessToken>"
```

### Get All Chat Rooms (Private)

```bash
curl -X GET http://localhost:3000/api/v1/chat/rooms/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <accessToken>"
```

### Get Group Chat Rooms

```bash
curl -X GET http://localhost:3000/api/v1/chat/group-rooms/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <accessToken>"
```

### WebSocket Connection (Real-time Messaging)

```javascript
import io from 'socket.io-client';

// Connect to WebSocket with JWT access token
// accessToken is obtained from /api/v1/auth/login or /api/v1/auth/refresh
// WebSocket runs on a SEPARATE port (3002) from the REST API (3000)
const socket = io('http://localhost:3002/chat', {
  auth: { token: accessToken }
});

// Listen for connection
socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

// Send a message in real-time
// sender and messageId are set server-side from the JWT – omit them
socket.emit('sendMessage', {
  messageData: {
    chatRoomId: 'user1_user2',
    chatType: 'PRIVATE',
    receiver: '507f1f77bcf86cd799439012',
    message: 'Real-time message!'
  }
});

// Receive real-time messages
socket.on('messageReceived', (message) => {
  console.log('Message received:', message);
});

// Send typing indicator
socket.emit('userTyping', {
  chatRoomId: 'user1_user2',
  userId: '507f1f77bcf86cd799439011'
});

// Join a group
socket.emit('joinGroup', {
  groupId: '507f1f77bcf86cd799439020',
  userId: '507f1f77bcf86cd799439011'
});

// Send group message
socket.emit('sendMessage', {
  messageData: {
    chatRoomId: 'group_507f1f77bcf86cd799439020',
    chatType: 'GROUP',
    groupId: '507f1f77bcf86cd799439020',
    message: 'Group message in real-time!'
  }
});

// Receive group messages
socket.on('groupMessageReceived', (message) => {
  console.log('Group message:', message);
});

// Get user online status
socket.emit('getUserStatus', { userId: '507f1f77bcf86cd799439012' });
socket.on('userStatus', (status) => {
  console.log('User online:', status.isOnline);
});

// Listen for user online/offline events
socket.on('userOnline', (data) => {
  console.log(`${data.userId} is now online`);
});

socket.on('userOffline', (data) => {
  console.log(`${data.userId} went offline at ${data.lastSeen}`);
});
```

### Available at

- **Swagger UI:** <http://localhost:3000/api/docs>
- **API Health:** <http://localhost:3000/>
- **WebSocket:** `ws://localhost:3002/chat`

## � Project Dependencies

### Core Framework

- **@nestjs/common** - Core NestJS framework
- **@nestjs/platform-express** - Express server integration
- **@nestjs/websockets** - WebSocket (Socket.io) support
- **@nestjs/passport** - Passport authentication strategies
- **@nestjs/jwt** - JWT token generation and validation
- **@nestjs/config** - Environment configuration management

### Database

- **mongoose** - MongoDB ODM with schema validation
- **@nestjs/mongoose** - Mongoose integration for NestJS

### Real-time Communication

- **socket.io** - WebSocket library for real-time bidirectional communication
- **@nestjs/websockets** - NestJS WebSocket decorator support

### Validation & Serialization

- **class-validator** - Decorator-based request validation
- **class-transformer** - Object transformation and serialization

### Security

- **passport-jwt** - JWT authentication strategy
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT token operations

### Development Tools

- **@nestjs/cli** - NestJS command-line interface
- **@nestjs/schematics** - Code generation schematics
- **typescript** - TypeScript compiler
- **ts-loader** - TypeScript module loader for webpack
- **nodemon** - Auto-restart on file changes (development)
- **jest** - Testing framework
- **@types/node** - TypeScript definitions for Node.js

### Code Quality

- **eslint** - Code linting
- **prettier** - Code formatting

## 🚀 Getting Started

### System Requirements

- Node.js 18+
- pnpm (or npm/yarn)
- MongoDB running locally or connection string to remote MongoDB

### Initial Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd flutter_nestjs_chat_app/server
```

1. **Install dependencies**

```bash
pnpm install
```

1. **Configure environment variables**
Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

```env
MONGO_URI=mongodb://localhost:27017/chat_app
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=your_refresh_secret_key_here_minimum_32_characters
JWT_REFRESH_EXPIRATION=7d
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
NODE_ENV=development
PORT=3000
```

1. **Start the development server**

```bash
pnpm run start:dev
```

The server will be available at `http://localhost:3000`

### Available Scripts

```bash
# Development mode with auto-reload
pnpm run start:dev

# Production build
pnpm run build

# Production mode
pnpm run start:prod

# Run tests
pnpm run test

# Run end-to-end tests
pnpm run test:e2e

# Format code with Prettier
pnpm run format

# Lint code with ESLint
pnpm run lint
```

## 🔧 Running the Application

### Development Mode

```bash
pnpm run start:dev
```

Server starts at: `http://localhost:3000` with auto-reload on file changes

### Build for Production

```bash
pnpm run build
```

### Start Production Build

```bash
pnpm run start:prod
```

### Lint Code

```bash
pnpm run lint
```

### Format Code

```bash
pnpm run format
```

## 🛠 Tech Stack

| Layer | Technology | Version |
| --- | --- | --- |
| Framework | NestJS | 11.x |
| Language | TypeScript | 5.x |
| Database | MongoDB | Latest |
| ODM | Mongoose | 9.x |
| Auth | JWT + Passport | 11.x |
| Validation | class-validator | 0.14.x |
| API Docs | Swagger/OpenAPI | 7.x |
| Real-time | Socket.io | 4.x |
| Security | Helmet | 7.x |
| Password | bcrypt | 5.x |

## 🔒 Security Features

- **JWT Authentication** - All protected endpoints require valid JWT token
- **Password Hashing** - User passwords are hashed using bcrypt with salt rounds
- **CORS Protection** - WebSocket and HTTP endpoints have CORS configuration
- **Request Validation** - All DTOs validated using class-validator decorators
- **Error Handling** - Comprehensive exception handling with custom exceptions
- **Rate Limiting** - Ready for integration with @nestjs/throttler
- **Headers Security** - Helmet.js protection
- **MongoDB Injection Prevention** - ObjectId validation on all queries
- **Sensitive Data Protection** - No stack traces or internal details in production errors

## 🏗 Architecture Highlights

### Modular Design

- **Auth Module** - Isolated authentication logic with strategies
- **Chat Module** - Self-contained messaging functionality with grouping support
- **Users Module** - User management and schema
- **Common Module** - Shared exceptions, filters, guards, middleware

### Clean Separation of Concerns

- **Controllers** - Handle HTTP requests/responses and REST endpoints
- **Services** - Contain business logic for messages, groups, and presence
- **Gateways** - WebSocket event handling and real-time communication
- **DTOs** - Validate and transform input data
- **Schemas** - Define database structure with proper indexing
- **Strategies** - JWT and refresh token authentication

### WebSocket Gateway

- **Socket.io Gateway** - 25+ WebSocket events for real-time bidirectional communication
- **Connection Management** - Tracks user connections and auto-joins private/group chats
- **Typing Indicators** - Real-time typing status broadcasting
- **Presence Tracking** - User online/offline and last-seen updates
- **Message Broadcasting** - Efficient room-based message distribution

### Data Layer

- **Mongoose ODM** - Strong typing with schema validation
- **Compound Indexes** - Optimized queries for message pagination and filtering
- **Aggregation Pipeline** - Complex queries for chat room data with unread counts
- **Data Integrity** - Unique constraints and reference validation

### Logging & Monitoring

- Request logging middleware captures all HTTP traffic
- Response timing for performance monitoring
- Conditional log levels (error/warn/log)
- Stack traces in development, clean messages in production
- WebSocket event logging for debugging

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## 🆘 Troubleshooting

### MongoDB Connection Error

- Ensure MongoDB is running: `mongod`
- Check `MONGO_URI` in `.env` file
- Verify database permissions
- Test connection: `mongosh mongodb://localhost:27017/chat_app`

### WebSocket Connection Issues

- Check CORS configuration in [chat.gateway.ts](src/modules/chat/chat.gateway.ts) — allowed origins are read from `ALLOWED_ORIGINS` env var
- Ensure client connects with correct server URL and matching port
- Verify Socket.io version compatibility (client and server should match)
- Check browser console for connection errors
- Provide a valid JWT access token in the `auth` object: `auth: { token: accessToken }`
- The server disconnects any client that does not present a valid, non-expired token

### JWT Token Expired

- Get a new token using the refresh endpoint
- Update `Authorization` header with new access token
- Check `JWT_EXPIRATION` setting in `.env` file
- Ensure JWT_SECRET and JWT_REFRESH_SECRET are set

### Build Errors

- Clear node_modules: `rm -rf node_modules pnpm-lock.yaml`
- Reinstall dependencies: `pnpm install`
- Clear build cache: `rm -rf dist`
- Check TypeScript errors: `npx tsc --noEmit`
- Verify all imports are correct

### Message Not Receiving

- Ensure user is connected to WebSocket (check connection event)
- Verify user has joined the appropriate chat room
- Check message status in database
- Verify sender and receiver are valid MongoDB ObjectIds
- For groups, ensure user is a member of the group

### Database Errors

- Check MongoDB is running and accessible
- Verify database credentials in `.env`
- Check disk space on MongoDB
- Review logs in MongoDB: `use admin; db.getLog('global')`
- Reset database if needed: `db.dropDatabase()`

## 📚 API Reference

### Authentication Endpoints

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### Chat Endpoints (Messages)

- `POST /api/v1/chat/message` - Create message (private or group)
- `POST /api/v1/chat/messages/fetch` - Fetch with pagination
- `PUT /api/v1/chat/message/:messageId/status` - Update status
- `GET /api/v1/chat/messages/undelivered/:userId/:partnerId` - Get undelivered

### Chat Endpoints (Groups)

- `POST /api/v1/chat/group` - Create group
- `GET /api/v1/chat/group/:groupId` - Get group details
- `PUT /api/v1/chat/group/:groupId` - Update group
- `POST /api/v1/chat/group/:groupId/member` - Add member
- `DELETE /api/v1/chat/group/:groupId/member/:userId` - Remove member
- `GET /api/v1/chat/user/:userId/groups` - Get user's groups
- `DELETE /api/v1/chat/group/:groupId` - Delete group
- `GET /api/v1/chat/groups/search` - Search groups

### Presence Endpoints

- `PUT /api/v1/chat/user/:userId/last-seen` - Update last seen
- `GET /api/v1/chat/user/:userId/last-seen` - Get last seen
- `GET /api/v1/chat/user/:userId/online-status` - Get online status
- `GET /api/v1/chat/rooms/:userId` - Get chat rooms
- `GET /api/v1/chat/group-rooms/:userId` - Get group rooms

## 📄 License

This project is licensed under the MIT License

---

**Status:** ✅ Production Ready  
**Last Updated:** February 21, 2026  
**API Version:** v1  
**Maintenance:** Active Development
