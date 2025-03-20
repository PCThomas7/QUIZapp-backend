import { TagSystem } from '../db/db.js';

async function initializeTags() {
  try {
    // Check if tags already exist
    let tagSystem = await TagSystem.findOne();
    
    if (!tagSystem) {
      // Create default tag system with empty maps
      tagSystem = new TagSystem({
        exam_types: [],
        difficulty_levels: ['Easy', 'Medium', 'Hard'],
        question_types: ['MCQ', 'Numeric', 'MMCQ'],
        sources: ['PYQ', 'Practice', 'Mock Tests']
      });

      // Define the hierarchical structure
      const hierarchyData = [
        {
          examType: 'JEE MAIN',
          subjects: [
            {
              name: 'Physics',
              chapters: [
                {
                  name: 'Mechanics',
                  topics: ['Kinematics', 'Laws of Motion', 'Work, Energy & Power']
                },
                {
                  name: 'Thermodynamics',
                  topics: ['Heat Transfer', 'Laws of Thermodynamics', 'Thermal Properties']
                },
                {
                  name: 'Optics',
                  topics: ['Ray Optics', 'Wave Optics', 'Optical Instruments']
                }
              ]
            },
            {
              name: 'Chemistry',
              chapters: [
                {
                  name: 'Organic',
                  topics: ['Alkanes', 'Alkenes', 'Alcohols']
                },
                {
                  name: 'Inorganic',
                  topics: ['Periodic Table', 'Chemical Bonding', 'Coordination Compounds']
                },
                {
                  name: 'Physical',
                  topics: ['Thermodynamics', 'Electrochemistry', 'Chemical Kinetics']
                }
              ]
            },
            {
              name: 'Mathematics',
              chapters: [
                {
                  name: 'Algebra',
                  topics: ['Complex Numbers', 'Matrices', 'Determinants']
                },
                {
                  name: 'Calculus',
                  topics: ['Limits', 'Differentiation', 'Integration']
                },
                {
                  name: 'Geometry',
                  topics: ['Coordinate Geometry', 'Vectors', '3D Geometry']
                }
              ]
            }
          ]
        },
        {
          examType: 'JEE ADVANCED',
          subjects: [
            {
              name: 'Physics',
              chapters: [
                {
                  name: 'Mechanics',
                  topics: ['Rotational Dynamics', 'Gravitation', 'Fluid Mechanics']
                },
                {
                  name: 'Electromagnetism',
                  topics: ['Electric Fields', 'Magnetic Fields', 'Electromagnetic Induction']
                }
              ]
            },
            {
              name: 'Chemistry',
              chapters: [
                {
                  name: 'Organic',
                  topics: ['Reaction Mechanisms', 'Stereochemistry', 'Aromatic Compounds']
                },
                {
                  name: 'Inorganic',
                  topics: ['Transition Elements', 'Qualitative Analysis', 'Metallurgy']
                }
              ]
            },
            {
              name: 'Mathematics',
              chapters: [
                {
                  name: 'Algebra',
                  topics: ['Permutations & Combinations', 'Probability', 'Binomial Theorem']
                },
                {
                  name: 'Calculus',
                  topics: ['Differential Equations', 'Application of Derivatives', 'Definite Integrals']
                }
              ]
            }
          ]
        },
        {
          examType: 'NEET',
          subjects: [
            {
              name: 'Physics',
              chapters: [
                {
                  name: 'Mechanics',
                  topics: ['Motion in One Dimension', 'Motion in Two Dimensions', 'Laws of Motion']
                },
                {
                  name: 'Modern Physics',
                  topics: ['Photoelectric Effect', 'Atomic Structure', 'Nuclear Physics']
                }
              ]
            },
            {
              name: 'Chemistry',
              chapters: [
                {
                  name: 'Organic',
                  topics: ['Biomolecules', 'Polymers', 'Chemistry in Everyday Life']
                },
                {
                  name: 'Inorganic',
                  topics: ['s-Block Elements', 'p-Block Elements', 'd-Block Elements']
                }
              ]
            },
            {
              name: 'Biology',
              chapters: [
                {
                  name: 'Botany',
                  topics: ['Plant Physiology', 'Cell Biology', 'Genetics']
                },
                {
                  name: 'Zoology',
                  topics: ['Human Physiology', 'Evolution', 'Ecology']
                }
              ]
            }
          ]
        }
      ];

      // Use the enhanced model's methods to build the hierarchy
      for (const exam of hierarchyData) {
        tagSystem.addExamType(exam.examType);
        
        for (const subject of exam.subjects) {
          tagSystem.addSubject(exam.examType, subject.name);
          
          for (const chapter of subject.chapters) {
            tagSystem.addChapter(subject.name, chapter.name);
            
            for (const topic of chapter.topics) {
              tagSystem.addTopic(chapter.name, topic);
            }
          }
        }
      }

      await tagSystem.save();
      console.log('Tag system initialized successfully with hierarchical structure');
    } else {
      console.log('Tag system already exists');
    }
  } catch (error) {
    console.error('Error initializing tags:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeTags()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export default initializeTags;