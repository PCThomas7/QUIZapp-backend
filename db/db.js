const mongoose = require('mongoose');
require('dotenv').config();



// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);



// Models
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    googleId: { type: String, required: true, unique: true },
    role: { 
      type: String, 
      enum: ['Super Admin', 'Admin', 'Mentor', 'Student'],
      default: 'Student'
    },
    status: { 
      type: String, 
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    joinDate: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    profilePicture: { type: String },
    batches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch'
    }],
    batchSubscriptions: [{
      batch: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch' 
      },
      expiresOn: { type: Date }
    }]
  });
  
  const batchSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    active: { type: Boolean, default: true }
  });
  
  const invitationSchema = new mongoose.Schema({
    email: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['Super Admin', 'Admin', 'Mentor', 'Student'],
      default: 'Student'
    },
    batches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch'
    }],
    batchSubscriptions: [{
      batch: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch' 
      },
      expiresOn: { type: Date }
    }],
    token: { type: String, required: true },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    status: { 
      type: String, 
      enum: ['Pending', 'Accepted', 'Expired'],
      default: 'Pending'
    }
  });
  
  const User = mongoose.model('User', userSchema);
  const Batch = mongoose.model('Batch', batchSchema);
  const Invitation = mongoose.model('Invitation', invitationSchema);


  module.exports = {
    User,
    Batch,
    Invitation
  };