const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = path.join(__dirname, '..', '..', 'uploads');
    fs.ensureDirSync(uploadsPath);
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `audio-${uniqueSuffix}${extension}`);
  }
});

// File filter to accept only audio files
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'audio/mpeg',      // mp3
    'audio/mp3',       // mp3 (alternative MIME type)
    'audio/wav',       // wav
    'audio/x-wav',     // wav
    'audio/mp4',       // m4a
    'audio/x-m4a',     // m4a
    'audio/ogg',       // ogg
    'audio/webm',      // webm
    'audio/aac',       // aac
    'audio/flac',      // flac
    'video/mp4',       // mp4 (for video files)
    'video/webm',      // webm video
    'video/quicktime', // mov
    'video/x-msvideo', // avi
    'video/avi'        // avi (alternative)
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.log(`❌ Rejected file with MIME type: ${file.mimetype}`);
    console.log(`📋 Allowed MIME types:`, allowedMimes);
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: ${allowedMimes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload;