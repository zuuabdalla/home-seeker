const db = require('../config/db');

const Favorite = {
  async add(userId, propertyId) {
    try {
      await db.query(
        'INSERT IGNORE INTO favorites (user_id, property_id) VALUES (?, ?)',
        [userId, propertyId]
      );
      return true;
    } catch (e) {
      console.error('Error adding favorite:', e.message);
      return false;
    }
  },

  async remove(userId, propertyId) {
    const [result] = await db.query(
      'DELETE FROM favorites WHERE user_id = ? AND property_id = ?',
      [userId, propertyId]
    );
    return result.affectedRows > 0;
  },

  async isFavorited(userId, propertyId) {
    if (!userId) return false;
    const [rows] = await db.query(
      'SELECT id FROM favorites WHERE user_id = ? AND property_id = ?',
      [userId, propertyId]
    );
    return rows.length > 0;
  },

  async getUserFavorites(userId) {
    const [rows] = await db.query(
      `SELECT p.*, f.created_at as favorited_at,
              (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image
       FROM favorites f
       JOIN properties p ON f.property_id = p.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return rows;
  }
};

module.exports = Favorite;
