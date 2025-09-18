import { createHash } from 'crypto';

// Password hashing
function hashPassword(password) {
  return createHash('sha256').update(password + 'salt').digest('hex');
}

// Verify password
function verifyPassword(password, hashedPassword) {
  return hashPassword(password) === hashedPassword;
}

// Input validation
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateMobile(mobile) {
  const mobileRegex = /^[0-9]{10}$/;
  return mobileRegex.test(mobile);
}

function validatePassword(password) {
  return password && password.length >= 6;
}

function validateName(name) {
  return name && name.trim().length >= 2;
}

// Response helper
function createResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Error response helper
function createErrorResponse(message, status = 400) {
  return createResponse({ error: message }, status);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    try {
      // Signup endpoint
      if (url.pathname === '/api/signup' && method === 'POST') {
        const body = await request.json();
        const { name, email, mobileno, password, profilepic } = body;

        // Validation
        if (!validateName(name)) {
          return createErrorResponse('Name must be at least 2 characters long');
        }
        if (!validateEmail(email)) {
          return createErrorResponse('Please provide a valid email address');
        }
        if (!validateMobile(mobileno)) {
          return createErrorResponse('Please provide a valid 10-digit mobile number');
        }
        if (!validatePassword(password)) {
          return createErrorResponse('Password must be at least 6 characters long');
        }

        // Check if user already exists
        const existingUser = await env.DB.prepare(
          'SELECT userid FROM users WHERE email = ? OR mobileno = ?'
        ).bind(email, mobileno).first();

        if (existingUser) {
          return createErrorResponse('User with this email or mobile number already exists', 409);
        }

        // Hash password
        const hashedPassword = hashPassword(password);

        // Insert new user
        const result = await env.DB.prepare(
          'INSERT INTO users (name, email, mobileno, password, profilepic) VALUES (?, ?, ?, ?, ?)'
        ).bind(name, email, mobileno, hashedPassword, profilepic || null).run();

        if (result.success) {
          return createResponse({
            message: 'User created successfully',
            user: {
              userid: result.meta.last_row_id,
              name,
              email,
              mobileno,
              profilepic: profilepic || null
            }
          }, 201);
        } else {
          return createErrorResponse('Failed to create user', 500);
        }
      }

      // Login endpoint
      if (url.pathname === '/api/login' && method === 'POST') {
        const body = await request.json();
        const { email, password } = body;

        // Validation
        if (!email || !password) {
          return createErrorResponse('Email and password are required');
        }

        if (!validateEmail(email)) {
          return createErrorResponse('Please provide a valid email address');
        }

        // Find user by email
        const user = await env.DB.prepare(
          'SELECT userid, name, email, mobileno, password, profilepic FROM users WHERE email = ?'
        ).bind(email).first();

        if (!user) {
          return createErrorResponse('Invalid email or password', 401);
        }

        // Verify password
        if (!verifyPassword(password, user.password)) {
          return createErrorResponse('Invalid email or password', 401);
        }

        return createResponse({
          message: 'Login successful',
          user: {
            userid: user.userid,
            name: user.name,
            email: user.email,
            mobileno: user.mobileno,
            profilepic: user.profilepic
          }
        });
      }

      // Health check endpoint
      if (url.pathname === '/api/health' && method === 'GET') {
        return createResponse({ status: 'OK', message: 'API is running' });
      }

      // 404 for unknown endpoints
      return createErrorResponse('Endpoint not found', 404);

    } catch (error) {
      console.error('API Error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  },
};
