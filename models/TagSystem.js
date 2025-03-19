import mongoose from 'mongoose';

// Tag System Schema
const tagSystemSchema = new mongoose.Schema({
    exam_types: [String],
    subjects: {
        type: Map,
        of: [String]
    },
    chapters: {
        type: Map,
        of: [String]
    },
    topics: {
        type: Map,
        of: [String]
    },
    difficulty_levels: {
        type: [String],
        default: ['Easy', 'Medium', 'Hard']
    },
    question_types: {
        type: [String],
        default: ['MCQ', 'Numeric', 'MMCQ']
    },
    sources: [String]
});

// Add methods to manipulate tags
tagSystemSchema.methods = {
    addExamType(examType) {
        if (!this.exam_types.includes(examType)) {
            this.exam_types.push(examType);
        }
        return this.save();
    },

    addSubject(subject, chapters = []) {
        if (!this.subjects.has(subject)) {
            this.subjects.set(subject, chapters);
        }
        return this.save();
    },

    addChaptersToSubject(subject, chapters) {
        if (this.subjects.has(subject)) {
            const existingChapters = this.subjects.get(subject);
            const newChapters = [...new Set([...existingChapters, ...chapters])];
            this.subjects.set(subject, newChapters);
        }
        return this.save();
    }
};

const TagSystem = mongoose.model('TagSystem', tagSystemSchema);

export default TagSystem;
