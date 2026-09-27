const GeminiService = require('../services/geminiService');
const Property = require('../models/Property');
const Report = require('../models/Report');

exports.chat = async (req, res) => {
  const { message, history } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  try {
    const response = await GeminiService.chatAssistant(message, history || []);
    return res.json({
      success: true,
      response,
      powered_by: GeminiService.isConfigured() ? 'Gemini AI' : 'HomeFinder Assistant'
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({ success: false, message: 'AI Assistant temporarily unavailable' });
  }
};

exports.generateDescription = async (req, res) => {
  try {
    const description = await GeminiService.generateDescription(req.body);
    return res.json({
      success: true,
      description
    });
  } catch (error) {
    console.error('AI description generator error:', error);
    return res.status(500).json({ success: false, message: 'Could not generate description' });
  }
};

exports.estimatePrice = async (req, res) => {
  try {
    const estimate = await GeminiService.estimatePrice(req.body);
    return res.json({
      success: true,
      estimate
    });
  } catch (error) {
    console.error('AI price estimation error:', error);
    return res.status(500).json({ success: false, message: 'Could not estimate price' });
  }
};

exports.analyzeListingRisk = async (req, res) => {
  const propertyId = req.params.id;
  try {
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });

    const reports = await Report.findAll(null, 100);
    const count = reports.filter(r => r.property_id === Number(propertyId)).length;
    property.report_count = count;

    const analysis = await GeminiService.analyzeSuspiciousListing(property);
    return res.json({
      success: true,
      analysis,
      report_count: count
    });
  } catch (error) {
    console.error('AI listing risk analysis error:', error);
    return res.status(500).json({ success: false, message: 'Could not analyze listing' });
  }
};
