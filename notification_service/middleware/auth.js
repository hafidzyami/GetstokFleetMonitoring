// middleware/auth.js
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Error response helper
const errorResponse = (code, message) => ({
  apiVersion: '1.0',
  error: {
    code,
    message
  }
});

// Middleware to protect routes
const protected = async (req, res, next) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    
    // Check if authorization header is missing
    if (!authHeader) {
      return res.status(401).json(errorResponse(401, 'Authorization header is required'));
    }
    
    // Check if authorization header has the correct format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse(401, 'Invalid authentication token format'));
    }
    
    // Extract token from header
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token was issued before password change
    const result = await pool.query(
      'SELECT password_changed_at FROM users WHERE id = $1',
      [decoded.user_id]
    );
    
    // If user not found
    if (result.rows.length === 0) {
      return res.status(401).json(errorResponse(401, 'Invalid token - user not found'));
    }
    
    const user = result.rows[0];
    const issuedAt = new Date(decoded.issued_at * 1000); // Convert UNIX timestamp to Date
    const passwordChangedAt = new Date(user.password_changed_at);
    
    // If password was changed after token was issued, invalidate token
    if (passwordChangedAt > issuedAt) {
      return res.status(401).json(errorResponse(401, 'Token expired due to password change'));
    }
    
    // Add user ID and role to request object
    req.userId = decoded.user_id;
    req.role = decoded.role;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json(errorResponse(401, 'Invalid or expired token'));
  }
};

// Middleware to check role authorization
const roleAuthorization = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if role is allowed
      if (!allowedRoles.includes(req.role)) {
        return res.status(403).json(errorResponse(403, "You don't have permission to access this resource"));
      }
      
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      return res.status(500).json(errorResponse(500, 'Server error'));
    }
  };
};

module.exports = {
  protected,
  roleAuthorization
};