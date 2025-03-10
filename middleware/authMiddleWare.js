const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../db/db');

// Initialize Google OAuth2 client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware for role-based access control
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      next();
    };
  };
  
  // Authentication middleware
  const authenticate = async (req, res, next) => {
    try {
      // Check if Authorization header exists and has correct format
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Invalid authorization header format' });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ message: 'Invalid token' });
    }
  };
  

   module.exports = { authorizeRoles, authenticate };