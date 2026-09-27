const Property = require('../models/Property');
const PropertyImage = require('../models/PropertyImage');
const Favorite = require('../models/Favorite');
const GoogleMapsService = require('../services/googleMapsService');
const GeminiService = require('../services/geminiService');

exports.renderHome = async (req, res) => {
  try {
    const featuredProperties = await Property.getFeaturedProperties(6);
    const recentProperties = await Property.findAll({
      verification_status: 'approved',
      limit: 6,
      sort: 'newest'
    });

    res.render('home', {
      title: 'HomeFinder | Find a Place You Can Call Home in Kenya',
      featuredProperties,
      recentProperties,
      googleMapsApiKey: GoogleMapsService.getApiKey(),
      user: req.session.user || null
    });
  } catch (error) {
    console.error('Error rendering homepage:', error);
    res.render('home', {
      title: 'HomeFinder | Kenyan Real Estate',
      featuredProperties: [],
      recentProperties: [],
      googleMapsApiKey: '',
      user: req.session.user || null
    });
  }
};

exports.searchProperties = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 9;
    const offset = (page - 1) * limit;

    const filters = {
      search: req.query.search || null,
      location: req.query.location || null,
      county: req.query.county || null,
      town: req.query.town || null,
      estate: req.query.estate || null,
      property_type: req.query.property_type || null,
      listing_type: req.query.listing_type || null,
      min_price: req.query.min_price || null,
      max_price: req.query.max_price || null,
      bedrooms: req.query.bedrooms || null,
      bathrooms: req.query.bathrooms || null,
      furnished: req.query.furnished !== undefined && req.query.furnished !== '' ? req.query.furnished : null,
      amenity: req.query.amenity || null,
      sort: req.query.sort || 'newest',
      verification_status: 'approved',
      limit,
      offset
    };

    const properties = await Property.findAll(filters);
    const totalCount = await Property.countAll(filters);
    const totalPages = Math.ceil(totalCount / limit) || 1;

    res.render('properties/index', {
      title: 'Browse Verified Houses & Properties for Rent & Sale in Kenya',
      properties,
      filters: req.query,
      currentPage: page,
      totalPages,
      totalCount,
      googleMapsApiKey: GoogleMapsService.getApiKey(),
      user: req.session.user || null
    });
  } catch (error) {
    console.error('Property search error:', error);
    res.status(500).render('partials/alerts', {
      title: 'Error',
      errorMessage: 'Failed to retrieve properties. Please try again.',
      backUrl: '/'
    });
  }
};

exports.getPropertyDetails = async (req, res) => {
  const propertyId = req.params.id;

  try {
    const property = await Property.findByIdWithDetails(propertyId);

    if (!property) {
      return res.status(404).render('partials/alerts', {
        title: 'Property Not Found',
        errorMessage: 'The property you are looking for does not exist or has been removed.',
        backUrl: '/properties'
      });
    }

    // Public seekers can only view approved listings (or landlord viewing their own)
    const isOwner = req.session.user && req.session.user.id === property.landlord_id;
    const isAdmin = req.session.user && req.session.user.role === 'admin';

    if (property.verification_status !== 'approved' && !isOwner && !isAdmin) {
      return res.status(403).render('partials/alerts', {
        title: 'Listing Under Review',
        errorMessage: 'This property listing is currently waiting for admin verification.',
        backUrl: '/properties'
      });
    }

    // Increment view count
    Property.incrementViews(propertyId).catch(console.error);

    // Nearby places
    const nearby = await GoogleMapsService.getNearbyPlaces(property.latitude, property.longitude);

    // Check favorite status for logged-in user
    let isFavorited = false;
    if (req.session.user) {
      isFavorited = await Favorite.isFavorited(req.session.user.id, propertyId);
    }

    res.render('properties/show', {
      title: `${property.title} | HomeFinder`,
      property,
      nearby,
      isFavorited,
      isOwner,
      isAdmin,
      googleMapsApiKey: GoogleMapsService.getApiKey(),
      user: req.session.user || null,
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null
    });
  } catch (error) {
    console.error('Error fetching property details:', error);
    res.status(500).render('partials/alerts', {
      title: 'Error',
      errorMessage: 'Could not load property details.',
      backUrl: '/properties'
    });
  }
};

exports.listLandlordProperties = async (req, res) => {
  try {
    const landlordId = req.session.user.id;
    const properties = await Property.findAll({
      landlord_id: landlordId,
      verification_status: null, // show all statuses: pending, approved, rejected
      limit: 100
    });

    res.render('landlord/properties', {
      title: 'My Properties | Landlord Portal',
      properties,
      user: req.session.user,
      statusMessage: req.query.status || null
    });
  } catch (error) {
    console.error('Error fetching landlord properties:', error);
    res.redirect('/landlord/dashboard');
  }
};

exports.renderAddProperty = (req, res) => {
  res.render('landlord/add-property', {
    title: 'Add New Property',
    user: req.session.user,
    property: null,
    googleMapsApiKey: GoogleMapsService.getApiKey()
  });
};

