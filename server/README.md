# Chat Application API

A production-ready **NestJS-based real-time chat API** with JWT authentication, MongoDB persistence, and comprehensive error handling.

## 📋 Quick Overview

- **Framework:** NestJS 11.x with TypeScript
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT with refresh tokens (15m/7d expiration)
- **Real-time:** Socket.io configured (ready for WebSocket implementation)
- **API Documentation:** Swagger/OpenAPI integrated
- **Architecture:** Modular design (Auth, Chat, Users modules)
- **API Versioning:** `/api/v1/` prefix

## 🚀 Getting Started

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
│   └── interfaces/             # Shared interfaces
├── database/                   # Database module
│   ├── database.module.ts
│   └── database.service.ts
└── modules/
    ├── auth/                   # Authentication module
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── auth.module.ts
    │   ├── dto/
    │   ├── guards/
    │   └── strategies/
    ├── chat/                   # Chat messaging module
    │   ├── chat.controller.ts
    │   ├── chat.service.ts
    │   ├── chat.module.ts
    │   ├── dto/
    │   └── schemas/
    └── users/                  # User management module
        ├── users.module.ts
        └── schemas/
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

- Create and fetch messages with pagination
- Message status tracking (SENT → DELIVERED → READ)
- User online status and last-seen tracking
- Chat room aggregation with unread counts

**Endpoints:**

- `POST /api/v1/chat/message` - Create new message
- `POST /api/v1/chat/messages/fetch` - Fetch messages with pagination
- `PUT /api/v1/chat/message/:messageId/status` - Update message status
- `GET /api/v1/chat/messages/undelivered/:userId/:partnerId` - Get undelivered messages
- `PUT /api/v1/chat/user/:userId/last-seen` - Update last seen timestamp
- `PUT /api/v1/chat/messages/delivered/:userId/:partnerId` - Mark messages as delivered
- `PUT /api/v1/chat/messages/read/:userId/:partnerId` - Mark messages as read
- `GET /api/v1/chat/user/:userId/last-seen` - Get last seen timestamp
- `GET /api/v1/chat/user/:userId/online-status` - Get online status
- `GET /api/v1/chat/rooms/:userId` - Get all chat rooms with latest messages

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
  sender: ObjectId -> User (indexed)
  receiver: ObjectId -> User (indexed)
  message: string (required)
  status: enum ['SENT', 'DELIVERED', 'READ']
  createdAt: Date (auto)
  updatedAt: Date (auto)
}

// Indexes
- Compound: (chatRoomId, createdAt)
- Compound: (sender, status)
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

### Create a Message (Requires JWT)

```bash
curl -X POST http://localhost:3000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "chatRoomId": "room_123",
    "messageId": "msg_001",
    "sender": "507f1f77bcf86cd799439011",
    "receiver": "507f1f77bcf86cd799439012",
    "message": "Hello, how are you?",
    "status": "SENT"
  }'
```

### Fetch Messages with Pagination

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

### Get Chat Rooms

```bash
curl -X GET http://localhost:3000/api/v1/chat/rooms/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <accessToken>"
```

### Available at

- **Swagger UI:** <http://localhost:3000/api/docs>
- **API Health:** <http://localhost:3000/>

## 🔧 Running the Application

### Development Mode

```bash
pnpm run dev
```

Server starts at: `http://localhost:3000`

### Build for Production

```bash
pnpm run build
```

### Start Production Build

```bash
pnpm run start
```

### Lint Code

```bash
pnpm run lint
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

- **JWT Authentication** - Access tokens (15m) and refresh tokens (7d)
- **Password Hashing** - bcrypt with automatic pre-save hashing
- **Helmet.js** - Security headers protection
- **CORS** - Environment-based origin validation
- **Input Validation** - ClassValidator with custom decorators
- **MongoDB ObjectId Validation** - Prevents invalid ObjectId injection
- **Exception Filtering** - No sensitive data leakage in error responses
- **Rate Limiting** - Ready for @nestjs/throttler integration

## 🏗 Architecture Highlights

### Modular Design

- **Auth Module** - Isolated authentication logic with strategies
- **Chat Module** - Self-contained messaging functionality
- **Users Module** - User management and schema
- **Common Module** - Shared exceptions, filters, guards, middleware

### Clean Separation

- **Controllers** - Handle HTTP requests/responses
- **Services** - Contain business logic
- **DTOs** - Validate and transform input
- **Schemas** - Define database structure
- **Strategies** - JWT and refresh token authentication

### Logging & Monitoring

- Request logging middleware captures all HTTP traffic
- Response timing for performance monitoring
- Conditional log levels (error/warn/log)
- Stack traces in development, clean messages in production

## 📦 Dependencies

### Core

- `@nestjs/core` - NestJS framework
- `@nestjs/common` - Common decorators and utilities
- `@nestjs/config` - Environment configuration
- `@nestjs/mongoose` - MongoDB integration

### Authentication

- `@nestjs/jwt` - JSON Web Token support
- `@nestjs/passport` - Passport.js integration
- `passport-jwt` - JWT strategy
- `bcryptjs` - Password hashing

### Validation

- `class-validator` - DTO validation
- `class-transformer` - Data transformation

### API Documentation

- `@nestjs/swagger` - OpenAPI/Swagger integration

### Real-time

- `@nestjs/websockets` - WebSocket support
- `socket.io` - Bidirectional communication (configured, not yet implemented)

### Security & Utilities

- `helmet` - HTTP headers security
- `mongoose` - MongoDB ODM
- `dotenv` - Environment variables

## 🚀 Roadmap

### Current Status: Production Ready ✅

- ✅ User authentication with JWT
- ✅ Message management with status tracking
- ✅ Chat room aggregation
- ✅ API versioning
- ✅ Error handling and logging
- ✅ Input validation
- ✅ Swagger documentation

### Next Priority: Real-time Features

- ⏳ WebSocket implementation for live messaging
- ⏳ Typing indicators
- ⏳ Online status updates
- ⏳ Real-time message delivery notifications

### Future Enhancements

- Rate limiting (@nestjs/throttler)
- Caching layer (Redis)
- Unit and integration tests (Jest)
- User search and discovery
- File/media upload support
- Message reactions and threading

## 📄 License

This project is proprietary and confidential.

---

**Status:** ✅ Production Ready  
**Last Updated:** February 19, 2026  
**API Version:** v1  
**Maintenance:** Active
