const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  question_text: {
    type: String,
    required: true
  },
  option_a: {
      type: String,
      required: true
    },
option_b: {
      type: String,
      required: true
    },
option_c: {
      type: String,
      required: true
    },
option_d: {
      type: String,
      required: true
  },
  correct_answer: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
  
  },
  image_url: String,
  option_a_image_url: String,
  option_b_image_url: String,
  option_c_image_url: String,
  option_d_image_url: String,
  explanation_image_url: String,
  tags: {
    exam_type: {
      type: String,
      required: true,
      validate: {
        validator: async function(value) {
          const tagSystem = await TagSystem.findOne();
          return tagSystem.exam_types.includes(value);
        },
        message: props => `${props.value} is not a valid exam type`
      }
    },
    subject: {
      type: String,
      required: true
    },
    chapter: String,
    topic: String,
    difficulty_level: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true
    },
    question_type: {
      type: String,
      enum: ['MCQ', 'MMCQ'],
      required: true
    },
    source: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
questionBankSchema.index({ 'tags.subject': 1, 'tags.chapter': 1 });
questionBankSchema.index({ 'tags.exam_type': 1, 'tags.difficulty_level': 1 });




module.exports = mongoose.model('QuestionBank', questionBankSchema);