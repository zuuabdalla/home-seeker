const multer = require('multer');
const path = require('path');
const fs = require('fs');

const propertiesDir = path.join(__dirname, '../public/uploads/properties');
const profilesDir = path.join(__dirname, '../public/uploads/profiles');

[propertiesDir, profilesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storageProperties = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, propertiesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${safeBase}-${uniqueSuffix}${ext}`);
  },
});

const storageProfiles = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error('Only JPG, JPEG, PNG, and WEBP images are allowed.'), false);
};

const uploadPropertyImages = multer({
  storage: storageProperties,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10,
  },
  fileFilter,
});

const uploadProfileAvatar = multer({
  storage: storageProfiles,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
    files: 1,
  },
  fileFilter,
});

module.exports = {
  uploadPropertyImages,
  uploadProfileAvatar
};
