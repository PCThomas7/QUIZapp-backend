const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  batchSubscriptions: [{
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    accessType: { type: String, required: true },
    expiresOn: { type: Date }
  }],
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});