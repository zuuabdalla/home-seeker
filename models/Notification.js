const db = require('../config/db');

const Notification = {
  async create({ user_id, title, message, type = 'system' }) {
    const [result] = await db.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read)
       VALUES (?, ?, ?, ?, 0)`,
      [user_id, title.trim(), message.trim(), type]
    );
    return result.insertId;
  },

  async findByUser(userId, limit = 50) {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, Number(limit)]
    );
    return rows;
  },

  async getUnreadCount(userId) {
    if (!userId) return 0;
    const [rows] = await db.query(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return rows[0].unread || 0;
  },

  async markAsRead(id, userId) {
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  },

  async markAllAsRead(userId) {
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );
  }
};

module.exports = Notification;
