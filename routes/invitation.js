const express = require('express');
const invitationRouter = express.Router();
const crypto = require('crypto');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleWare');
const { User, Invitation } = require('../db/db');
const { sendInvitationEmail } = require('../utilits/email');  


// Invitation routes
invitationRouter.post('/', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { emails, role, batches, expiresOn } = req.body;
    
    // Split emails by comma
    const emailList = emails.split(',').map(email => email.trim());
    
    const results = {
      success: [],
      already_exists: [],
      failed: []
    };
    
    for (const email of emailList) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
          results.already_exists.push(email);
          continue;
        }
        
        // Check if there's already a pending invitation
        const existingInvitation = await Invitation.findOne({ 
          email, 
          status: 'Pending',
          expiresAt: { $gt: new Date() }
        });
        
        if (existingInvitation) {
          // Update existing invitation
          existingInvitation.role = role;
          existingInvitation.batches = batches;
          
          if (expiresOn) {
            existingInvitation.batchSubscriptions = batches.map(batch => ({
              batch,
              expiresOn: new Date(expiresOn)
            }));
          } else {
            existingInvitation.batchSubscriptions = [];
          }
          
          existingInvitation.invitedBy = req.user._id;
          existingInvitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
          
          await existingInvitation.save();
          results.success.push(email);
          
          // Send invitation email
          await sendInvitationEmail(existingInvitation);
          
          continue;
        }
        
        // Create new invitation
        const token = crypto.randomBytes(32).toString('hex');
        
        const invitation = new Invitation({
          email,
          role,
          batches,
          token,
          invitedBy: req.user._id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
        
        if (expiresOn) {
          invitation.batchSubscriptions = batches.map(batch => ({
            batch,
            expiresOn: new Date(expiresOn)
          }));
        }
        
        await invitation.save();
        results.success.push(email);
        
        // Send invitation email
        await sendInvitationEmail(invitation);
      } catch (error) {
        console.error(`Error inviting ${email}:`, error);
        results.failed.push(email);
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error creating invitations:', error);
    res.status(500).json({ message: 'Failed to create invitations' });
  }
});


module.exports = invitationRouter;
