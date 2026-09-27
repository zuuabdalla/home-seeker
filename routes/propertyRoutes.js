const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const landlordController = require('../controllers/landlordController');
const { ensureLandlordOrAgent, ensureAuthenticated } = require('../middleware/authMiddleware');
const { uploadPropertyImages } = require('../middleware/uploadMiddleware');

// Public seeker routes (NO LOGIN REQUIRED)
router.get('/', propertyController.renderHome);
router.get('/properties', propertyController.searchProperties);
router.get('/properties/:id', propertyController.getPropertyDetails);

// Landlord portal routes (AUTHENTICATED LANDLORD/AGENT)
router.get('/landlord/dashboard', ensureLandlordOrAgent, landlordController.renderDashboard);
router.get('/landlord/properties', ensureLandlordOrAgent, propertyController.listLandlordProperties);
router.get('/landlord/properties/add', ensureLandlordOrAgent, propertyController.renderAddProperty);
router.post('/landlord/properties', ensureLandlordOrAgent, uploadPropertyImages.array('images', 10), propertyController.createProperty);
router.get('/landlord/properties/edit/:id', ensureLandlordOrAgent, propertyController.renderEditProperty);
router.post('/landlord/properties/edit/:id', ensureLandlordOrAgent, uploadPropertyImages.array('images', 10), propertyController.updateProperty);
router.post('/landlord/properties/delete/:id', ensureLandlordOrAgent, propertyController.deleteProperty);
router.get('/landlord/properties/preview', ensureLandlordOrAgent, propertyController.renderPreview);

// Notifications
router.get('/landlord/notifications', ensureLandlordOrAgent, landlordController.renderNotifications);
router.post('/landlord/notifications/:id/read', ensureLandlordOrAgent, landlordController.markNotificationRead);
router.post('/landlord/notifications/read-all', ensureLandlordOrAgent, landlordController.markAllNotificationsRead);

module.exports = router;
