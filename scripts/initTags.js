const { TagSystem } = require('../db/db');

async function initializeTags() {
  try {
    // Check if tags already exist
    let tagSystem = await TagSystem.findOne();
    
    if (!tagSystem) {
      // Create default tag system
      tagSystem = new TagSystem({
        exam_types: ['JEE MAIN', 'JEE ADVANCED', 'NEET'],
        subjects: new Map([
          ['Physics', ['Mechanics', 'Thermodynamics', 'Optics']],
          ['Chemistry', ['Organic', 'Inorganic', 'Physical']],
          ['Mathematics', ['Algebra', 'Calculus', 'Geometry']]
        ]),
        chapters: new Map([
          ['Mechanics', ['Laws of Motion', 'Work Energy Power']],
          ['Organic', ['Alkanes', 'Alkenes', 'Aromatic']]
        ]),
        topics: new Map([
          ['Laws of Motion', ['Newton Laws', 'Friction', 'Circular Motion']],
          ['Alkanes', ['Nomenclature', 'Properties', 'Reactions']]
        ]),
        difficulty_levels: ['Easy', 'Medium', 'Hard'],
        question_types: ['MCQ', 'Numeric', 'MMCQ'],
        sources: ['PYQ', 'Practice', 'Mock Test']
      });

      await tagSystem.save();
      console.log('Tag system initialized successfully');
    } else {
      console.log('Tag system already exists');
    }
  } catch (error) {
    console.error('Error initializing tags:', error);
  }
}

// Run if called directly
if (require.main === module) {
  initializeTags()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = initializeTags;