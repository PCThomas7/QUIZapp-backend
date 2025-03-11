const express = require('express');
const invitationRouter = express.Router();
const crypto = require('crypto');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleWare');
const { User, Invitation, Batch } = require('../db/db');
const { sendInvitationEmail } = require('../utilits/email');

invitationRouter.post('/', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { emails, role, batches, expiresOn } = req.body;
    
    // Validate batch IDs exist
    const batchDocs = await Batch.find({ _id: { $in: batches } });
    if (batchDocs.length !== batches.length) {
      return res.status(400).json({ message: 'One or more batch IDs are invalid' });
    }

    // Split emails by comma and trim whitespace
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
        
        // Check for existing pending invitation
        const existingInvitation = await Invitation.findOne({ 
          email, 
          status: 'Pending',
          expiresAt: { $gt: new Date() }
        });
        
        if (existingInvitation) {
          // Update existing invitation
          existingInvitation.role = role;
          existingInvitation.batches = batchDocs.map(batch => batch._id);
          
          if (expiresOn) {
            existingInvitation.batchSubscriptions = batchDocs.map(batch => ({
              batch: batch._id,
              accessType: 'Full',
              expiresOn: new Date(expiresOn)
            }));
          }
          
          existingInvitation.invitedBy = req.user._id;
          existingInvitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          
          await existingInvitation.save();
          await sendInvitationEmail(existingInvitation);
          results.success.push(email);
          continue;
        }
        
        // Create new invitation
        const token = crypto.randomBytes(32).toString('hex');
        const invitation = new Invitation({
          email,
          role,
          batches: batchDocs.map(batch => batch._id),
          token,
          invitedBy: req.user._id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        
        if (expiresOn) {
          invitation.batchSubscriptions = batchDocs.map(batch => ({
            batch: batch._id,
            accessType: 'Full',
            expiresOn: new Date(expiresOn)
          }));
        }
        
        await invitation.save();
        await sendInvitationEmail(invitation);
        results.success.push(email);
        
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
