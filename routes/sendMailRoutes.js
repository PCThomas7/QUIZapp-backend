const express = require('express');
const sendMailRouter = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/authMiddleWare');
const {User} = require('../db/db');
const transporter = require('../utilits/transporter');


// Send bulk emails
sendMailRouter.post('/bulk', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
    try {
      const { subject, body, users } = req.body;
      
      if (!subject || !body || !users || !users.length) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const results = {
        success: [],
        failed: []
      };
      
      for (const userId of users) {
        try {
          const user = await User.findById(userId);
          
          if (!user) {
            results.failed.push(userId);
            continue;
          }
          
          // Send email
          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject,
            html: body
          });
          
          results.success.push(userId);
        } catch (error) {
          console.error(`Error sending email to user ${userId}:`, error);
          results.failed.push(userId);
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      res.status(500).json({ message: 'Failed to send emails' });
    }
  });

  module.exports = sendMailRouter;
  