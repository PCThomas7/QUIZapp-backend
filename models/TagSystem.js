import mongoose from 'mongoose';

// Tag System Schema
const tagSystemSchema = new mongoose.Schema({
    exam_types: {
        type: [String],
        default: []
    },
    subjects: {
        type: Map,
        of: [String],
        default: () => new Map(),
        validate: {
            validator: function(v) {
                return v instanceof Map;
            },
            message: 'subjects must be a Map'
        }
    },
    chapters: {
        type: Map,
        of: [String],
        default: () => new Map(),
        validate: {
            validator: function(v) {
                return v instanceof Map;
            },
            message: 'chapters must be a Map'
        }
    },
    topics: {
        type: Map,
        of: [String],
        default: () => new Map(),
        validate: {
            validator: function(v) {
                return v instanceof Map;
            },
            message: 'topics must be a Map'
        }
    },
    difficulty_levels: {
        type: [String],
        default: ['Easy', 'Medium', 'Hard']
    },
    question_types: {
        type: [String],
        default: ['MCQ', 'Numeric', 'MMCQ']
    },
    sources: {
        type: [String],
        default: []
    }
}, {
    toJSON: {
        transform: function(doc, ret) {
            // Convert Maps to plain objects for JSON serialization
            ret.subjects = Object.fromEntries(ret.subjects || new Map());
            ret.chapters = Object.fromEntries(ret.chapters || new Map());
            ret.topics = Object.fromEntries(ret.topics || new Map());
            return ret;
        }
    }
});

// Add validation for Map values
tagSystemSchema.path('subjects').validate(function(value) {
    if (!(value instanceof Map)) return false;
    for (const [key, arr] of value.entries()) {
        if (!Array.isArray(arr)) return false;
        if (!arr.every(item => typeof item === 'string')) return false;
    }
    return true;
}, 'Invalid subjects format');

tagSystemSchema.path('chapters').validate(function(value) {
    if (!(value instanceof Map)) return false;
    for (const [key, arr] of value.entries()) {
        if (!Array.isArray(arr)) return false;
        if (!arr.every(item => typeof item === 'string')) return false;
    }
    return true;
}, 'Invalid chapters format');

tagSystemSchema.path('topics').validate(function(value) {
    if (!(value instanceof Map)) return false;
    for (const [key, arr] of value.entries()) {
        if (!Array.isArray(arr)) return false;
        if (!arr.every(item => typeof item === 'string')) return false;
    }
    return true;
}, 'Invalid topics format');

// Enhanced methods for hierarchical tag management
tagSystemSchema.methods = {
    // Add exam type
    addExamType(examType) {
        if (!this.exam_types.includes(examType)) {
            this.exam_types.push(examType);
        }
        return this;
    },

    // Add subject to an exam type
    addSubject(examType, subject) {
        if (!this.exam_types.includes(examType)) {
            this.exam_types.push(examType);
        }
        
        if (!this.subjects.has(examType)) {
            this.subjects.set(examType, []);
        }
        
        const subjects = this.subjects.get(examType);
        if (!subjects.includes(subject)) {
            subjects.push(subject);
        }
        
        return this;
    },

    // Add chapter to a subject
    addChapter(subject, chapter) {
        if (!this.chapters.has(subject)) {
            this.chapters.set(subject, []);
        }
        
        const chapters = this.chapters.get(subject);
        if (!chapters.includes(chapter)) {
            chapters.push(chapter);
        }
        
        return this;
    },

    // Add topic to a chapter
    addTopic(chapter, topic) {
        if (!this.topics.has(chapter)) {
            this.topics.set(chapter, []);
        }
        
        const topics = this.topics.get(chapter);
        if (!topics.includes(topic)) {
            topics.push(topic);
        }
        
        return this;
    },

    // Add a complete tag hierarchy at once
    addTagHierarchy(examType, subject, chapter, topic) {
        this.addExamType(examType);
        this.addSubject(examType, subject);
        
        if (chapter) {
            this.addChapter(subject, chapter);
            
            if (topic) {
                this.addTopic(chapter, topic);
            }
        }
        
        return this.save();
    },

    // Get subjects for an exam type
    getSubjectsForExamType(examType) {
        return this.subjects.get(examType) || [];
    },

    // Get chapters for a subject
    getChaptersForSubject(subject) {
        return this.chapters.get(subject) || [];
    },

    // Get topics for a chapter
    getTopicsForChapter(chapter) {
        return this.topics.get(chapter) || [];
    },

    // Get the complete hierarchy
    getHierarchy() {
        const hierarchy = {};
        
        for (const examType of this.exam_types) {
            hierarchy[examType] = {};
            const subjects = this.getSubjectsForExamType(examType);
            
            for (const subject of subjects) {
                hierarchy[examType][subject] = {};
                const chapters = this.getChaptersForSubject(subject);
                
                for (const chapter of chapters) {
                    const topics = this.getTopicsForChapter(chapter);
                    hierarchy[examType][subject][chapter] = topics;
                }
            }
        }
        
        return hierarchy;
    }
};

const TagSystem = mongoose.model('TagSystem', tagSystemSchema);

export default TagSystem;
