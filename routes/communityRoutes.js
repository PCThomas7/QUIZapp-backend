import express from 'express';
const router = express.Router();
import communityController from '../controllers/communityController.js';
import { authenticate, authorizeRoles } from '../middleware/authMiddleWare.js';
import {upload, storage} from '../utilits/fileupload.js';

// Get all posts
router.get('/posts', authenticate, communityController.getAllPosts);

// Get a single post by ID
router.get('/posts/:id', authenticate, communityController.getPostById);

// Create a new post
router.post(
  '/posts',
  authenticate,
  authorizeRoles('Admin'), // Only admins can create posts
  upload.array('attachments', 5), // Allow up to 5 file uploads
  communityController.createPost
);

// Update an existing post
router.put(
  '/posts/:id',
  authenticate,
  authorizeRoles('Admin'), // Only admins can update posts
  upload.array('attachments', 5),
  communityController.updatePost
);

// Delete a post
router.delete(
  '/posts/:id',
  authenticate,
  authorizeRoles('Admin'),
  communityController.deletePost
);

// Like a post
router.post(
  '/posts/:id/like',
  authenticate,
  communityController.likePost
);

// Add a comment to a post
router.post(
  '/posts/:id/comments',
  authenticate,
  communityController.addComment
);

// Search posts
router.get(
  '/search',
  authenticate,
  communityController.searchPosts
);

// Get posts by tag
router.get(
  '/posts/tag/:tagName',
  authenticate,
  communityController.getPostsByTag
);

// Get popular posts (most liked)
router.get(
  '/posts/popular',
  authenticate,
  communityController.getPopularPosts
);

// Get recent posts
router.get(
  '/posts/recent',
  authenticate,
  communityController.getRecentPosts
);

// Remove attachment from post
router.delete(
  '/posts/:id/attachments/:attachmentId',
  authenticate,
  authorizeRoles('Admin'),
  communityController.removeAttachment
);

export default router;