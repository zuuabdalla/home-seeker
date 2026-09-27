const Favorite = require('../models/Favorite');

exports.toggleFavorite = async (req, res) => {
  if (!req.session.user) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ success: false, message: 'Please login to save properties to your favorites.' });
    }
    return res.redirect('/login');
  }

  const propertyId = req.params.id;
  const userId = req.session.user.id;

  try {
    const isFavorited = await Favorite.isFavorited(userId, propertyId);
    let favorited = false;

    if (isFavorited) {
      await Favorite.remove(userId, propertyId);
      favorited = false;
    } else {
      await Favorite.add(userId, propertyId);
      favorited = true;
    }

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        favorited,
        message: favorited ? 'Property added to favorites' : 'Property removed from favorites'
      });
    }

    return res.redirect(`/properties/${propertyId}`);
  } catch (error) {
    console.error('Error toggling favorite:', error);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Could not update favorites' });
    }
    return res.redirect(`/properties/${propertyId}`);
  }
};

exports.getUserFavorites = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const favorites = await Favorite.getUserFavorites(req.session.user.id);
    res.render('properties/favorites', {
      title: 'My Saved Properties | HomeFinder',
      favorites,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.redirect('/');
  }
};
