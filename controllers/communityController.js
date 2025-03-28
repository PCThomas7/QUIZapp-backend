import CommunityPost from "../models/CommunityPost.js";
import User from "../models/User.js";
import { getFileUrl } from "../utilits/fileupload.js";

// Get all community posts

const communityController = {
  getAllPosts: async (req, res) => {
    try {
      const posts = await CommunityPost.find()
        .populate("author", "name email")
        .sort({ createdAt: -1 });

      res.status(200).json(posts);
    } catch (error) {
      console.error("Error fetching community posts:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  getPostById: async (req, res) => {
    try {
      const post = await CommunityPost.findById(req.params.id)
        .populate("author", "name email")
        .populate("comments.author", "name email");

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.status(200).json(post);
    } catch (error) {
      console.error("Error fetching community post:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Create a new post
  createPost: async (req, res) => {
    try {
      const { title, content } = req.body;
      let tags = [];

      if (req.body.tags) {
        try {
          tags = JSON.parse(req.body.tags);
        } catch (e) {
          console.error("Error parsing tags:", e);
        }
      }

      // Handle file uploads if any
      const attachments = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          attachments.push({
            url: getFileUrl(file),
            type: file.mimetype,
            name: file.originalname,
          });
        }
      }

      const newPost = new CommunityPost({
        title,
        content,
        author: req.user.id,
        tags,
        attachments,
      });

      await newPost.save();

      // Populate author details before sending response
      const populatedPost = await CommunityPost.findById(newPost._id).populate(
        "author",
        "name email"
      );

      res.status(201).json(populatedPost);
    } catch (error) {
      console.error("Error creating community post:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Update an existing post
  updatePost: async (req, res) => {
    try {
      const postId = req.params.id;
      const post = await CommunityPost.findById(postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Check if user is the author of the post
      if (post.author.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this post" });
      }

      const { title, content } = req.body;
      let tags = post.tags;

      if (req.body.tags) {
        try {
          tags = JSON.parse(req.body.tags);
        } catch (e) {
          console.error("Error parsing tags:", e);
        }
      }

      // Handle file uploads if any
      const attachments = [...post.attachments];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const uploadResult = await uploadToStorage(file);
          attachments.push({
            url: uploadResult.url,
            type: file.mimetype,
            name: file.originalname,
          });
        }
      }

      const updatedPost = await CommunityPost.findByIdAndUpdate(
        postId,
        {
          title: title || post.title,
          content: content || post.content,
          tags,
          attachments,
        },
        { new: true }
      )
        .populate("author", "name email")
        .populate("comments.author", "name email");

      res.status(200).json(updatedPost);
    } catch (error) {
      console.error("Error updating community post:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Delete a post
  deletePost: async (req, res) => {
    try {
      const postId = req.params.id;
      const post = await CommunityPost.findById(postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Check if user is the author of the post or an admin
      if (post.author.toString() !== req.user.id && req.user.role !== "Admin") {
        return res
          .status(403)
          .json({ message: "Not authorized to delete this post" });
      }

      await CommunityPost.findByIdAndDelete(postId);

      res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting community post:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Like a post
  likePost: async (req, res) => {
    try {
      const postId = req.params.id;
      const userId = req.user.id;

      const post = await CommunityPost.findById(postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Check if user has already liked the post
      if (post.likedBy.includes(userId)) {
        return res
          .status(400)
          .json({ message: "You have already liked this post" });
      }

      post.likes += 1;
      post.likedBy.push(userId);

      await post.save();

      res.status(200).json({ likes: post.likes });
    } catch (error) {
      console.error("Error liking community post:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Add a comment to a post
  addComment: async (req, res) => {
    try {
      const postId = req.params.id;
      const { content } = req.body;
      const userId = req.user.id;

      if (!content) {
        return res.status(400).json({ message: "Comment content is required" });
      }

      const post = await CommunityPost.findById(postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const comment = {
        content,
        author: userId,
      };

      post.comments.push(comment);
      await post.save();

      // Get the newly added comment with author details
      const updatedPost = await CommunityPost.findById(postId).populate(
        "comments.author",
        "name email"
      );

      const newComment = updatedPost.comments[updatedPost.comments.length - 1];

      res.status(201).json(newComment);
    } catch (error) {
      console.error("Error adding comment to community post:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Search posts
  searchPosts: async (req, res) => {
    try {
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const posts = await CommunityPost.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .populate("author", "name email");

      res.status(200).json(posts);
    } catch (error) {
      console.error("Error searching community posts:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Get posts by tag
  getPostsByTag: async (req, res) => {
    try {
      const { tagName } = req.params;

      if (!tagName) {
        return res.status(400).json({ message: "Tag name is required" });
      }

      const posts = await CommunityPost.find({ tags: tagName })
        .populate("author", "name email")
        .sort({ createdAt: -1 });

      res.status(200).json(posts);
    } catch (error) {
      console.error("Error fetching posts by tag:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Get popular posts (most liked)
  getPopularPosts: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 5;

      const posts = await CommunityPost.find()
        .populate("author", "name email")
        .sort({ likes: -1 })
        .limit(limit);

      res.status(200).json(posts);
    } catch (error) {
      console.error("Error fetching popular posts:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Get recent posts
  getRecentPosts: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 5;

      const posts = await CommunityPost.find()
        .populate("author", "name email")
        .sort({ createdAt: -1 })
        .limit(limit);

      res.status(200).json(posts);
    } catch (error) {
      console.error("Error fetching recent posts:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Remove attachment from post
  removeAttachment: async (req, res) => {
    try {
      const { id, attachmentId } = req.params;

      const post = await CommunityPost.findById(id);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Check if user is the author of the post
      if (post.author.toString() !== req.user.id && req.user.role !== "Admin") {
        return res
          .status(403)
          .json({ message: "Not authorized to update this post" });
      }

      // Find and remove the attachment
      const attachmentIndex = post.attachments.findIndex(
        (attachment) => attachment._id.toString() === attachmentId
      );

      if (attachmentIndex === -1) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      // Remove the attachment from the array
      post.attachments.splice(attachmentIndex, 1);
      await post.save();

      res.status(200).json({ message: "Attachment removed successfully" });
    } catch (error) {
      console.error("Error removing attachment:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};


export default communityController;