import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, required: true },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true
    }
});

const Chapter = mongoose.model('Chapter', chapterSchema);

export default Chapter;
