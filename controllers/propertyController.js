const Property = require('../models/Property');
const PropertyImage = require('../models/PropertyImage');

function getUser(req) {
  return req.session && req.session.user ? req.session.user : { id: 101, name: 'Akinyi Kamau' };
}

exports.renderAddProperty = (req, res) => {
  res.render('landlord/add-property', {
    title: 'Add New Property',
    user: getUser(req),
    property: null,
  });
};

exports.renderEditProperty = (req, res) => {
  res.render('landlord/edit-property', {
    title: 'Edit Property',
    user: getUser(req),
    property: {
      id: req.params.id || 1,
      title: 'Spacious 2 Bedroom Apartment',
      property_type: 'Apartment',
      description: 'Modern apartment with natural light and secure access.',
      price: 25000,
      bedrooms: 2,
      bathrooms: 2,
      property_size: 95,
      size_unit: 'sq_m',
      county: 'Nairobi',
      town: 'Westlands',
      area: 'Parklands',
      address: '22 Chiromo Road',
      latitude: -1.2724,
      longitude: 36.8155,
      availability_status: 'Available',
      available_from: '2026-10-05',
      furnished: 'Furnished',
      verification_status: 'PENDING',
    },
  });
};

exports.renderPreview = (req, res) => {
  res.render('landlord/property-preview', {
    title: 'Property Preview',
    user: getUser(req),
    property: {
      title: 'Spacious 2 Bedroom Apartment',
      location: 'Nairobi, Westlands',
      price: 25000,
      bedrooms: 2,
      bathrooms: 2,
      amenities: ['Parking', 'Wi-Fi', 'Security'],
      image: '/images/property-hero.jpg',
    },
  });
};

exports.listProperties = (req, res) => {
  res.send('Landlord properties list is ready for implementation.');
};

exports.createProperty = async (req, res) => {
  const landlordId = req.session.user && req.session.user.id ? req.session.user.id : null;

  if (!landlordId) {
    return res.status(401).json({
      success: false,
      errors: ['You must be logged in to add a property.'],
    });
  }

  const payload = {
    landlord_id: landlordId,
    title: req.body.title,
    description: req.body.description,
    price: req.body.price,
    property_type: req.body.property_type,
    bedrooms: req.body.bedrooms,
    bathrooms: req.body.bathrooms,
    property_size: req.body.property_size,
    size_unit: req.body.size_unit,
    furnished: req.body.furnished,
    county: req.body.county,
    town: req.body.town,
    area: req.body.area,
    address: req.body.address,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    availability_status: req.body.availability_status,
    available_from: req.body.available_from,
    additional_info: {
      pet_friendly: req.body.pet_friendly,
      suitable_for: req.body.suitable_for,
      parking_spaces: req.body.parking_spaces,
      house_rules: req.body.house_rules,
    },
    amenities: req.body.amenities || [],
    images: req.files || [],
    accuracy_confirmed: req.body.accuracy_confirmed === 'on' || req.body.accuracy_confirmed === 'true',
  };

  const validationResult = Property.validate(payload);

  if (!validationResult.valid) {
    return res.status(400).json({
      success: false,
      errors: validationResult.errors,
    });
  }

  const propertyRecord = Property.prepareForSave(payload);
  const imageRecords = PropertyImage.prepareForSave(propertyRecord.id, payload.images);

  try {
    await Property.save(propertyRecord);
    await PropertyImage.saveMany(imageRecords);

    if (req.xhr || req.headers.accept === 'application/json') {
      return res.status(201).json({
        success: true,
        message: 'Property submitted successfully for review.',
        property: propertyRecord,
        images: imageRecords,
      });
    }

    req.session.lastProperty = propertyRecord;
    return res.redirect('/landlord/properties?status=submitted');
  } catch (error) {
    return res.status(500).json({
      success: false,
      errors: ['Unable to save the property. Please try again.'],
    });
  }
};
