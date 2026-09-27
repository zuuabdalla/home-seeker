const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { ensureLandlordOrAgent } = require('../middleware/authMiddleware');

// Landlord Promotions & Payments
router.get('/landlord/promotions', ensureLandlordOrAgent, paymentController.renderPromotions);
router.get('/landlord/payments', ensureLandlordOrAgent, paymentController.getLandlordPayments);
router.post('/payments/create', ensureLandlordOrAgent, paymentController.createPayment);

// PayHero Public Callback (Idempotent webhook)
router.post('/payments/callback', paymentController.payheroCallback);

module.exports = router;
