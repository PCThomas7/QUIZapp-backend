const nodemailer = require('nodemailer');
require('dotenv').config();


// Helper function to send invitation email
async function sendInvitationEmail(invitation) {
    try {
      const invitationUrl = `${process.env.FRONTEND_URL}/join?token=${invitation.token}`;
      
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: invitation.email,
        subject: 'Invitation to Join LMS',
        html: `
          <h1>You've been invited!</h1>
          <p>You've been invited to join our Learning Management System with the role of <strong>${invitation.role}</strong>.</p>
          <p>Click the button below to accept the invitation:</p>
          <p>
            <a href="${invitationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Accept Invitation
            </a>
          </p>
          <p>This invitation expires in 7 days.</p>
        `
      });
      
      return true;
    } catch (error) {
      console.error('Error sending invitation email:', error);
      return false;
    }
  }

  module.exports = sendInvitationEmail;