# SkillNotes Backend API

A Cloudflare Workers-based backend API for the SkillNotes application, providing user authentication and course management functionality.

## Features

- User registration and authentication
- Password hashing for security
- JWT token-based authentication
- Input validation
- CORS support
- SQLite database integration with Cloudflare D1

## API Endpoints

### Authentication

#### POST `/api/signup`
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "mobileno": "1234567890",
  "password": "password123",
  "profilepic": "https://example.com/profile.jpg" // optional
}
```

**Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "userid": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "mobileno": "1234567890",
    "profilepic": "https://example.com/profile.jpg"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST `/api/login`
Authenticate a user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "userid": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "mobileno": "1234567890",
    "profilepic": "https://example.com/profile.jpg"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET `/api/profile`
Get user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "userid": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "mobileno": "1234567890",
    "profilepic": "https://example.com/profile.jpg",
    "createdAt": "2024-01-01 12:00:00"
  }
}
```

### Utility

#### GET `/api/health`
Health check endpoint.

**Response (200):**
```json
{
  "status": "OK",
  "message": "API is running"
}
```

## Validation Rules

- **Name**: Minimum 2 characters
- **Email**: Valid email format
- **Mobile**: Exactly 10 digits
- **Password**: Minimum 6 characters

## Error Responses

All error responses follow this format:
```json
{
  "error": "Error message"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid credentials)
- `404`: Not Found (endpoint not found)
- `409`: Conflict (user already exists)
- `500`: Internal Server Error

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npm run setup-db-schema
```

3. Start development server:
```bash
npm run dev
```

4. Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Database Schema

The API uses the following tables from `schema.sql`:
- `users`: User accounts and authentication
- `courses`: Course information
- `purchased`: User course purchases
- `coursereviews`: Course reviews and ratings
- `fileinfo`: Course file information

## Security Features

- Password hashing using SHA-256 with salt
- JWT token generation for authentication
- Input validation and sanitization
- CORS protection
- SQL injection prevention using prepared statements

## Testing the API

### Signup
```bash
curl -X POST http://localhost:8787/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "mobileno": "1234567890",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:8787/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Get Profile
```bash
curl -X GET http://localhost:8787/api/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## License

MIT