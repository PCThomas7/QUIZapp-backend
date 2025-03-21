import express from 'express';
import multer from 'multer';
import { TagSystem } from '../db/db.js';
import TagController from '../controllers/TagController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all tags
router.get('/', async (req, res) => {
  try {
    const tagSystem = await TagSystem.findOne();
    if (!tagSystem) {
      return res.status(404).json({ message: 'Tag system not found' });
    }

    // Use the enhanced model's getHierarchy method
    const hierarchy = tagSystem.getHierarchy();
    
    // Convert Maps to plain objects before sending
    const response = {
      ...tagSystem.toObject(),
      subjects: Object.fromEntries(tagSystem.subjects || new Map()),
      chapters: Object.fromEntries(tagSystem.chapters || new Map()),
      topics: Object.fromEntries(tagSystem.topics || new Map()),
      hierarchy // Add the hierarchical structure
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ message: 'Failed to fetch tags' });
  }
});

// Upload CSV route
router.post('/upload', async (req, res) => {
  try {
    const parsedData = req.body;
    
    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No valid records provided' 
      });
    }

    const tagSystem = await TagSystem.findOne();
    if (!tagSystem) {
      return res.status(404).json({ 
        success: false, 
        message: 'Tag system not found' 
      });
    }

    let counts = {
      exam_types: 0,
      subjects: 0,
      chapters: 0,
      topics: 0
    };

    // Group records by exam_type, subject, chapter for batch processing
    const groupedData = {};

    // First pass: clean and group data
    for (const row of parsedData) {
      try {
        // Clean and validate the data
        const exam_type = String(row.exam_type || '').trim();
        const subject = String(row.subject || '').trim();
        
        // Clean the chapter string
        let chapter = String(row.chapter || '').trim();
        if (chapter.includes('{') || chapter.includes('[') || 
            chapter.includes('\\n') || chapter.includes('\\t')) {
          console.log('Skipping malformed chapter:', chapter);
          continue;
        }
        
        chapter = chapter
          .replace(/[\[\]{}'"]/g, '') 
          .replace(/\s+/g, ' ')      
          .replace(/\\n/g, '')       
          .replace(/\\t/g, '')       
          .replace(/\\/g, '')        
          .trim();
        
        const topic = String(row.topic || '').trim();

        if (!exam_type || !subject || !chapter || !topic) {
          console.log('Skipping row with empty values:', { exam_type, subject, chapter, topic });
          continue;
        }

        // Group by exam_type, subject, chapter
        if (!groupedData[exam_type]) {
          groupedData[exam_type] = {};
        }
        if (!groupedData[exam_type][subject]) {
          groupedData[exam_type][subject] = {};
        }
        if (!groupedData[exam_type][subject][chapter]) {
          groupedData[exam_type][subject][chapter] = [];
        }
        
        // Add topic if not already in the array
        if (!groupedData[exam_type][subject][chapter].includes(topic)) {
          groupedData[exam_type][subject][chapter].push(topic);
        }
      } catch (error) {
        console.error('Error processing row:', error);
        continue;
      }
    }

    // Log the grouped data structure before processing
    console.log('Grouped data structure:', JSON.stringify(groupedData, null, 2));

    // Second pass: build hierarchy in the correct order (similar to initTags.js)
    for (const examType of Object.keys(groupedData)) {
      // Add exam type if it doesn't exist
      if (!tagSystem.exam_types.includes(examType)) {
        tagSystem.addExamType(examType);
        counts.exam_types++;
      }
      
      for (const subject of Object.keys(groupedData[examType])) {
        // Add subject to exam type
        if (!tagSystem.getSubjectsForExamType(examType).includes(subject)) {
          tagSystem.addSubject(examType, subject);
          counts.subjects++;
        }
        
        for (const chapter of Object.keys(groupedData[examType][subject])) {
          // Add chapter to subject
          if (!tagSystem.getChaptersForSubject(subject).includes(chapter)) {
            tagSystem.addChapter(subject, chapter);
            counts.chapters++;
          }
          
          // Add topics to chapter
          for (const topic of groupedData[examType][subject][chapter]) {
            // Log before adding topic
            console.log(`Adding topic "${topic}" to chapter "${chapter}"`);
            console.log(`Before: Topics for chapter "${chapter}":`, tagSystem.getTopicsForChapter(chapter));
            
            if (!tagSystem.getTopicsForChapter(chapter).includes(topic)) {
              tagSystem.addTopic(chapter, topic);
              counts.topics++;
            }
            
            // Log after adding topic
            console.log(`After: Topics for chapter "${chapter}":`, tagSystem.getTopicsForChapter(chapter));
            // Log the topics Map directly
            console.log(`Topics Map entry for "${chapter}":`, tagSystem.topics.get(chapter));
          }
        }
      }
    }

    // Check topics map before saving
    console.log('Topics map before saving:');
    console.log('- Topics map size:', tagSystem.topics.size);
    console.log('- Topics map keys:', Array.from(tagSystem.topics.keys()));
    console.log('- Sample topics entries:', Array.from(tagSystem.topics.entries()).slice(0, 3));

    // Convert Maps to objects for saving to ensure proper persistence
    const topicsObject = {};
    for (const [key, value] of tagSystem.topics.entries()) {
      topicsObject[key] = value;
    }
    
    const subjectsObject = {};
    for (const [key, value] of tagSystem.subjects.entries()) {
      subjectsObject[key] = value;
    }
    
    const chaptersObject = {};
    for (const [key, value] of tagSystem.chapters.entries()) {
      chaptersObject[key] = value;
    }

    // Save with direct update to ensure Maps are properly saved
    await TagSystem.findByIdAndUpdate(tagSystem._id, {
      exam_types: tagSystem.exam_types,
      subjects: subjectsObject,
      chapters: chaptersObject,
      topics: topicsObject,
      difficulty_levels: tagSystem.difficulty_levels,
      question_types: tagSystem.question_types,
      sources: tagSystem.sources
    }, { new: true });
    
    // Fetch the updated tag system
    const updatedTagSystem = await TagSystem.findById(tagSystem._id);
    
    // Log the current state of the tag system after saving
    console.log('Tag system after CSV upload:');
    console.log('- Exam types:', updatedTagSystem.exam_types.length);
    console.log('- Subjects size:', Object.keys(updatedTagSystem.subjects).length);
    console.log('- Chapters size:', Object.keys(updatedTagSystem.chapters).length);
    console.log('- Topics size:', Object.keys(updatedTagSystem.topics).length);
    
    // Get a sample of topics to verify
    const topicsSample = Object.entries(updatedTagSystem.topics).slice(0, 3);
    console.log('- Topics sample after save:', topicsSample);
    
    // Use the enhanced model's getHierarchy method
    const hierarchy = updatedTagSystem.getHierarchy();
    
    // Convert Maps to plain objects before sending
    const response = {
      success: true,
      message: 'Tags uploaded successfully',
      counts,
      hierarchy,
      subjects: updatedTagSystem.subjects,
      chapters: updatedTagSystem.chapters,
      topics: updatedTagSystem.topics
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error uploading tags:', error);
    res.status(500).json({ 
      success: false,
      message: `Failed to upload tags: ${error.message}` 
    });
  }
});

