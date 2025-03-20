import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
        const template = `import mongoose from 'mongoose';

const ${model.toLowerCase()}Schema = new mongoose.Schema({
    // Schema definition here
});

const ${model} = mongoose.model('${model}', ${model.toLowerCase()}Schema);

export default ${model};
`;
        fs.writeFileSync(filePath, template);
        console.log(`Created ${model}.js`);
    }
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Model files created successfully');
}