const db = require('../config/db');

const Review = {
  async create({ property_id, user_id, rating, review }) {
    const [result] = await db.query(
      `INSERT INTO reviews (property_id, user_id, rating, review, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [property_id, user_id, Math.min(5, Math.max(1, Number(rating))), review ? review.trim() : null]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT r.*, p.title as property_title, u.full_name as reviewer_name
       FROM reviews r
       JOIN properties p ON r.property_id = p.id
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByPropertyId(propertyId, status = 'approved') {
    const [rows] = await db.query(
      `SELECT r.*, u.full_name as reviewer_name, u.profile_image as reviewer_avatar
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.property_id = ? AND r.status = ?
       ORDER BY r.created_at DESC`,
      [propertyId, status]
    );
    return rows;
  },

  async findAll(status = null, limit = 100, offset = 0) {
    let query = `SELECT r.*, p.title as property_title, u.full_name as reviewer_name
                 FROM reviews r
                 JOIN properties p ON r.property_id = p.id
                 JOIN users u ON r.user_id = u.id`;
    const params = [];
    if (status) {
      query += ' WHERE r.status = ?';
      params.push(status);
    }
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await db.query(query, params);
    return rows;
  },

  async updateStatus(id, status) {
    await db.query('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  }
};

module.exports = Review;
