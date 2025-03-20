import mongoose from 'mongoose';

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

const Invitation = mongoose.model('Invitation', invitationSchema);

export default Invitation;
