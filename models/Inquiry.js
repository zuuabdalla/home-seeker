const db = require('../config/db');

const Inquiry = {
  async create({ property_id, landlord_id, seeker_name, seeker_phone, seeker_email = null, message, preferred_viewing_date = null, preferred_contact_method = 'phone' }) {
    const [result] = await db.query(
      `INSERT INTO inquiries (property_id, landlord_id, seeker_name, seeker_phone, seeker_email, message, preferred_viewing_date, preferred_contact_method, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
      [
        property_id,
        landlord_id,
        seeker_name.trim(),
        seeker_phone.trim(),
        seeker_email ? seeker_email.trim() : null,
        message.trim(),
        preferred_viewing_date || null,
        preferred_contact_method || 'phone'
      ]
    );

    // Also trigger landlord notification
    try {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read)
         VALUES (?, 'New Inquiry Received', ?, 'inquiry', 0)`,
        [
          landlord_id,
          `${seeker_name.trim()} sent an inquiry regarding your property.`
        ]
      );
    } catch (e) {
      console.error('Notification error:', e.message);
    }

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT i.*, p.title as property_title, p.price as property_price, p.town as property_town
       FROM inquiries i
       JOIN properties p ON i.property_id = p.id
       WHERE i.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByLandlord(landlordId, limit = 50, offset = 0) {
    const [rows] = await db.query(
      `SELECT i.*, p.title as property_title, p.price as property_price, p.town as property_town,
              (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as property_image
       FROM inquiries i
       JOIN properties p ON i.property_id = p.id
       WHERE i.landlord_id = ?
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [landlordId, Number(limit), Number(offset)]
    );
    return rows;
  },

  async findAll(limit = 100, offset = 0) {
    const [rows] = await db.query(
      `SELECT i.*, p.title as property_title, u.full_name as landlord_name
       FROM inquiries i
       JOIN properties p ON i.property_id = p.id
       JOIN users u ON i.landlord_id = u.id
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );
    return rows;
  },

  async updateStatus(id, landlordId, status) {
    let query = 'UPDATE inquiries SET status = ? WHERE id = ?';
    const params = [status, id];
    if (landlordId) {
      query += ' AND landlord_id = ?';
      params.push(landlordId);
    }
    const [result] = await db.query(query, params);
    return result.affectedRows > 0;
  }
};

module.exports = Inquiry;
