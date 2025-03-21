// Basic TagController template
const createTag = async (req, res) => {
    try {
        // Your tag creation logic here
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Ensure you have a proper export statement
export default {
   createTag
};