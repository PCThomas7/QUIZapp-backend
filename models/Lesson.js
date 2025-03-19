const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['video', 'pdf', 'quiz'],
      required: true
    },
    provider: { 
      type: String, 
      enum: ['youtube', 'vimeo', null],
      default: null
    },
    duration: { type: String },
    content: { type: String, required: true },
    preview: { 
      type: Boolean, 
      default: false
    },
    order: { type: Number, required: true },
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true
    }
  });
  

module.exports = mongoose.model('Lesson', lessonSchema);
