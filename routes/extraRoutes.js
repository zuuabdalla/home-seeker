const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const reportController = require('../controllers/reportController');
const Review = require('../models/Review');
const ContactMessage = require('../models/ContactMessage');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// Favorites
router.post('/properties/:id/favorite', favoriteController.toggleFavorite);
router.get('/favorites', ensureAuthenticated, favoriteController.getUserFavorites);

// Reports
router.post('/properties/:id/report', reportController.createReport);

// Reviews (Authenticated users can leave reviews)
router.post('/properties/:id/review', ensureAuthenticated, async (req, res) => {
  const propertyId = req.params.id;
  const { rating, review } = req.body;
  try {
    await Review.create({
      property_id: propertyId,
      user_id: req.session.user.id,
      rating,
      review
    });
    return res.redirect(`/properties/${propertyId}?success=Review submitted for moderation.`);
  } catch (error) {
    console.error('Review submission error:', error);
    return res.redirect(`/properties/${propertyId}?error=Failed to submit review.`);
  }
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us | HomeFinder Kenya',
    user: req.session.user || null,
    status: req.query.status || null
  });
});

router.post('/contact', async (req, res) => {
  try {
    await ContactMessage.create(req.body);
    res.redirect('/contact?status=sent');
  } catch (error) {
    console.error('Contact message error:', error);
    res.redirect('/contact?status=error');
  }
});

// About page
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About HomeFinder Kenya',
    user: req.session.user || null
  });
});

// Services page
router.get('/services', (req, res) => {
  res.render('services', {
    title: 'Our Real Estate Services | HomeFinder Kenya',
    user: req.session.user || null
  });
});

module.exports = router;
