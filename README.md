# SlotSwapper Backend

Node.js/Express REST API for peer-to-peer time slot scheduling and swapping. Built for the ServiceHive technical challenge.

## 🚀 Live API

**Backend URL**: https://slot-swap-backend.vercel.app

## 📋 Features

- **RESTful API**: 14 endpoints for complete functionality
- **JWT Authentication**: Secure user authentication and authorization
- **User Management**: Registration, login, and profile
- **Event CRUD**: Create, read, update, delete calendar events
- **Swap System**: Request, accept, reject time slot swaps
- **In-Memory Database**: Vercel-compatible data storage
- **CORS Enabled**: Cross-origin requests supported

## 🛠️ Tech Stack

- **Node.js** - JavaScript runtime
- **Express** 4.18.2 - Web framework
- **jsonwebtoken** 9.0.2 - JWT authentication
- **bcryptjs** 2.4.3 - Password hashing
- **cors** - Cross-origin resource sharing
- **In-Memory Database** - JavaScript arrays (Vercel compatible)

## 📦 Project Structure

```
backend/
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── events.js            # Event management routes
│   └── swap.js              # Swap request routes
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── db.js                    # In-memory database implementation
├── server.js                # Express app and server setup
├── vercel.json              # Vercel deployment configuration
├── package.json             # Dependencies and scripts
└── .env                     # Environment variables
```

## 🔧 Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/kartikchane/SlotSwap_Backend.git
   cd SlotSwap_Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   JWT_SECRET=your_super_secret_jwt_key_here
   NODE_ENV=development
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **API will be available at**
   ```
   http://localhost:3000/api
   ```

## 📝 Available Scripts

- `npm start` - Start the server
- `npm run dev` - Start with nodemon (auto-reload)

## 🔌 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/signup` | Register new user | No |
| POST | `/login` | Login user | No |
| GET | `/me` | Get current user | Yes |

### Event Routes (`/api/events`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get user's events | Yes |
| POST | `/` | Create new event | Yes |
| PUT | `/:id` | Update event | Yes |
| DELETE | `/:id` | Delete event | Yes |

### Swap Routes (`/api`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/swappable-slots` | Get marketplace listings | Yes |
| POST | `/swap-request` | Create swap request | Yes |
| POST | `/swap-response/:id` | Accept/reject swap | Yes |
| GET | `/swap-requests/incoming` | Get incoming requests | Yes |
| GET | `/swap-requests/outgoing` | Get outgoing requests | Yes |

## 📖 API Documentation

### 1. User Registration

**POST** `/api/auth/signup`

```json
// Request Body
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}

// Response (201)
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### 2. User Login

**POST** `/api/auth/login`

```json
// Request Body
{
  "email": "john@example.com",
  "password": "securePassword123"
}

// Response (200)
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### 3. Create Event

**POST** `/api/events`

```json
// Request Headers
{
  "Authorization": "Bearer <token>"
}

// Request Body
{
  "title": "Team Meeting",
  "startTime": "2025-11-07T14:00:00",
  "endTime": "2025-11-07T15:00:00",
  "status": "BUSY"
}

// Response (201)
{
  "event": {
    "id": 1,
    "user_id": 1,
    "title": "Team Meeting",
    "start_time": "2025-11-07T14:00:00",
    "end_time": "2025-11-07T15:00:00",
    "status": "BUSY",
    "created_at": "2025-11-05T10:30:00"
  }
}
```

### 4. Update Event Status

**PUT** `/api/events/:id`

```json
// Request Headers
{
  "Authorization": "Bearer <token>"
}

// Request Body
{
  "status": "SWAPPABLE"
}

// Response (200)
{
  "event": {
    "id": 1,
    "user_id": 1,
    "title": "Team Meeting",
    "start_time": "2025-11-07T14:00:00",
    "end_time": "2025-11-07T15:00:00",
    "status": "SWAPPABLE",
    "created_at": "2025-11-05T10:30:00"
  }
}
```

### 5. Get Swappable Slots (Marketplace)

**GET** `/api/swappable-slots`

```json
// Request Headers
{
  "Authorization": "Bearer <token>"
}

// Response (200)
{
  "slots": [
    {
      "id": 2,
      "user_id": 2,
      "title": "Client Call",
      "start_time": "2025-11-08T10:00:00",
      "end_time": "2025-11-08T11:00:00",
      "status": "SWAPPABLE",
      "owner_name": "Jane Smith",
      "owner_email": "jane@example.com"
    }
  ]
}
```

