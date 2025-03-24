import express from 'express';
import { QuestionBank } from '../db/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    console.log('Received query params:', req.query);
    try {
      const {
        page = 1,
        limit = 10,
        filters = {},  // Get the filters object
        searchQuery = '', // Rename search to searchQuery
      } = req.query;

      // Parse filters if it's a string
      const parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
      
      // Build filter query
      const filter = {};
      
      // Handle tag filters
      if (Object.keys(parsedFilters).length > 0) {
        // Add each filter to the tags object
        Object.entries(parsedFilters).forEach(([key, value]) => {
          if (value) {
            filter[`tags.${key}`] = value;
          }
        });
      }
  
      // Add search query if present
      if (searchQuery) {
        filter.$or = [
          { question_text: { $regex: searchQuery, $options: 'i' } },
          { option_a: { $regex: searchQuery, $options: 'i' } },
          { option_b: { $regex: searchQuery, $options: 'i' } },
          { option_c: { $regex: searchQuery, $options: 'i' } },
          { option_d: { $regex: searchQuery, $options: 'i' } },
          { explanation: { $regex: searchQuery, $options: 'i' } },
        ];
      }

      console.log('Applied filter:', JSON.stringify(filter, null, 2));
  
      const skip = (parseInt(page) - 1) * parseInt(limit);
  
      const [questions, totalCount] = await Promise.all([
        QuestionBank.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        QuestionBank.countDocuments(filter),
      ]);

      console.log(`Found ${questions.length} questions out of ${totalCount} total`);
      console.log('Filter conditions:', filter);
      console.log('Sample question tags:', questions[0]?.tags);
  
      res.json({
        success: true,
        data: {
          questions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalQuestions: totalCount,
            questionsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to fetch questions',
          message: error.message 
        });
    }
});

router.post('/bulk', async (req, res) => {
    try {
      const questions = req.body;
      
      // Validate questions before bulk insert
      const validQuestions = questions.filter(question => {
        return question.id && 
               question.question_text && 
               question.option_a &&
               question.option_b &&
               question.option_c &&
               question.option_d &&
               question.correct_answer &&
               question.tags;
      });

      if (validQuestions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid questions to import'
        });
      }

      // Save to database
      await QuestionBank.insertMany(validQuestions, { 
        ordered: false 
      });
      
      res.status(200).json({ 
        success: true,
        message: 'Questions imported successfully',
        count: validQuestions.length 
      });
    } catch (error) {
      console.error("Error in bulk question import:", error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to import questions',
        message: error.message 
      });
    }
});

// Add this route to handle question deletion
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await QuestionBank.findByIdAndDelete(id);
    res.json({ 
      success: true,
      message: 'Question deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete question' 
    });
  }
});

// Add bulk update route
router.patch('/bulk-update', async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid questions to update'
      });
    }

    // Process each question update
    const updatePromises = questions.map(async (question) => {
      if (!question.id) return null;
      
      // Find and update the question
      return QuestionBank.findOneAndUpdate(
        { id: question.id },
        { 
          $set: {
            ...question,
            updatedAt: new Date()
          }
        },
        { new: true }
      );
    });

    const updatedQuestions = await Promise.all(updatePromises);
    const validUpdates = updatedQuestions.filter(q => q !== null);

    res.status(200).json({
      success: true,
      message: `${validUpdates.length} questions updated successfully`,
      data: validUpdates
    });
  } catch (error) {
    console.error("Error in bulk question update:", error);
    res.status(500).json({
      success: false,
      error: 'Failed to update questions',
      message: error.message
    });
  }
});

export default router;