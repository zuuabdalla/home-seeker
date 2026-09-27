const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const { uploadProfileAvatar } = require('../middleware/uploadMiddleware');

router.get('/login', authController.renderLogin);
router.post('/login', authController.login);

router.get('/register', authController.renderRegister);
router.post('/register', authController.register);

router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

router.get('/forgot-password', authController.renderForgotPassword);
router.post('/forgot-password', authController.forgotPassword);

router.get('/profile', ensureAuthenticated, authController.renderProfile);
router.post('/profile', ensureAuthenticated, uploadProfileAvatar.single('profile_image'), authController.updateProfile);

module.exports = router;
