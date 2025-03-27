import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleWare.js';
import calendarController from '../controllers/calendarController.js';

const router = express.Router();

// Create a calendar event
router.post('/events', authenticate, calendarController.createEvent);

// Update a calendar event
router.put('/events/:eventId', authenticate, calendarController.updateEvent);

// Delete a calendar event
router.delete('/events/:eventId', authenticate, calendarController.deleteEvent);

// Get all calendar events for a user
router.get('/events', authenticate, calendarController.getEvents);

// Get upcoming calendar events for a user
router.get('/events/upcoming', authenticate, calendarController.getUpcomingEvents);

export default router;