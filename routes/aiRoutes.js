const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/api/ai/chat', aiController.chat);
router.post('/api/ai/generate-description', aiController.generateDescription);
router.post('/api/ai/estimate-price', aiController.estimatePrice);
router.get('/api/ai/analyze-risk/:id', aiController.analyzeListingRisk);

module.exports = router;
