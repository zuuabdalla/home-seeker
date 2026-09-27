const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/adminMiddleware');

// Admin Login
router.get('/admin/login', adminController.renderLogin);
router.post('/admin/login', adminController.login);

// Protected Admin Dashboard
router.get('/admin/dashboard', adminAuth, adminController.renderDashboard);

// Manage Properties
router.get('/admin/properties', adminAuth, adminController.listProperties);
router.get('/admin/properties/pending', adminAuth, adminController.listPendingProperties);
router.post('/admin/properties/:id/approve', adminAuth, adminController.approveProperty);
router.post('/admin/properties/:id/reject', adminAuth, adminController.rejectProperty);

// Manage Users (Landlords, Agents, Admins)
router.get('/admin/users', adminAuth, adminController.listUsers);
router.post('/admin/users/:id/toggle-status', adminAuth, adminController.toggleUserStatus);

// Payments & Promotions
router.get('/admin/payments', adminAuth, adminController.listPayments);

// Reports & Fraud Moderation
router.get('/admin/reports', adminAuth, adminController.listReports);
router.post('/admin/reports/:id/action', adminAuth, adminController.updateReport);

// Inquiries & Bookings
router.get('/admin/inquiries', adminAuth, adminController.listInquiries);
router.get('/admin/bookings', adminAuth, adminController.listBookings);

// Reviews Moderation
router.get('/admin/reviews', adminAuth, adminController.listReviews);
router.post('/admin/reviews/:id/status', adminAuth, adminController.updateReviewStatus);

module.exports = router;
