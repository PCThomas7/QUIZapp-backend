import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { User, Invitation } from '../db/db.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const googleClient = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
});

router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;
        
        // Get user info using access token
        const ticket = await googleClient.getTokenInfo(token);
        
        const googleId = ticket.sub;
        const email = ticket.email;
        const name = ticket.name || email.split('@')[0]; // Fallback name if not provided

        // Check if user exists
        let user = await User.findOne({ googleId });

        if (!user) {
            // Check for pending invitation
            const invitation = await Invitation.findOne({ 
                email, 
                status: 'Pending',
                expiresAt: { $gt: new Date() }
            });

            // Create new user
            user = new User({
                googleId,
                email,
                name,
                role: invitation ? invitation.role : 'Student',
                joinDate: new Date()
            });

            if (invitation) {
                user.batches = invitation.batches;
                user.batchSubscriptions = invitation.batchSubscriptions;
                invitation.status = 'Accepted';
                await invitation.save();
            }

            await user.save();
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const jwtToken = jwt.sign(
            { 
                userId: user._id,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token: jwtToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profilePicture
            }
        });

    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ message: 'Authentication failed' });
    }
});

export default router;