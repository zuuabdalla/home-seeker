const db = require('../config/db');

const Promotion = {
  async findByLandlord(landlordId, limit = 50, offset = 0) {
    const [rows] = await db.query(
      `SELECT pp.*, p.title as property_title, pay.amount as paid_amount, pay.transaction_reference
       FROM property_promotions pp
       JOIN properties p ON pp.property_id = p.id
       JOIN payments pay ON pp.payment_id = pay.id
       WHERE p.landlord_id = ?
       ORDER BY pp.created_at DESC
       LIMIT ? OFFSET ?`,
      [landlordId, Number(limit), Number(offset)]
    );
    return rows;
  },

  async findAll(limit = 100, offset = 0) {
    const [rows] = await db.query(
      `SELECT pp.*, p.title as property_title, u.full_name as landlord_name, pay.amount as paid_amount
       FROM property_promotions pp
       JOIN properties p ON pp.property_id = p.id
       JOIN users u ON p.landlord_id = u.id
       JOIN payments pay ON pp.payment_id = pay.id
       ORDER BY pp.created_at DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );
    return rows;
  },

  async checkAndExpirePromotions() {
    // Automatically set expired for promotions whose end_date has passed
    await db.query(
      `UPDATE property_promotions SET status = 'expired' WHERE status = 'active' AND end_date < NOW()`
    );
    await db.query(
      `UPDATE properties SET is_featured = 0 WHERE is_featured = 1 AND featured_until < NOW()`
    );
  }
};

module.exports = Promotion;
