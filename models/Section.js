import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String 
    },
    order: { 
        type: Number, 
        required: true 
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    }
});

const Section = mongoose.model('Section', sectionSchema);

export default Section;
