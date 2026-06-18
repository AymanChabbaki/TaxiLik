const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

// Local disk storage for driver legal documents / avatars. UPLOAD_DIR is a
// mounted volume in production (works on a VPS and across container restarts);
// swap for S3/MinIO later by changing only this module's storage engine.
const UPLOAD_DIR = env.uploadDir;
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Map validated MIME types to safe extensions — never trust the client filename.
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] || '.bin';
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const ALLOWED = Object.keys(MIME_TO_EXT);

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest('Only JPEG, PNG, WEBP or PDF files are allowed'));
  },
});

module.exports = { upload, UPLOAD_DIR };
