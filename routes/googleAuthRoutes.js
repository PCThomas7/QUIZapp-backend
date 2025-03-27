import express from 'express';
import { google } from 'googleapis';
import User from '../models/User.js';
import { authenticate } from '../middleware/authMiddleWare.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configure Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate Google OAuth URL
router.get('/auth-url', authenticate, (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: req.user.id // Pass user ID as state
  });

  res.json({ url });
});

// Handle Google OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Update user with tokens
    const userId = state;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).send('User not found');
    }
    
    user.googleAccessToken = tokens.access_token;
    user.googleRefreshToken = tokens.refresh_token;
    user.googleTokenExpiry = new Date(Date.now() + tokens.expiry_date);
    user.calendarIntegrationEnabled = true;
    
    await user.save();
    
    // Redirect to success page
    res.redirect('/calendar-connected');
  } catch (error) {
    console.error('Error during Google OAuth callback:', error);
    res.status(500).send('Authentication failed');
  }
});

// Disconnect Google Calendar
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Clear Google tokens
    user.googleAccessToken = null;
    user.googleRefreshToken = null;
    user.googleTokenExpiry = null;
    user.calendarIntegrationEnabled = false;
    
    await user.save();
    
    res.json({ message: 'Google Calendar disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ message: 'Failed to disconnect Google Calendar' });
  }
});

export default router;