exports.createProperty = async (req, res) => {
  // CRITICAL SECURITY: Never trust landlord_id from browser
  const landlordId = req.session.user && req.session.user.id ? req.session.user.id : null;

  if (!landlordId) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ success: false, errors: ['You must be logged in to add a property.'] });
    }
    return res.redirect('/login');
  }

  const payload = {
    landlord_id: landlordId,
    title: req.body.title,
    description: req.body.description,
    property_type: req.body.property_type,
    listing_type: req.body.listing_type || 'rent',
    price: req.body.price,
    bedrooms: req.body.bedrooms,
    bathrooms: req.body.bathrooms,
    property_size: req.body.property_size,
    furnished: req.body.furnished,
    county: req.body.county,
    town: req.body.town,
    estate: req.body.area || req.body.estate,
    address: req.body.address,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    availability_status: req.body.availability_status || 'available',
    available_from: req.body.available_from,
    pet_friendly: req.body.pet_friendly,
    suitable_for: req.body.suitable_for,
    parking_spaces: req.body.parking_spaces,
    house_rules: req.body.house_rules,
    minimum_rental_period: req.body.minimum_rental_period,
    amenities: req.body.amenities || [],
    images: (req.files || []).map(f => `/uploads/properties/${f.filename}`)
  };

  const validationResult = Property.validate(payload);

  if (!validationResult.valid) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, errors: validationResult.errors });
    }
    return res.render('landlord/add-property', {
      title: 'Add New Property',
      user: req.session.user,
      errors: validationResult.errors,
      formData: req.body,
      googleMapsApiKey: GoogleMapsService.getApiKey()
    });
  }

  try {
    const newProperty = await Property.create(payload);

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(201).json({
        success: true,
        message: 'Your property has been submitted and is waiting for admin verification.',
        property: newProperty
      });
    }

    return res.redirect('/landlord/properties?status=submitted');
  } catch (error) {
    console.error('Create property error:', error);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, errors: ['Failed to save property. Please try again.'] });
    }
    return res.render('landlord/add-property', {
      title: 'Add New Property',
      user: req.session.user,
      errors: ['Database error while saving property. Please try again.'],
      formData: req.body,
      googleMapsApiKey: GoogleMapsService.getApiKey()
    });
  }
};

exports.renderEditProperty = async (req, res) => {
  const propertyId = req.params.id;
  const landlordId = req.session.user.id;

  try {
    const property = await Property.findByIdWithDetails(propertyId);
    if (!property || (property.landlord_id !== landlordId && req.session.user.role !== 'admin')) {
      return res.status(403).render('partials/alerts', {
        title: 'Access Denied',
        errorMessage: 'You do not have permission to edit this property.',
        backUrl: '/landlord/properties'
      });
    }

    res.render('landlord/edit-property', {
      title: `Edit ${property.title} | HomeFinder`,
      property,
      user: req.session.user,
      googleMapsApiKey: GoogleMapsService.getApiKey(),
      errors: null
    });
  } catch (error) {
    console.error('Error rendering edit property:', error);
    res.redirect('/landlord/properties');
  }
};

exports.updateProperty = async (req, res) => {
  const propertyId = req.params.id;
  const landlordId = req.session.user.id;

  try {
    const updateData = {
      title: req.body.title,
      description: req.body.description,
      property_type: req.body.property_type,
      listing_type: req.body.listing_type || 'rent',
      price: req.body.price,
      bedrooms: req.body.bedrooms,
      bathrooms: req.body.bathrooms,
      property_size: req.body.property_size,
      furnished: req.body.furnished,
      county: req.body.county,
      town: req.body.town,
      estate: req.body.estate || req.body.area,
      address: req.body.address,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      availability_status: req.body.availability_status || 'available',
      available_from: req.body.available_from,
      pet_friendly: req.body.pet_friendly,
      suitable_for: req.body.suitable_for,
      parking_spaces: req.body.parking_spaces,
      house_rules: req.body.house_rules,
      minimum_rental_period: req.body.minimum_rental_period,
      amenities: req.body.amenities || [],
      images: (req.files || []).map(f => `/uploads/properties/${f.filename}`)
    };

    await Property.update(propertyId, req.session.user.role === 'admin' ? null : landlordId, updateData);

    return res.redirect('/landlord/properties?status=updated');
  } catch (error) {
    console.error('Update property error:', error);
    return res.redirect(`/landlord/properties/edit/${propertyId}?error=Update failed`);
  }
};

exports.deleteProperty = async (req, res) => {
  const propertyId = req.params.id;
  const landlordId = req.session.user.id;

  try {
    await Property.delete(propertyId, req.session.user.role === 'admin' ? null : landlordId);
    return res.redirect('/landlord/properties?status=deleted');
  } catch (error) {
    console.error('Delete property error:', error);
    return res.redirect('/landlord/properties?status=delete_error');
  }
};

exports.renderPreview = (req, res) => {
  res.render('landlord/property-preview', {
    title: 'Property Preview | HomeFinder',
    user: req.session.user,
    property: {
      title: 'Executive 2 Bedroom Furnished Apartment',
      location: 'Westlands, Nairobi',
      price: 75000,
      bedrooms: 2,
      bathrooms: 2,
      amenities: ['Parking', 'Wi-Fi', 'Swimming Pool', 'Security'],
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
    }
  });
};
