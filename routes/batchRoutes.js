import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleWare.js';
import { Batch, User } from '../db/db.js';

const batchRouter = express.Router();

// Batch management routes
batchRouter.get('/', authenticate, async (req, res) => {
  try {
    const batches = await Batch.find({ active: true });
    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ message: 'Failed to fetch batches' });
  }
});

batchRouter.post('/', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if batch already exists
    const existingBatch = await Batch.findOne({ name });
    if (existingBatch) {
      return res.status(400).json({ message: 'Batch with this name already exists' });
    }
    
    const batch = new Batch({
      name,
      description,
      createdBy: req.user._id
    });
    
    await batch.save();
    res.status(201).json(batch);
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ message: 'Failed to create batch' });
  }
});

batchRouter.put('/:id', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, active } = req.body;
    
    const batch = await Batch.findById(id);
    
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    if (name && name !== batch.name) {
      // Check if new name already exists
      const existingBatch = await Batch.findOne({ name });
      if (existingBatch) {
        return res.status(400).json({ message: 'Batch with this name already exists' });
      }
      
      batch.name = name;
    }
    
    if (description !== undefined) {
      batch.description = description;
    }
    
    if (active !== undefined) {
      batch.active = active;
    }
    
    await batch.save();
    
    res.json(batch);
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ message: 'Failed to update batch' });
  }
});

batchRouter.delete('/:id', authenticate, authorizeRoles('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const batch = await Batch.findById(id);
    
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    // Check if users are assigned to this batch
    const usersWithBatch = await User.find({ batches: id });
    
    if (usersWithBatch.length > 0) {
      // Instead of deleting, just mark as inactive
      batch.active = false;
      await batch.save();
      
      return res.json({ 
        message: 'Batch marked as inactive because users are assigned to it',
        deactivated: true 
      });
    }
    
    // If no users are assigned, we can delete it
    await Batch.findByIdAndDelete(id);
    
    res.json({ 
      message: 'Batch deleted successfully',
      deactivated: false 
    });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ message: 'Failed to delete batch' });
  }
});

// Add this route to get quizzes assigned to a batch

// Get quizzes assigned to a batch
batchRouter.get('/:id/quizzes', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the batch
    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    // Get assigned quizzes
    const quizzes = await batch.getAssignedQuizzes();
    
    res.json({ quizzes });
  } catch (error) {
    console.error('Error fetching batch quizzes:', error);
    res.status(500).json({ message: 'Failed to fetch batch quizzes' });
  }
});
export default batchRouter;