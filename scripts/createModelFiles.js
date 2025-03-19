const fs = require('fs');
const path = require('path');

const models = [
    'User',
    'Batch',
    'Invitation',
    'Course',
    'Section',
    'Chapter',
    'Lesson',
    'BatchCourse',
    'Enrollment',
    'Transaction',
    'Quiz',
    'Question',
    'QuizAttempt',
    'ProgressTracking',
    'QuestionBank',
    'TagSystem'
];

const modelsDir = path.join(__dirname, '..', 'models');

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir);
}

// Create each model file
models.forEach(model => {
    const filePath = path.join(modelsDir, `${model}.js`);
    if (!fs.existsSync(filePath)) {
        const template = `const mongoose = require('mongoose');

const ${model.toLowerCase()}Schema = new mongoose.Schema({
    // Schema definition here
});

module.exports = mongoose.model('${model}', ${model.toLowerCase()}Schema);
`;
        fs.writeFileSync(filePath, template);
        console.log(`Created ${model}.js`);
    }
});