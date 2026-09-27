const db = require('../config/db');

const Report = {
  async create({ property_id, reporter_name, reporter_phone, reporter_email, reason, description }) {
    const validReasons = ['fake_listing', 'wrong_information', 'scam', 'duplicate_listing', 'inappropriate_content', 'other'];
    const safeReason = validReasons.includes(reason) ? reason : 'other';

    const [result] = await db.query(
      `INSERT INTO reports (property_id, reporter_name, reporter_phone, reporter_email, reason, description, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        property_id,
        reporter_name ? reporter_name.trim() : null,
        reporter_phone ? reporter_phone.trim() : null,
        reporter_email ? reporter_email.trim() : null,
        safeReason,
        description ? description.trim() : null
      ]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT r.*, p.title as property_title, p.price as property_price, p.town as property_town, u.full_name as landlord_name
       FROM reports r
       JOIN properties p ON r.property_id = p.id
       JOIN users u ON p.landlord_id = u.id
       WHERE r.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findAll(status = null, limit = 100, offset = 0) {
    let query = `SELECT r.*, p.title as property_title, p.price as property_price, p.town as property_town, u.full_name as landlord_name
                 FROM reports r
                 JOIN properties p ON r.property_id = p.id
                 JOIN users u ON p.landlord_id = u.id`;
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

  async updateStatus(id, status, adminNotes = null) {
    const isResolved = status === 'resolved';
    const [result] = await db.query(
      `UPDATE reports SET status = ?, admin_notes = ?, resolved_at = ${isResolved ? 'NOW()' : 'NULL'} WHERE id = ?`,
      [status, adminNotes, id]
    );
    return this.findById(id);
  },

  async getSuspiciousCounts() {
    const [rows] = await db.query(
      `SELECT property_id, COUNT(*) as report_count
       FROM reports
       WHERE status IN ('pending', 'investigating')
       GROUP BY property_id
       HAVING report_count >= 2`
    );
    return rows;
  }
};

module.exports = Report;
