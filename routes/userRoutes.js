const express = require('express');
const userRouter = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/authMiddleWare');
const { User, Batch } = require('../db/db');


// User management routes
// authorizeRoles('Super Admin', 'Admin','Student'),
// authenticate,
userRouter.get('/',   async (req, res) => {
    try {
      const { search, batch, role, status } = req.query;
      
      let query = {};
      
      // Apply filters
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (role && role !== 'All') {
        query.role = role;
      }
      
      if (status && status !== 'All') {
        query.status = status;
      }
      
      // Batch filter requires a more complex query with populate
      let users = await User.find(query).populate('batches').populate({
        path: 'batchSubscriptions.batch',
        model: 'Batch'
      });
      
      if (batch && batch !== 'All') {
        const batchObj = await Batch.findOne({ name: batch });
        if (batchObj) {
          users = users.filter(user => 
            user.batches.some(b => b._id.toString() === batchObj._id.toString())
          );
        }
      }
      
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });
  
  userRouter.put('/:id/role', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // Prevent changing Super Admin role for non-Super Admin users
      if (role === 'Super Admin' && req.user.role !== 'Super Admin') {
        return res.status(403).json({ message: 'Not authorized to assign Super Admin role' });
      }
      
      const user = await User.findByIdAndUpdate(
        id,
        { role },
        { new: true }
      );
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  });
  
  userRouter.put('/:id/batches', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { batches, batchSubscriptions } = req.body;
      
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update batches
      if (batches) {
        user.batches = batches;
      }
      
      // Update batch subscriptions
      if (batchSubscriptions) {
        user.batchSubscriptions = batchSubscriptions;
      }
      
      await user.save();
      
      res.json(user);
    } catch (error) {
      console.error('Error updating user batches:', error);
      res.status(500).json({ message: 'Failed to update user batches' });
    }
  });
  
  userRouter.put('/:id/status', authenticate, authorizeRoles('Super Admin', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const user = await User.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: 'Failed to update user status' });
    }
  });
  
userRouter.delete('/:id', authenticate, authorizeRoles('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent Super Admin deletion
    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userToDelete.role === 'Super Admin') {
      return res.status(403).json({ message: 'Super Admin users cannot be deleted' });
    }

    // Delete user
    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = userRouter;