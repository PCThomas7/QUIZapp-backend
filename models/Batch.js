import mongoose from 'mongoose';

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

module.exports = mongoose.model('Batch', batchSchema);