### 6. Request Swap

**POST** `/api/swap-request`

```json
// Request Headers
{
  "Authorization": "Bearer <token>"
}

// Request Body
{
  "mySlotId": 1,
  "theirSlotId": 2
}

// Response (201)
{
  "message": "Swap request created successfully",
  "request": {
    "id": 1,
    "requester_id": 1,
    "requester_slot_id": 1,
    "owner_id": 2,
    "owner_slot_id": 2,
    "status": "PENDING"
  }
}
```

### 7. Accept/Reject Swap

**POST** `/api/swap-response/:id`

```json
// Request Headers
{
  "Authorization": "Bearer <token>"
}

// Request Body
{
  "accept": true  // or false to reject
}

// Response (200) - If accepted
{
  "message": "Swap completed successfully"
}

// Response (200) - If rejected
{
  "message": "Swap request rejected"
}
```

## 🗄️ Database Schema

### In-Memory Database Structure

#### Users Table
```javascript
{
  id: number,
  name: string,
  email: string,
  password: string (hashed),
  created_at: string (ISO date)
}
```

#### Events Table
```javascript
{
  id: number,
  user_id: number,
  title: string,
  start_time: string (ISO date),
  end_time: string (ISO date),
  status: 'BUSY' | 'SWAPPABLE' | 'SWAP_PENDING',
  created_at: string (ISO date)
}
```

#### Swap Requests Table
```javascript
{
  id: number,
  requester_id: number,
  requester_slot_id: number,
  owner_id: number,
  owner_slot_id: number,
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED',
  created_at: string (ISO date),
  updated_at: string (ISO date)
}
```

## 🔒 Authentication & Security

### JWT Authentication

- **Token Generation**: On signup/login
- **Token Storage**: Client-side (localStorage)
- **Token Validation**: Middleware checks on protected routes
- **Password Security**: bcrypt hashing with salt rounds

### Protected Routes

All routes except `/auth/signup` and `/auth/login` require authentication:

```javascript
// Request Headers
{
  "Authorization": "Bearer <your_jwt_token>"
}
```

### Error Responses

```json
// 401 Unauthorized
{
  "error": "Access denied. No token provided"
}

// 400 Bad Request
{
  "error": "Invalid request data"
}

// 404 Not Found
{
  "error": "Event not found"
}

// 500 Internal Server Error
{
  "error": "Server error message"
}
```

## 🚢 Deployment (Vercel)

### Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Environment Variables on Vercel

Set these in your Vercel dashboard:

```
JWT_SECRET=your_production_jwt_secret
NODE_ENV=production
```

### Automatic Deployment

- **Push to main branch** → Auto-deploy to Vercel
- **Serverless Functions** → Each API route becomes a serverless function

## 🔄 Swap Logic Flow

1. **User A** marks event as SWAPPABLE
2. **User B** sees event in marketplace
3. **User B** requests swap with their own SWAPPABLE event
4. **User A** receives incoming request
5. **User A** accepts the swap
6. **Backend** performs:
   - Update both events to SWAP_PENDING
   - Exchange user_id (ownership)
   - Set both events to BUSY
   - Update swap request status to ACCEPTED

## 🐛 Known Limitations

### In-Memory Database

⚠️ **Important**: Data is stored in memory and will be lost on:
- Vercel cold starts (after inactivity)
- Server restarts
- Redeployments

**For Production**: Replace with persistent database:
- PostgreSQL (recommended)
- MongoDB
- MySQL
- Firebase

### Migration to Persistent DB

To migrate to a real database:

1. Install database driver (e.g., `pg` for PostgreSQL)
2. Replace `db.js` with actual database queries
3. Update `server.js` to connect to database
4. Add database connection string to environment variables

## 🧪 Testing with Postman

Import the Postman collection from `POSTMAN_TESTING_GUIDE.md` in the project root.

## 📄 License

This project is part of the ServiceHive technical challenge.

## 🤝 Contributing

This is a technical challenge project. For questions or issues, contact the repository owner.

## 📧 Contact

**Developer**: Kartik Chanekar
**GitHub**: [@kartikchane](https://github.com/kartikchane)
**Repository**: [SlotSwap_Backend](https://github.com/kartikchane/SlotSwap_Backend)

---

**Frontend Repository**: [SlotSwap_frontend](https://github.com/kartikchane/SlotSwap_frontend)
