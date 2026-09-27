const db = require('../config/db');

const ContactMessage = {
  async create({ name, email, phone = null, subject = null, message }) {
    const [result] = await db.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message, status)
       VALUES (?, ?, ?, ?, ?, 'new')`,
      [name.trim(), email.trim(), phone ? phone.trim() : null, subject ? subject.trim() : null, message.trim()]
    );
    return result.insertId;
  },

  async findAll(limit = 100, offset = 0) {
    const [rows] = await db.query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [Number(limit), Number(offset)]
    );
    return rows;
  },

  async updateStatus(id, status) {
    await db.query('UPDATE contact_messages SET status = ? WHERE id = ?', [status, id]);
  }
};

module.exports = ContactMessage;
