import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// File upload configuration for course thumbnails, PDFs, and community attachments
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = path.join(__dirname, '..', 'uploads/');
        
        if (file.fieldname === 'thumbnail') {
            uploadPath = path.join(uploadPath, 'thumbnails/');
        } else if (file.fieldname === 'pdfContent') {
            uploadPath = path.join(uploadPath, 'pdfs/');
        } else if (file.fieldname === 'attachments') {
            uploadPath = path.join(uploadPath, 'community/');
        }
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
        // Accept only images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for thumbnails'), false);
        }
    } else if (file.fieldname === 'pdfContent') {
        // Accept only PDFs
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed for lesson content'), false);
        }
    } else if (file.fieldname === 'attachments') {
        // Accept images, PDFs, and common document formats for community attachments
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/gif', 
            'application/pdf',
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed for community attachments'), false);
        }
    } else {
        cb(null, true);
    }
};

// Helper function to get file URL from saved file
const getFileUrl = (file) => {
    if (!file) return null;
    return `/uploads/${file.fieldname === 'thumbnail' ? 'thumbnails' : 
            file.fieldname === 'pdfContent' ? 'pdfs' : 
            file.fieldname === 'attachments' ? 'community' : ''}/${file.filename}`;
};

const upload = multer({ 
    storage, 
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

export { upload, storage, getFileUrl };