// Add new tag
router.post('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { examType, subject, chapter, tag } = req.body;
    
    const tagSystem = await TagSystem.findOne();
    if (!tagSystem) {
      return res.status(404).json({ message: 'Tag system not found' });
    }

    // Validate category
    const validCategories = ['exam_types', 'subjects', 'chapters', 'topics', 'difficulty_levels', 'question_types', 'sources'];
    if (!validCategories.includes(category)) {
      console.error('Invalid category:', category);
      return res.status(400).json({ message: 'Invalid category' });
    }

    if (category === 'subjects' && examType) {
      // Use the enhanced model's method
      tagSystem.addSubject(examType, tag);
    } else if (category === 'chapters' && subject) {
      // Use the enhanced model's method
      tagSystem.addChapter(subject, tag);
    } else if (category === 'topics' && chapter) {
      // Use the enhanced model's method
      tagSystem.addTopic(chapter, tag);
    } else if (category === 'exam_types') {
      // Use the enhanced model's method
      tagSystem.addExamType(tag);
    } else {
      // For other categories (difficulty_levels, question_types, sources)
      if (!Array.isArray(tagSystem[category])) {
        console.error('Category not found in tag system:', category);
        return res.status(400).json({ message: 'Invalid category' });
      }

      if (!tagSystem[category].includes(tag)) {
        tagSystem[category].push(tag);
      }
    }

    await tagSystem.save();
    res.json({ 
      success: true,
      message: 'Tag added successfully',
      hierarchy: tagSystem.getHierarchy() 
    });
  } catch (error) {
    console.error('Error adding tag:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to add tag' 
    });
  }
});



// Debug route to check tag system structure
router.get('/debug', async (req, res) => {
  try {
    const tagSystem = await TagSystem.findOne();
    if (!tagSystem) {
      return res.status(404).json({ message: 'Tag system not found' });
    }

    // Check if Maps have data
    const subjectsSize = tagSystem.subjects.size;
    const chaptersSize = tagSystem.chapters.size;
    const topicsSize = tagSystem.topics.size;

    // Get sample entries
    const subjectsSample = Array.from(tagSystem.subjects.entries()).slice(0, 3);
    const chaptersSample = Array.from(tagSystem.chapters.entries()).slice(0, 3);
    const topicsSample = Array.from(tagSystem.topics.entries()).slice(0, 3);

    // Get hierarchy
    const hierarchy = tagSystem.getHierarchy();

    // Test different serialization methods
    const directJson = {
      subjects: Object.fromEntries(tagSystem.subjects),
      chapters: Object.fromEntries(tagSystem.chapters),
      topics: Object.fromEntries(tagSystem.topics)
    };

    const toObjectJson = {
      ...tagSystem.toObject(),
      subjects: Object.fromEntries(tagSystem.subjects),
      chapters: Object.fromEntries(tagSystem.chapters),
      topics: Object.fromEntries(tagSystem.topics)
    };

    res.json({
      mapSizes: {
        subjects: subjectsSize,
        chapters: chaptersSize,
        topics: topicsSize
      },
      samples: {
        subjects: subjectsSample,
        chapters: chaptersSample,
        topics: topicsSample
      },
      hierarchy,
      serialization: {
        direct: directJson,
        toObject: toObjectJson
      }
    });
  } catch (error) {
    console.error('Error in debug route:', error);
    res.status(500).json({ message: 'Debug error', error: error.message });
  }
});

router.get('/', TagController.getAllTags);
router.post('/:category', TagController.addTag);
router.put('/:category', TagController.updateTag);
router.delete('/:category/:value', TagController.deleteTag);
router.post('/upload', TagController.uploadTagsCsv);

export default router;