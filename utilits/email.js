const transporter = require('./transporter');
require('dotenv').config();

const sendInvitationEmail = async (invitation) => {
    try {
        const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite/${invitation.token}`;
        
        const mailOptions = {
            from: `"Quiz App" <${process.env.EMAIL_USER}>`,
            to: invitation.email,
            subject: 'Quiz App Invitation',
            html: `
                <h1>You've been invited!</h1>
                <p>You have been invited to join Quiz App as a ${invitation.role}.</p>
                <p>Click the link below to accept the invitation:</p>
                <a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
                <p>This invitation will expire in 7 days.</p>
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p>${inviteUrl}</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error('Failed to send invitation email');
    }
};

module.exports = {
    sendInvitationEmail
};