import express from 'express';
import { QuestionBank } from '../db/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    console.log(req.query);
    try {
      const {
        page = 1,
        limit = 10,
        search,
        exam_type,
        subject,
        chapter,
        topic,
        difficulty_level,
        question_type,
        source,
      } = req.query;
  
      // Build filter query
      const filter = {};
      if (exam_type) filter['tags.exam_type'] = exam_type;
      if (subject) filter['tags.subject'] = subject;
      if (chapter) filter['tags.chapter'] = chapter;
      if (topic) filter['tags.topic'] = topic;
      if (difficulty_level) filter['tags.difficulty_level'] = difficulty_level;
      if (question_type) filter['tags.question_type'] = question_type;
      if (source) filter['tags.source'] = source;
  
      // Add search query if present
      if (search) {
        filter.$or = [
          { question_text: { $regex: search, $options: 'i' } },
          { option_a: { $regex: search, $options: 'i' } },
          { option_b: { $regex: search, $options: 'i' } },
          { option_c: { $regex: search, $options: 'i' } },
          { option_d: { $regex: search, $options: 'i' } },
          { explanation: { $regex: search, $options: 'i' } },
        ];
      }
  
      const skip = (parseInt(page) - 1) * parseInt(limit);
  
      const [questions, totalCount] = await Promise.all([
        QuestionBank.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        QuestionBank.countDocuments(filter),
      ]);
  
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

export default router;