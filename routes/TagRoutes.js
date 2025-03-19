import express from 'express';
import multer from 'multer';
import csv from 'csv-parse';
import TagSystem from '../models/TagSystem';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all tags
router.get('/', async (req, res) => {
  try {
    const tagSystem = await TagSystem.findOne();
    if (!tagSystem) {
      // Create default tag system if none exists
      const defaultSystem = new TagSystem({
        exam_types: [],
        subjects: new Map(),
        chapters: new Map(),
        topics: new Map(),
        difficulty_levels: ['Easy', 'Medium', 'Hard'],
        question_types: ['MCQ', 'Numeric', 'MMCQ'],
        sources: []
      });
      await defaultSystem.save();
      return res.json(defaultSystem);
    }
    res.json(tagSystem);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tags' });
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

    if (category === 'subjects' && examType) {
      if (!tagSystem.subjects.has(examType)) {
        tagSystem.subjects.set(examType, []);
      }
      const subjects = tagSystem.subjects.get(examType);
      if (!subjects?.includes(tag)) {
        subjects?.push(tag);
      }
    } else if (category === 'chapters' && subject) {
      if (!tagSystem.chapters.has(subject)) {
        tagSystem.chapters.set(subject, []);
      }
      const chapters = tagSystem.chapters.get(subject);
      if (!chapters?.includes(tag)) {
        chapters?.push(tag);
      }
    } else if (category === 'topics' && chapter) {
      if (!tagSystem.topics.has(chapter)) {
        tagSystem.topics.set(chapter, []);
      }
      const topics = tagSystem.topics.get(chapter);
      if (!topics?.includes(tag)) {
        topics?.push(tag);
      }
    } else {
      if (!tagSystem[category].includes(tag)) {
        tagSystem[category].push(tag);
      }
    }

    await tagSystem.save();
    res.json({ message: 'Tag added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add tag' });
  }
});

// Update tag
router.put('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { oldValue, newValue } = req.body;
    
    const tagSystem = await TagSystem.findOne();
    if (!tagSystem) {
      return res.status(404).json({ message: 'Tag system not found' });
    }

    if (category === 'subjects') {
      for (const [examType, subjects] of tagSystem.subjects.entries()) {
        const index = subjects.indexOf(oldValue);
        if (index !== -1) {
          subjects[index] = newValue;
        }
      }
    } else if (category === 'chapters') {
      for (const [subject, chapters] of tagSystem.chapters.entries()) {
        const index = chapters.indexOf(oldValue);
        if (index !== -1) {
          chapters[index] = newValue;
        }
      }
    } else if (category === 'topics') {
      for (const [chapter, topics] of tagSystem.topics.entries()) {
        const index = topics.indexOf(oldValue);
        if (index !== -1) {
          topics[index] = newValue;
        }
      }
    } else {
      const index = tagSystem[category].indexOf(oldValue);
      if (index !== -1) {
        tagSystem[category][index] = newValue;
      }
    }

    await tagSystem.save();
    res.json({ message: 'Tag updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update tag' });
  }
});

// Delete tag
router.delete('/:category/:value', async (req, res) => {
  try {
    const { category, value } = req.params;
    
    const tagSystem = await TagSystem.findOne();
    if (!tagSystem) {
      return res.status(404).json({ message: 'Tag system not found' });
    }

    if (category === 'subjects') {
      for (const [examType, subjects] of tagSystem.subjects.entries()) {
        const index = subjects.indexOf(value);
        if (index !== -1) {
          subjects.splice(index, 1);
        }
      }
    } else if (category === 'chapters') {
      for (const [subject, chapters] of tagSystem.chapters.entries()) {
        const index = chapters.indexOf(value);
        if (index !== -1) {
          chapters.splice(index, 1);
        }
      }
    } else if (category === 'topics') {
      for (const [chapter, topics] of tagSystem.topics.entries()) {
        const index = topics.indexOf(value);
        if (index !== -1) {
          topics.splice(index, 1);
        }
      }
    } else {
      const index = tagSystem[category].indexOf(value);
      if (index !== -1) {
        tagSystem[category].splice(index, 1);
      }
    }

    await tagSystem.save();
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete tag' });
  }
});

// Upload CSV
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const parser = csv.parse({ columns: true });
    const records = [];

    parser.on('readable', () => {
      let record;
      while ((record = parser.read())) {
        records.push(record);
      }
    });

    parser.on('end', async () => {
      const tagSystem = await TagSystem.findOne();
      if (!tagSystem) {
        return res.status(404).json({ message: 'Tag system not found' });
      }

      for (const record of records) {
        const { exam_type, subject, chapter, topic } = record;

        // Add exam type
        if (!tagSystem.exam_types.includes(exam_type)) {
          tagSystem.exam_types.push(exam_type);
        }

        // Add subject
        if (!tagSystem.subjects.has(exam_type)) {
          tagSystem.subjects.set(exam_type, []);
        }
        const subjects = tagSystem.subjects.get(exam_type);
        if (!subjects?.includes(subject)) {
          subjects?.push(subject);
        }

        // Add chapter
        if (!tagSystem.chapters.has(subject)) {
          tagSystem.chapters.set(subject, []);
        }
        const chapters = tagSystem.chapters.get(subject);
        if (!chapters?.includes(chapter)) {
          chapters?.push(chapter);
        }

        // Add topic
        if (!tagSystem.topics.has(chapter)) {
          tagSystem.topics.set(chapter, []);
        }
        const topics = tagSystem.topics.get(chapter);
        if (!topics?.includes(topic)) {
          topics?.push(topic);
        }
      }

      await tagSystem.save();
      res.json({ message: 'Tags uploaded successfully' });
    });

    parser.write(req.file.buffer.toString());
    parser.end();
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload tags' });
  }
});

export default router;