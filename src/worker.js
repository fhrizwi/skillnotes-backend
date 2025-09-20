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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
          'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
          // Get the created user with createdAt
          const newUser = await env.DB.prepare(
            'SELECT userid, name, email, mobileno, profilepic, createdAt FROM users WHERE userid = ?'
          ).bind(result.meta.last_row_id).first();

          return createResponse({
            message: 'User created successfully',
            user: {
              userid: newUser.userid,
              name: newUser.name,
              email: newUser.email,
              mobileno: newUser.mobileno,
              profilepic: newUser.profilepic,
              createdAt: newUser.createdAt
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
          'SELECT userid, name, email, mobileno, password, profilepic, createdAt FROM users WHERE email = ?'
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
            profilepic: user.profilepic,
            createdAt: user.createdAt
          }
        });
      }

      // Edit profile endpoint
      if (url.pathname.startsWith('/api/edit-profile/') && method === 'POST') {
        const body = await request.json();
        const { name, email, mobileno, profilepic } = body;
        
        // Extract userid from URL path
        const pathParts = url.pathname.split('/');
        const userid = pathParts[pathParts.length - 1];

        // Validation
        if (!userid || isNaN(userid)) {
          return createErrorResponse('Valid User ID is required in URL');
        }

        if (name && !validateName(name)) {
          return createErrorResponse('Name must be at least 2 characters long');
        }

        if (email && !validateEmail(email)) {
          return createErrorResponse('Please provide a valid email address');
        }

        if (mobileno && !validateMobile(mobileno)) {
          return createErrorResponse('Please provide a valid 10-digit mobile number');
        }

        // Check if user exists
        const existingUser = await env.DB.prepare(
          'SELECT userid FROM users WHERE userid = ?'
        ).bind(userid).first();

        if (!existingUser) {
          return createErrorResponse('User not found', 404);
        }

        // Check if email or mobile is already taken by another user
        if (email || mobileno) {
          const conflictUser = await env.DB.prepare(
            'SELECT userid FROM users WHERE (email = ? OR mobileno = ?) AND userid != ?'
          ).bind(email || '', mobileno || '', userid).first();

          if (conflictUser) {
            return createErrorResponse('Email or mobile number already exists', 409);
          }
        }

        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];

        if (name) {
          updateFields.push('name = ?');
          updateValues.push(name);
        }
        if (email) {
          updateFields.push('email = ?');
          updateValues.push(email);
        }
        if (mobileno) {
          updateFields.push('mobileno = ?');
          updateValues.push(mobileno);
        }
        if (profilepic !== undefined) {
          updateFields.push('profilepic = ?');
          updateValues.push(profilepic);
        }

        if (updateFields.length === 0) {
          return createErrorResponse('No fields to update');
        }

        updateValues.push(userid);

        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE userid = ?`;
        const result = await env.DB.prepare(updateQuery).bind(...updateValues).run();

        if (result.success) {
          // Get updated user data
          const updatedUser = await env.DB.prepare(
            'SELECT userid, name, email, mobileno, profilepic, createdAt FROM users WHERE userid = ?'
          ).bind(userid).first();

          return createResponse({
            message: 'Profile updated successfully',
            user: {
              userid: updatedUser.userid,
              name: updatedUser.name,
              email: updatedUser.email,
              mobileno: updatedUser.mobileno,
              profilepic: updatedUser.profilepic,
              createdAt: updatedUser.createdAt
            }
          });
        } else {
          return createErrorResponse('Failed to update profile', 500);
        }
      }

      // Change password endpoint
      if (url.pathname.startsWith('/api/change-password/') && method === 'POST') {
        const body = await request.json();
        const { currentpass, newpass } = body;
        
        // Extract userid from URL path
        const pathParts = url.pathname.split('/');
        const userid = pathParts[pathParts.length - 1];

        // Validation
        if (!userid || isNaN(userid)) {
          return createErrorResponse('Valid User ID is required in URL');
        }

        if (!currentpass || !newpass) {
          return createErrorResponse('Current password and new password are required');
        }

        if (!validatePassword(newpass)) {
          return createErrorResponse('New password must be at least 6 characters long');
        }

        // Get user with current password
        const user = await env.DB.prepare(
          'SELECT userid, password FROM users WHERE userid = ?'
        ).bind(parseInt(userid)).first();

        if (!user) {
          return createErrorResponse('User not found', 404);
        }

        // Verify old password
        if (!verifyPassword(currentpass, user.password)) {
          return createErrorResponse('Current password is incorrect', 401);
        }

        // Hash new password
        const hashedNewPassword = hashPassword(newpass);

        // Update password
        const result = await env.DB.prepare(
          'UPDATE users SET password = ? WHERE userid = ?'
        ).bind(hashedNewPassword, parseInt(userid)).run();

        if (result.success) {
          return createResponse({
            message: 'Password changed successfully'
          });
        } else {
          return createErrorResponse('Failed to change password', 500);
        }
      }

      // Get user data endpoint
      if (url.pathname.startsWith('/api/user/') && method === 'GET') {
        // Extract userid from URL path
        const pathParts = url.pathname.split('/');
        const userid = pathParts[pathParts.length - 1];

        // Validation
        if (!userid || isNaN(userid)) {
          return createErrorResponse('Valid User ID is required in URL');
        }

        // Get user data
        const user = await env.DB.prepare(
          'SELECT userid, name, email, mobileno, profilepic, createdAt FROM users WHERE userid = ?'
        ).bind(parseInt(userid)).first();

        if (!user) {
          return createErrorResponse('User not found', 404);
        }

        return createResponse({
          message: 'User data retrieved successfully',
          user: {
            userid: user.userid,
            name: user.name,
            email: user.email,
            mobileno: user.mobileno,
            profilepic: user.profilepic,
            createdAt: user.createdAt
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
