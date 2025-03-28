import { google } from 'googleapis';
import CalendarEvent from '../models/CalendarEvent.js';
import Quiz from '../models/Quiz.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Configure Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Create Google Calendar API client
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

export const calendarController = {
  // Create a calendar event for a quiz
  createEvent: async (req, res) => {
    try {
      const { quizId, event } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!quizId || !event || !event.start || !event.end) {
        return res.status(400).json({ message: 'Missing required event information' });
      }

      // Find the quiz
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res.status(404).json({ message: 'Quiz not found' });
      }

      // Create event in database
      const calendarEvent = new CalendarEvent({
        quizId,
        userId,
        summary: event.summary || quiz.title,
        description: event.description || `Quiz: ${quiz.title}`,
        location: event.location || '',
        colorId: event.colorId || '1',
        startDateTime: new Date(event.start),
        endDateTime: new Date(event.end)
      });

      // Save to database
      await calendarEvent.save();

      // If user has Google Calendar integration enabled, create event in Google Calendar
      const user = await User.findById(userId);
      if (user && user.googleAccessToken) {
        try {
          // Set credentials
          oauth2Client.setCredentials({
            access_token: user.googleAccessToken,
            refresh_token: user.googleRefreshToken
          });

          // Create event in Google Calendar
          const googleEvent = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
              summary: calendarEvent.summary,
              description: calendarEvent.description,
              location: calendarEvent.location,
              colorId: calendarEvent.colorId,
              start: {
                dateTime: calendarEvent.startDateTime.toISOString(),
                timeZone: 'UTC'
              },
              end: {
                dateTime: calendarEvent.endDateTime.toISOString(),
                timeZone: 'UTC'
              }
            }
          });

          // Update calendar event with Google event ID
          calendarEvent.googleEventId = googleEvent.data.id;
          await calendarEvent.save();

          // Update quiz with calendar event ID
          quiz.calendarEventId = calendarEvent._id;
          quiz.isScheduled = true;
          quiz.startDate = calendarEvent.startDateTime;
          quiz.endDate = calendarEvent.endDateTime;
          await quiz.save();
        } catch (error) {
          console.error('Google Calendar API error:', error);
          // Continue even if Google Calendar fails
        }
      }

      return res.status(201).json({
        message: 'Calendar event created successfully',
        event: calendarEvent
      });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return res.status(500).json({ message: 'Failed to create calendar event' });
    }
  },

  // Update an existing calendar event
  updateEvent: async (req, res) => {
    try {
      const { eventId } = req.params;
      const { event } = req.body;
      const userId = req.user.id;

      // Find the calendar event
      const calendarEvent = await CalendarEvent.findById(eventId);
      if (!calendarEvent) {
        return res.status(404).json({ message: 'Calendar event not found' });
      }

      // Check if user owns the event
      if (calendarEvent.userId.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this event' });
      }

      // Update event fields
      if (event.summary) calendarEvent.summary = event.summary;
      if (event.description) calendarEvent.description = event.description;
      if (event.location) calendarEvent.location = event.location;
      if (event.colorId) calendarEvent.colorId = event.colorId;
      if (event.start) calendarEvent.startDateTime = new Date(event.start);
      if (event.end) calendarEvent.endDateTime = new Date(event.end);
      calendarEvent.updatedAt = new Date();

      // Save updated event
      await calendarEvent.save();

      // Update quiz with new dates
      const quiz = await Quiz.findById(calendarEvent.quizId);
      if (quiz) {
        quiz.startDate = calendarEvent.startDateTime;
        quiz.endDate = calendarEvent.endDateTime;
        await quiz.save();
      }

      // If Google Calendar event exists, update it
      if (calendarEvent.googleEventId) {
        const user = await User.findById(userId);
        if (user && user.googleAccessToken) {
          try {
            // Set credentials
            oauth2Client.setCredentials({
              access_token: user.googleAccessToken,
              refresh_token: user.googleRefreshToken
            });

            // Update Google Calendar event
            await calendar.events.update({
              calendarId: 'primary',
              eventId: calendarEvent.googleEventId,
              requestBody: {
                summary: calendarEvent.summary,
                description: calendarEvent.description,
                location: calendarEvent.location,
                colorId: calendarEvent.colorId,
                start: {
                  dateTime: calendarEvent.startDateTime.toISOString(),
                  timeZone: 'UTC'
                },
                end: {
                  dateTime: calendarEvent.endDateTime.toISOString(),
                  timeZone: 'UTC'
                }
              }
            });
          } catch (error) {
            console.error('Google Calendar API error:', error);
            // Continue even if Google Calendar fails
          }
        }
      }

      return res.status(200).json({
        message: 'Calendar event updated successfully',
        event: calendarEvent
      });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return res.status(500).json({ message: 'Failed to update calendar event' });
    }
  },

  // Delete a calendar event
  deleteEvent: async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;

      // Find the calendar event
      const calendarEvent = await CalendarEvent.findById(eventId);
      if (!calendarEvent) {
        return res.status(404).json({ message: 'Calendar event not found' });
      }

      // Check if user owns the event
      if (calendarEvent.userId.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to delete this event' });
      }

      // If Google Calendar event exists, delete it
      if (calendarEvent.googleEventId) {
        const user = await User.findById(userId);
        if (user && user.googleAccessToken) {
          try {
            // Set credentials
            oauth2Client.setCredentials({
              access_token: user.googleAccessToken,
              refresh_token: user.googleRefreshToken
            });

            // Delete Google Calendar event
            await calendar.events.delete({
              calendarId: 'primary',
              eventId: calendarEvent.googleEventId
            });
          } catch (error) {
            console.error('Google Calendar API error:', error);
            // Continue even if Google Calendar fails
          }
        }
      }

      // Update quiz to remove scheduling
      const quiz = await Quiz.findById(calendarEvent.quizId);
      if (quiz) {
        quiz.isScheduled = false;
        quiz.calendarEventId = null;
        await quiz.save();
      }

      // Delete the calendar event
      await CalendarEvent.findByIdAndDelete(eventId);

      return res.status(200).json({
        message: 'Calendar event deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return res.status(500).json({ message: 'Failed to delete calendar event' });
    }
  },

  // Get all calendar events for a user
  getEvents: async (req, res) => {
    try {
      const userId = req.user.id;

      // Find all calendar events for the user
      const events = await CalendarEvent.find({ userId })
        .populate('quizId', 'title description total_duration')
        .sort({ startDateTime: 1 });

      return res.status(200).json({
        events
      });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return res.status(500).json({ message: 'Failed to fetch calendar events' });
    }
  },

  // Get upcoming calendar events for a user
  getUpcomingEvents: async (req, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();

      // Find upcoming calendar events for the user
      const events = await CalendarEvent.find({
        userId,
        endDateTime: { $gte: now }
      })
        .populate('quizId', 'title description total_duration')
        .sort({ startDateTime: 1 });

      return res.status(200).json({
        events
      });
    } catch (error) {
      console.error('Error fetching upcoming calendar events:', error);
      return res.status(500).json({ message: 'Failed to fetch upcoming calendar events' });
    }
  }
};

export default calendarController;