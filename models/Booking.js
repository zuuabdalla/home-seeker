const db = require('../config/db');

const Booking = {
  async create({ property_id, landlord_id, seeker_name, seeker_phone, seeker_email = null, viewing_date, viewing_time, message = null }) {
    const [result] = await db.query(
      `INSERT INTO viewing_bookings (property_id, landlord_id, seeker_name, seeker_phone, seeker_email, viewing_date, viewing_time, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        property_id,
        landlord_id,
        seeker_name.trim(),
        seeker_phone.trim(),
        seeker_email ? seeker_email.trim() : null,
        viewing_date,
        viewing_time,
        message ? message.trim() : null
      ]
    );

    // Landlord notification
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read)
         VALUES (?, 'Viewing Booking Requested', ?, 'booking', 0)`,
        [
          landlord_id,
          `${seeker_name.trim()} requested a viewing appointment on ${viewing_date} at ${viewing_time}.`
        ]
      );
    } catch (e) {
      console.error('Notification error:', e.message);
    }

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT vb.*, p.title as property_title, p.price as property_price, p.town as property_town
       FROM viewing_bookings vb
       JOIN properties p ON vb.property_id = p.id
       WHERE vb.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByLandlord(landlordId, limit = 50, offset = 0) {
    const [rows] = await db.query(
      `SELECT vb.*, p.title as property_title, p.price as property_price, p.town as property_town,
              (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as property_image
       FROM viewing_bookings vb
       JOIN properties p ON vb.property_id = p.id
       WHERE vb.landlord_id = ?
       ORDER BY vb.viewing_date DESC, vb.viewing_time DESC
       LIMIT ? OFFSET ?`,
      [landlordId, Number(limit), Number(offset)]
    );
    return rows;
  },

  async findAll(limit = 100, offset = 0) {
    const [rows] = await db.query(
      `SELECT vb.*, p.title as property_title, u.full_name as landlord_name
       FROM viewing_bookings vb
       JOIN properties p ON vb.property_id = p.id
       JOIN users u ON vb.landlord_id = u.id
       ORDER BY vb.created_at DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );
    return rows;
  },

  async updateStatus(id, landlordId, status) {
    let query = 'UPDATE viewing_bookings SET status = ? WHERE id = ?';
    const params = [status, id];
    if (landlordId) {
      query += ' AND landlord_id = ?';
      params.push(landlordId);
    }
    const [result] = await db.query(query, params);
    return result.affectedRows > 0;
  }
};

module.exports = Booking;
