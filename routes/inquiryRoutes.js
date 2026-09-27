const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const { ensureLandlordOrAgent } = require('../middleware/authMiddleware');

// Public Seeker Inquiry - NO LOGIN REQUIRED!
router.post('/properties/:id/inquiry', inquiryController.createInquiry);

// Landlord Inquiries Management
router.get('/landlord/inquiries', ensureLandlordOrAgent, inquiryController.getLandlordInquiries);
router.post('/landlord/inquiries/:id/status', ensureLandlordOrAgent, inquiryController.updateInquiryStatus);

module.exports = router;
