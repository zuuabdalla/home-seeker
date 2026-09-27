const db = require('../config/db');

const PACKAGES = {
  basic: { name: 'Basic Promotion', price: 500.00, days: 7 },
  standard: { name: 'Standard Promotion', price: 1000.00, days: 14 },
  premium: { name: 'Premium Promotion', price: 2000.00, days: 30 }
};

const Payment = {
  PACKAGES,

  getPackageDetails(packageKey) {
    const key = String(packageKey || '').toLowerCase().trim();
    return PACKAGES[key] || null;
  },

  async create({ user_id, property_id, amount, package_name, phone_number, external_reference }) {
    const [result] = await db.query(
      `INSERT INTO payments (user_id, property_id, amount, currency, payment_method, package_name, phone_number, external_reference, status)
       VALUES (?, ?, ?, 'KES', 'M-Pesa', ?, ?, ?, 'pending')`,
      [
        user_id,
        property_id,
        Number(amount),
        package_name,
        phone_number.trim(),
        external_reference
      ]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT pay.*, p.title as property_title, u.full_name as user_name, u.email as user_email
       FROM payments pay
       LEFT JOIN properties p ON pay.property_id = p.id
       JOIN users u ON pay.user_id = u.id
       WHERE pay.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByExternalReference(ref) {
    const [rows] = await db.query(
      `SELECT pay.*, p.title as property_title
       FROM payments pay
       LEFT JOIN properties p ON pay.property_id = p.id
       WHERE pay.external_reference = ?`,
      [ref]
    );
    return rows[0] || null;
  },

  async completePayment(id, { transaction_reference, payhero_reference, callback_data }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query('SELECT * FROM payments WHERE id = ? FOR UPDATE', [id]);
      if (!rows.length) {
        throw new Error('Payment not found');
      }

      const payment = rows[0];

      // Idempotency: If already completed, don't execute promo activation again
      if (payment.status === 'completed') {
        await conn.rollback();
        return payment;
      }

      // 1. Update payment record
      await conn.query(
        `UPDATE payments SET
          status = 'completed',
          transaction_reference = ?,
          payhero_reference = ?,
          callback_data = ?,
          paid_at = NOW()
        WHERE id = ?`,
        [
          transaction_reference || null,
          payhero_reference || null,
          callback_data ? JSON.stringify(callback_data) : null,
          id
        ]
      );

      // 2. Activate Promotion if property_id is present
      if (payment.property_id) {
        let promoDays = 7;
        const pkg = Object.values(PACKAGES).find(p => p.name.toLowerCase() === (payment.package_name || '').toLowerCase());
        if (pkg) promoDays = pkg.days;

        // Insert into property_promotions
        const [promoRes] = await conn.query(
          `INSERT INTO property_promotions (property_id, payment_id, package_name, start_date, end_date, status)
           VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active')`,
          [payment.property_id, payment.id, payment.package_name || 'Standard Promotion', promoDays]
        );

        // Update property is_featured and featured_until
        await conn.query(
          `UPDATE properties SET
            is_featured = 1,
            featured_until = DATE_ADD(NOW(), INTERVAL ? DAY)
          WHERE id = ?`,
          [promoDays, payment.property_id]
        );

        // Landlord notification
        await conn.query(
          `INSERT INTO notifications (user_id, title, message, type, is_read)
           VALUES (?, 'Payment Successful - Property Promoted', ?, 'promotion', 0)`,
          [
            payment.user_id,
            `Your payment of KES ${payment.amount} was confirmed. Your property is now featured for ${promoDays} days!`
          ]
        );
      }

      await conn.commit();
      return this.findById(id);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async markFailed(id, callback_data = null) {
    await db.query(
      `UPDATE payments SET status = 'failed', callback_data = ? WHERE id = ? AND status = 'pending'`,
      [callback_data ? JSON.stringify(callback_data) : null, id]
    );
  },

  async findByLandlord(userId, limit = 50, offset = 0) {
    const [rows] = await db.query(
      `SELECT pay.*, p.title as property_title
       FROM payments pay
       LEFT JOIN properties p ON pay.property_id = p.id
       WHERE pay.user_id = ?
       ORDER BY pay.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, Number(limit), Number(offset)]
    );
    return rows;
  },

  async findAll(limit = 100, offset = 0) {
    const [rows] = await db.query(
      `SELECT pay.*, p.title as property_title, u.full_name as user_name, u.email as user_email
       FROM payments pay
       LEFT JOIN properties p ON pay.property_id = p.id
       JOIN users u ON pay.user_id = u.id
       ORDER BY pay.created_at DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );
    return rows;
  }
};

module.exports = Payment;
