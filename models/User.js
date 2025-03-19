import mongoose from 'mongoose';

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

const User = mongoose.model('User', userSchema);

export default User;