const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { ensureLandlordOrAgent } = require('../middleware/authMiddleware');

// Public Seeker Viewing Request - NO LOGIN REQUIRED!
router.post('/properties/:id/book-viewing', bookingController.createBooking);

// Landlord Viewing Bookings Management
router.get('/landlord/bookings', ensureLandlordOrAgent, bookingController.getLandlordBookings);
router.post('/landlord/bookings/:id/status', ensureLandlordOrAgent, bookingController.updateBookingStatus);

module.exports = router;
