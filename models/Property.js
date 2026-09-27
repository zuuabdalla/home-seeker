const db = require('../config/db');

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
      errors.push('Please enter the valid price/rent amount.');
    }

    if (payload.bedrooms === undefined || payload.bedrooms === null || Number(payload.bedrooms) < 0) {
      errors.push('Please specify the number of bedrooms.');
    }

    if (payload.bathrooms === undefined || payload.bathrooms === null || Number(payload.bathrooms) < 0) {
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

    if (!payload.availability_status || !String(payload.availability_status).trim()) {
      errors.push('Please select the availability status.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  async create(data) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const normalizedType = String(data.property_type || 'apartment').toLowerCase();
      const normalizedListing = String(data.listing_type || 'rent').toLowerCase();
      const normalizedAvail = String(data.availability_status || 'available').toLowerCase().replace(/\s+/g, '_');

      const [propResult] = await conn.query(
        `INSERT INTO properties (
          landlord_id, title, description, property_type, listing_type, price,
          bedrooms, bathrooms, property_size, furnished, county, town, estate,
          address, latitude, longitude, availability_status, available_from,
          verification_status, views
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
        [
          data.landlord_id,
          data.title.trim(),
          data.description.trim(),
          normalizedType,
          normalizedListing,
          Number(data.price),
          Number(data.bedrooms || 0),
          Number(data.bathrooms || 0),
          data.property_size ? Number(data.property_size) : null,
          data.furnished === '1' || data.furnished === 1 || data.furnished === 'Furnished' || data.furnished === true ? 1 : 0,
          data.county.trim(),
          data.town.trim(),
          data.estate ? data.estate.trim() : null,
          data.address.trim(),
          data.latitude ? Number(data.latitude) : -1.2858,
          data.longitude ? Number(data.longitude) : 36.8162,
          normalizedAvail,
          data.available_from || null
        ]
      );

      const propertyId = propResult.insertId;

      // Amenities
      const amenitiesList = Array.isArray(data.amenities)
        ? data.amenities.map(a => String(a).toLowerCase().trim())
        : (data.amenities ? [String(data.amenities).toLowerCase().trim()] : []);

      const hasAmenity = (name) => amenitiesList.some(a => a.includes(name)) ? 1 : 0;

      await conn.query(
        `INSERT INTO property_amenities (
          property_id, parking, wifi, water, electricity, security, cctv,
          borehole, balcony, garden, swimming_pool, gym, lift, laundry,
          generator, gated_community, playground
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          propertyId,
          hasAmenity('parking'),
          hasAmenity('wi-fi') || hasAmenity('wifi'),
          hasAmenity('water'),
          hasAmenity('electricity') || 1,
          hasAmenity('security'),
          hasAmenity('cctv'),
          hasAmenity('borehole'),
          hasAmenity('balcony'),
          hasAmenity('garden'),
          hasAmenity('swimming') || hasAmenity('pool'),
          hasAmenity('gym'),
          hasAmenity('lift') || hasAmenity('elevator'),
          hasAmenity('laundry'),
          hasAmenity('generator'),
          hasAmenity('gated'),
          hasAmenity('playground') || hasAmenity('children')
        ]
      );

      // Property Details
      await conn.query(
        `INSERT INTO property_details (
          property_id, pets_allowed, suitable_for_families, suitable_for_students,
          suitable_for_professionals, parking_spaces, minimum_rental_period, house_rules
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          propertyId,
          data.pet_friendly === 'Yes' || data.pets_allowed === '1' || data.pets_allowed === 1 ? 1 : 0,
          data.suitable_for === 'Families' || data.suitable_for === 'Everyone' || data.suitable_for_families ? 1 : 0,
          data.suitable_for === 'Students' || data.suitable_for === 'Everyone' || data.suitable_for_students ? 1 : 0,
          data.suitable_for === 'Professionals' || data.suitable_for === 'Everyone' || data.suitable_for_professionals ? 1 : 0,
          data.parking_spaces ? Number(data.parking_spaces) : 1,
          data.minimum_rental_period ? parseInt(data.minimum_rental_period, 10) || 1 : 1,
          data.house_rules ? data.house_rules.trim() : null
        ]
      );

      // Images
      if (data.images && data.images.length > 0) {
        const imageValues = data.images.map((img, idx) => [
          propertyId,
          typeof img === 'string' ? img : img.image_url,
          idx === 0 ? 1 : 0
        ]);
        await conn.query(
          'INSERT INTO property_images (property_id, image_url, is_primary) VALUES ?',
          [imageValues]
        );
      } else {
        // Fallback default image if none provided
        await conn.query(
          'INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?, ?, 1)',
          [propertyId, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80']
        );
      }

      await conn.commit();
      return this.findByIdWithDetails(propertyId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async update(id, landlordId, data) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      let checkQuery = 'SELECT id FROM properties WHERE id = ?';
      const checkParams = [id];
      if (landlordId) {
        checkQuery += ' AND landlord_id = ?';
        checkParams.push(landlordId);
      }

      const [existing] = await conn.query(checkQuery, checkParams);
      if (!existing.length) {
        throw new Error('Property not found or unauthorized.');
      }

      const normalizedType = String(data.property_type || 'apartment').toLowerCase();
      const normalizedListing = String(data.listing_type || 'rent').toLowerCase();
      const normalizedAvail = String(data.availability_status || 'available').toLowerCase().replace(/\s+/g, '_');

      await conn.query(
        `UPDATE properties SET
          title = ?, description = ?, property_type = ?, listing_type = ?, price = ?,
          bedrooms = ?, bathrooms = ?, property_size = ?, furnished = ?, county = ?,
          town = ?, estate = ?, address = ?, latitude = ?, longitude = ?,
          availability_status = ?, available_from = ?
        WHERE id = ?`,
        [
          data.title.trim(),
          data.description.trim(),
          normalizedType,
          normalizedListing,
          Number(data.price),
          Number(data.bedrooms || 0),
          Number(data.bathrooms || 0),
          data.property_size ? Number(data.property_size) : null,
          data.furnished === '1' || data.furnished === 1 || data.furnished === 'Furnished' || data.furnished === true ? 1 : 0,
          data.county.trim(),
          data.town.trim(),
          data.estate ? data.estate.trim() : null,
          data.address.trim(),
          data.latitude ? Number(data.latitude) : -1.2858,
          data.longitude ? Number(data.longitude) : 36.8162,
          normalizedAvail,
          data.available_from || null,
          id
        ]
      );

      // Amenities update if provided
      if (data.amenities !== undefined) {
        const amenitiesList = Array.isArray(data.amenities)
          ? data.amenities.map(a => String(a).toLowerCase().trim())
          : (data.amenities ? [String(data.amenities).toLowerCase().trim()] : []);
        const hasAmenity = (name) => amenitiesList.some(a => a.includes(name)) ? 1 : 0;

        await conn.query(
          `INSERT INTO property_amenities (
            property_id, parking, wifi, water, electricity, security, cctv,
            borehole, balcony, garden, swimming_pool, gym, lift, laundry,
            generator, gated_community, playground
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            parking = VALUES(parking), wifi = VALUES(wifi), water = VALUES(water),
            electricity = VALUES(electricity), security = VALUES(security), cctv = VALUES(cctv),
            borehole = VALUES(borehole), balcony = VALUES(balcony), garden = VALUES(garden),
            swimming_pool = VALUES(swimming_pool), gym = VALUES(gym), lift = VALUES(lift),
            laundry = VALUES(laundry), generator = VALUES(generator),
            gated_community = VALUES(gated_community), playground = VALUES(playground)`,
          [
            id,
            hasAmenity('parking'),
            hasAmenity('wi-fi') || hasAmenity('wifi'),
            hasAmenity('water'),
            hasAmenity('electricity') || 1,
            hasAmenity('security'),
            hasAmenity('cctv'),
            hasAmenity('borehole'),
            hasAmenity('balcony'),
            hasAmenity('garden'),
            hasAmenity('swimming') || hasAmenity('pool'),
            hasAmenity('gym'),
            hasAmenity('lift') || hasAmenity('elevator'),
            hasAmenity('laundry'),
            hasAmenity('generator'),
            hasAmenity('gated'),
            hasAmenity('playground') || hasAmenity('children')
          ]
        );
      }

      // Details update
      await conn.query(
        `INSERT INTO property_details (
          property_id, pets_allowed, suitable_for_families, suitable_for_students,
          suitable_for_professionals, parking_spaces, minimum_rental_period, house_rules
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          pets_allowed = VALUES(pets_allowed),
          suitable_for_families = VALUES(suitable_for_families),
          suitable_for_students = VALUES(suitable_for_students),
          suitable_for_professionals = VALUES(suitable_for_professionals),
          parking_spaces = VALUES(parking_spaces),
          minimum_rental_period = VALUES(minimum_rental_period),
          house_rules = VALUES(house_rules)`,
        [
          id,
          data.pet_friendly === 'Yes' || data.pets_allowed === '1' || data.pets_allowed === 1 ? 1 : 0,
          data.suitable_for === 'Families' || data.suitable_for === 'Everyone' || data.suitable_for_families ? 1 : 0,
          data.suitable_for === 'Students' || data.suitable_for === 'Everyone' || data.suitable_for_students ? 1 : 0,
          data.suitable_for === 'Professionals' || data.suitable_for === 'Everyone' || data.suitable_for_professionals ? 1 : 0,
          data.parking_spaces ? Number(data.parking_spaces) : 1,
          data.minimum_rental_period ? parseInt(data.minimum_rental_period, 10) || 1 : 1,
          data.house_rules ? data.house_rules.trim() : null
        ]
      );

      // Add new images if uploaded
      if (data.images && data.images.length > 0) {
        const imageValues = data.images.map((img) => [
          id,
          typeof img === 'string' ? img : img.image_url,
          0
        ]);
        await conn.query(
          'INSERT INTO property_images (property_id, image_url, is_primary) VALUES ?',
          [imageValues]
        );
      }

      await conn.commit();
      return this.findByIdWithDetails(id);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async delete(id, landlordId = null) {
    let query = 'DELETE FROM properties WHERE id = ?';
    const params = [id];
    if (landlordId) {
      query += ' AND landlord_id = ?';
      params.push(landlordId);
    }
    const [result] = await db.query(query, params);
    return result.affectedRows > 0;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM properties WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findByIdWithDetails(id) {
    const [propRows] = await db.query(
      `SELECT p.*, 
              u.full_name as landlord_name, u.email as landlord_email, u.phone as landlord_phone, 
              u.profile_image as landlord_avatar, u.role as landlord_role, u.is_verified as landlord_verified
       FROM properties p
       JOIN users u ON p.landlord_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (!propRows.length) return null;
    const property = propRows[0];

    // Images
    const [images] = await db.query(
      'SELECT id, image_url, is_primary FROM property_images WHERE property_id = ? ORDER BY is_primary DESC, id ASC',
      [id]
    );
    property.images = images;
    property.primary_image = images.length > 0
      ? (images.find(img => img.is_primary) || images[0]).image_url
      : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';

    // Amenities
    const [amenitiesRows] = await db.query('SELECT * FROM property_amenities WHERE property_id = ?', [id]);
    property.amenities = amenitiesRows[0] || {};

    // Details
    const [detailRows] = await db.query('SELECT * FROM property_details WHERE property_id = ?', [id]);
    property.details = detailRows[0] || {};

    // Reviews
    const [reviews] = await db.query(
      `SELECT r.*, u.full_name as reviewer_name, u.profile_image as reviewer_avatar
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.property_id = ? AND r.status = 'approved'
       ORDER BY r.created_at DESC`,
      [id]
    );
    property.reviews = reviews;
    property.avg_rating = reviews.length > 0
      ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
      : null;

    return property;
  },

  async findAll({
    search = null,
    location = null,
    county = null,
    town = null,
    estate = null,
    property_type = null,
    listing_type = null,
    min_price = null,
    max_price = null,
    bedrooms = null,
    bathrooms = null,
    furnished = null,
    amenity = null,
    verification_status = 'approved',
    is_featured = null,
    landlord_id = null,
    sort = 'newest',
    limit = 20,
    offset = 0
  } = {}) {
    const conditions = [];
    const values = [];

    if (verification_status) {
      conditions.push('p.verification_status = ?');
      values.push(verification_status);
    }

    if (landlord_id) {
      conditions.push('p.landlord_id = ?');
      values.push(landlord_id);
    }

    if (is_featured !== null && is_featured !== undefined) {
      conditions.push('p.is_featured = ?');
      values.push(is_featured ? 1 : 0);
    }

    if (search) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ? OR p.town LIKE ? OR p.estate LIKE ? OR p.county LIKE ?)');
      const s = `%${search}%`;
      values.push(s, s, s, s, s);
    }

    if (location) {
      conditions.push('(p.county LIKE ? OR p.town LIKE ? OR p.estate LIKE ? OR p.address LIKE ?)');
      const l = `%${location}%`;
      values.push(l, l, l, l);
    }

    if (county) {
      conditions.push('p.county = ?');
      values.push(county);
    }

    if (town) {
      conditions.push('p.town = ?');
      values.push(town);
    }

    if (estate) {
      conditions.push('p.estate LIKE ?');
      values.push(`%${estate}%`);
    }

    if (property_type && property_type !== 'all') {
      conditions.push('p.property_type = ?');
      values.push(property_type.toLowerCase());
    }

    if (listing_type && listing_type !== 'all') {
      conditions.push('p.listing_type = ?');
      values.push(listing_type.toLowerCase());
    }

    if (min_price) {
      conditions.push('p.price >= ?');
      values.push(Number(min_price));
    }

    if (max_price) {
      conditions.push('p.price <= ?');
      values.push(Number(max_price));
    }

    if (bedrooms && bedrooms !== 'all') {
      if (bedrooms === '4+') {
        conditions.push('p.bedrooms >= 4');
      } else {
        conditions.push('p.bedrooms = ?');
        values.push(Number(bedrooms));
      }
    }

    if (bathrooms && bathrooms !== 'all') {
      conditions.push('p.bathrooms >= ?');
      values.push(Number(bathrooms));
    }

    if (furnished !== null && furnished !== undefined && furnished !== '') {
      conditions.push('p.furnished = ?');
      values.push(furnished === '1' || furnished === 1 || furnished === 'true' ? 1 : 0);
    }

    let joinAmenity = '';
    if (amenity) {
      joinAmenity = 'JOIN property_amenities pa ON p.id = pa.property_id';
      const cleanAmenity = amenity.toLowerCase();
      if (['parking','wifi','water','electricity','security','cctv','borehole','balcony','garden','swimming_pool','gym','lift','laundry','generator','gated_community','playground'].includes(cleanAmenity)) {
        conditions.push(`pa.${cleanAmenity} = 1`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'p.is_featured DESC, p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'p.price ASC';
    else if (sort === 'price_desc') orderBy = 'p.price DESC';
    else if (sort === 'views') orderBy = 'p.views DESC';
    else if (sort === 'oldest') orderBy = 'p.created_at ASC';

    values.push(Number(limit), Number(offset));

    const [rows] = await db.query(
      `SELECT p.*, 
              u.full_name as landlord_name, u.phone as landlord_phone, u.role as landlord_role,
              (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image
       FROM properties p
       JOIN users u ON p.landlord_id = u.id
       ${joinAmenity}
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      values
    );

    return rows;
  },

  async countAll({
    search = null,
    location = null,
    county = null,
    town = null,
    estate = null,
    property_type = null,
    listing_type = null,
    min_price = null,
    max_price = null,
    bedrooms = null,
    bathrooms = null,
    furnished = null,
    amenity = null,
    verification_status = 'approved',
    is_featured = null,
    landlord_id = null
  } = {}) {
    const conditions = [];
    const values = [];

    if (verification_status) {
      conditions.push('p.verification_status = ?');
      values.push(verification_status);
    }
    if (landlord_id) {
      conditions.push('p.landlord_id = ?');
      values.push(landlord_id);
    }
    if (is_featured !== null && is_featured !== undefined) {
      conditions.push('p.is_featured = ?');
      values.push(is_featured ? 1 : 0);
    }
    if (search) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ? OR p.town LIKE ? OR p.estate LIKE ? OR p.county LIKE ?)');
      const s = `%${search}%`;
      values.push(s, s, s, s, s);
    }
    if (location) {
      conditions.push('(p.county LIKE ? OR p.town LIKE ? OR p.estate LIKE ? OR p.address LIKE ?)');
      const l = `%${location}%`;
      values.push(l, l, l, l);
    }
    if (county) {
      conditions.push('p.county = ?');
      values.push(county);
    }
    if (town) {
      conditions.push('p.town = ?');
      values.push(town);
    }
    if (estate) {
      conditions.push('p.estate LIKE ?');
      values.push(`%${estate}%`);
    }
    if (property_type && property_type !== 'all') {
      conditions.push('p.property_type = ?');
      values.push(property_type.toLowerCase());
    }
    if (listing_type && listing_type !== 'all') {
      conditions.push('p.listing_type = ?');
      values.push(listing_type.toLowerCase());
    }
    if (min_price) {
      conditions.push('p.price >= ?');
      values.push(Number(min_price));
    }
    if (max_price) {
      conditions.push('p.price <= ?');
      values.push(Number(max_price));
    }
    if (bedrooms && bedrooms !== 'all') {
      if (bedrooms === '4+') conditions.push('p.bedrooms >= 4');
      else {
        conditions.push('p.bedrooms = ?');
        values.push(Number(bedrooms));
      }
    }
    if (bathrooms && bathrooms !== 'all') {
      conditions.push('p.bathrooms >= ?');
      values.push(Number(bathrooms));
    }
    if (furnished !== null && furnished !== undefined && furnished !== '') {
      conditions.push('p.furnished = ?');
      values.push(furnished === '1' || furnished === 1 || furnished === 'true' ? 1 : 0);
    }

    let joinAmenity = '';
    if (amenity) {
      joinAmenity = 'JOIN property_amenities pa ON p.id = pa.property_id';
      const cleanAmenity = amenity.toLowerCase();
      if (['parking','wifi','water','electricity','security','cctv','borehole','balcony','garden','swimming_pool','gym','lift','laundry','generator','gated_community','playground'].includes(cleanAmenity)) {
        conditions.push(`pa.${cleanAmenity} = 1`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT COUNT(*) as cnt FROM properties p ${joinAmenity} ${whereClause}`,
      values
    );
    return rows[0].cnt;
  },

  async incrementViews(id) {
    await db.query('UPDATE properties SET views = views + 1 WHERE id = ?', [id]);
  },

  async updateVerificationStatus(id, status, rejectionReason = null) {
    await db.query(
      'UPDATE properties SET verification_status = ?, rejection_reason = ? WHERE id = ?',
      [status, rejectionReason, id]
    );
    return this.findById(id);
  },

  async setFeatured(id, days = 7) {
    await db.query(
      'UPDATE properties SET is_featured = 1, featured_until = DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id = ?',
      [days, id]
    );
  },

  async getFeaturedProperties(limit = 6) {
    const [rows] = await db.query(
      `SELECT p.*, u.full_name as landlord_name,
              (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image
       FROM properties p
       JOIN users u ON p.landlord_id = u.id
       WHERE p.verification_status = 'approved' AND p.is_featured = 1
       ORDER BY p.views DESC, p.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  },

  async getStats(landlordId) {
    const [totalProps] = await db.query('SELECT COUNT(*) as cnt FROM properties WHERE landlord_id = ?', [landlordId]);
    const [approvedProps] = await db.query('SELECT COUNT(*) as cnt FROM properties WHERE landlord_id = ? AND verification_status = "approved"', [landlordId]);
    const [pendingProps] = await db.query('SELECT COUNT(*) as cnt FROM properties WHERE landlord_id = ? AND verification_status = "pending"', [landlordId]);
    const [inquiries] = await db.query('SELECT COUNT(*) as cnt FROM inquiries WHERE landlord_id = ?', [landlordId]);
    const [bookings] = await db.query('SELECT COUNT(*) as cnt FROM viewing_bookings WHERE landlord_id = ? AND status = "pending"', [landlordId]);
    const [promotions] = await db.query('SELECT COUNT(*) as cnt FROM property_promotions pp JOIN properties p ON pp.property_id = p.id WHERE p.landlord_id = ? AND pp.status = "active"', [landlordId]);
    const [payments] = await db.query('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE user_id = ? AND status = "completed"', [landlordId]);

    return {
      totalProperties: totalProps[0].cnt,
      approvedProperties: approvedProps[0].cnt,
      pendingProperties: pendingProps[0].cnt,
      totalInquiries: inquiries[0].cnt,
      upcomingViewings: bookings[0].cnt,
      activePromotions: promotions[0].cnt,
      totalPayments: payments[0].total
    };
  },

  async getAdminStats() {
    const [users] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN role="landlord" THEN 1 ELSE 0 END) as landlords, SUM(CASE WHEN role="agent" THEN 1 ELSE 0 END) as agents FROM users');
    const [props] = await db.query('SELECT COUNT(*) as total, SUM(CASE WHEN verification_status="pending" THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN verification_status="approved" THEN 1 ELSE 0 END) as approved FROM properties');
    const [payments] = await db.query('SELECT COUNT(*) as total_count, COALESCE(SUM(amount), 0) as total_revenue FROM payments WHERE status = "completed"');
    const [reports] = await db.query('SELECT COUNT(*) as pending_reports FROM reports WHERE status = "pending"');
    const [inquiries] = await db.query('SELECT COUNT(*) as total_inquiries FROM inquiries');
    const [bookings] = await db.query('SELECT COUNT(*) as total_bookings FROM viewing_bookings');

    return {
      totalUsers: users[0].total || 0,
      totalLandlords: users[0].landlords || 0,
      totalAgents: users[0].agents || 0,
      totalProperties: props[0].total || 0,
      pendingProperties: props[0].pending || 0,
      approvedProperties: props[0].approved || 0,
      totalPayments: payments[0].total_count || 0,
      totalRevenue: payments[0].total_revenue || 0,
      pendingReports: reports[0].pending_reports || 0,
      newInquiries: inquiries[0].total_inquiries || 0,
      totalBookings: bookings[0].total_bookings || 0
    };
  }
};

module.exports = Property;
