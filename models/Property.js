const Property = {
  validate(payload) {
    const errors = [];

    if (!payload.title || !String(payload.title).trim()) {
      errors.push('Please enter the property title.');
    }

    if (!payload.property_type || !String(payload.property_type).trim()) {
      errors.push('Please select the property type.');
    }

    if (!payload.description || !String(payload.description).trim()) {
      errors.push('Please enter the property description.');
    }

    if (!payload.price || Number(payload.price) <= 0) {
      errors.push('Please enter the monthly rent.');
    }

    if (!payload.bedrooms || Number(payload.bedrooms) < 0) {
      errors.push('Please specify the number of bedrooms.');
    }

    if (!payload.bathrooms || Number(payload.bathrooms) < 0) {
      errors.push('Please specify the number of bathrooms.');
    }

    if (!payload.county || !String(payload.county).trim()) {
      errors.push('Please select the county.');
    }

    if (!payload.town || !String(payload.town).trim()) {
      errors.push('Please enter the town or area.');
    }

    if (!payload.address || !String(payload.address).trim()) {
      errors.push('Please enter the street address.');
    }

    if (!payload.latitude || !payload.longitude) {
      errors.push('Please select an exact property location on the map.');
    }

    if (!payload.availability_status || !String(payload.availability_status).trim()) {
      errors.push('Please select the availability status.');
    }

    if (!payload.accuracy_confirmed) {
      errors.push('Please confirm that the information is accurate.');
    }

    if (!payload.images || payload.images.length === 0) {
      errors.push('Please upload at least one property image.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  prepareForSave(payload) {
    return {
      id: Date.now(),
      landlord_id: payload.landlord_id,
      title: String(payload.title).trim(),
      description: String(payload.description).trim(),
      price: Number(payload.price),
      property_type: String(payload.property_type).trim(),
      bedrooms: Number(payload.bedrooms),
      bathrooms: Number(payload.bathrooms),
      property_size: payload.property_size ? Number(payload.property_size) : null,
      size_unit: payload.size_unit || 'sq_m',
      furnished: payload.furnished || 'Unfurnished',
      county: String(payload.county).trim(),
      town: String(payload.town).trim(),
      area: String(payload.area || payload.town).trim(),
      address: String(payload.address).trim(),
      location: String(payload.address).trim(),
      latitude: Number(payload.latitude),
      longitude: Number(payload.longitude),
      availability_status: String(payload.availability_status).trim(),
      available_from: payload.available_from || null,
      verification_status: 'PENDING',
      created_at: new Date(),
      updated_at: new Date(),
      additional_info: payload.additional_info || {},
      amenities: Array.isArray(payload.amenities) ? payload.amenities : [],
    };
  },

  async save(property) {
    return Promise.resolve({ property, query: 'INSERT INTO properties ...' });
  },
};

module.exports = Property;
