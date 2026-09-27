const express = require('express');
const multer = require('multer');
const path = require('path');
const propertyController = require('../controllers/propertyController');
const ensureAuthenticated = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '../public/uploads/properties');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error('Only JPG, JPEG, PNG, and WEBP images are allowed.'));
  },
});

router.get('/landlord/properties', ensureAuthenticated, propertyController.listProperties);
router.get('/landlord/properties/add', ensureAuthenticated, propertyController.renderAddProperty);
router.get('/landlord/properties/edit/:id', ensureAuthenticated, propertyController.renderEditProperty);
router.get('/landlord/properties/preview', ensureAuthenticated, propertyController.renderPreview);
router.post('/landlord/properties', ensureAuthenticated, upload.array('images', 10), propertyController.createProperty);

module.exports = router;
