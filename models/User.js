const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  async findById(id) {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, role, profile_image, bio, is_verified, is_active, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email ? email.trim().toLowerCase() : '']
    );
    return rows[0] || null;
  },

  async findByPhone(phone) {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE phone = ?',
      [phone ? phone.trim() : '']
    );
    return rows[0] || null;
  },

  async create({ full_name, email, phone, password, role = 'landlord', bio = null, profile_image = null }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, phone, password, role, bio, profile_image, is_verified, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
      [full_name.trim(), email.trim().toLowerCase(), phone.trim(), hashedPassword, role, bio, profile_image]
    );
    return this.findById(result.insertId);
  },

  async update(id, { full_name, phone, bio, profile_image, password }) {
    const fields = [];
    const values = [];

    if (full_name) {
      fields.push('full_name = ?');
      values.push(full_name.trim());
    }
    if (phone) {
      fields.push('phone = ?');
      values.push(phone.trim());
    }
    if (bio !== undefined) {
      fields.push('bio = ?');
      values.push(bio);
    }
    if (profile_image) {
      fields.push('profile_image = ?');
      values.push(profile_image);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push('password = ?');
      values.push(hashedPassword);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async verifyPassword(plainPassword, hashedPassword) {
    if (!plainPassword || !hashedPassword) return false;
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  async getAll({ role = null, is_active = null, search = null, limit = 50, offset = 0 } = {}) {
    const conditions = [];
    const values = [];

    if (role) {
      conditions.push('role = ?');
      values.push(role);
    }
    if (is_active !== null) {
      conditions.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }
    if (search) {
      conditions.push('(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      const s = `%${search}%`;
      values.push(s, s, s);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(Number(limit), Number(offset));

    const [rows] = await db.query(
      `SELECT id, full_name, email, phone, role, profile_image, bio, is_verified, is_active, created_at, updated_at
       FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      values
    );
    return rows;
  },

  async count({ role = null, is_active = null, search = null } = {}) {
    const conditions = [];
    const values = [];

    if (role) {
      conditions.push('role = ?');
      values.push(role);
    }
    if (is_active !== null) {
      conditions.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }
    if (search) {
      conditions.push('(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      const s = `%${search}%`;
      values.push(s, s, s);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await db.query(`SELECT COUNT(*) as cnt FROM users ${whereClause}`, values);
    return rows[0].cnt;
  },

  async toggleActive(id, isActive) {
    await db.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
    return this.findById(id);
  },

  async toggleVerified(id, isVerified) {
    await db.query('UPDATE users SET is_verified = ? WHERE id = ?', [isVerified ? 1 : 0, id]);
    return this.findById(id);
  }
};

module.exports = User;
