const db = require('../config/db');

const PropertyImage = {
  async findByPropertyId(propertyId) {
    const [rows] = await db.query(
      'SELECT id, property_id, image_url, is_primary, created_at FROM property_images WHERE property_id = ? ORDER BY is_primary DESC, id ASC',
      [propertyId]
    );
    return rows;
  },

  async create(propertyId, imageUrl, isPrimary = 0) {
    const [result] = await db.query(
      'INSERT INTO property_images (property_id, image_url, is_primary) VALUES (?, ?, ?)',
      [propertyId, imageUrl, isPrimary ? 1 : 0]
    );
    return { id: result.insertId, property_id: propertyId, image_url: imageUrl, is_primary: isPrimary };
  },

  async createMany(propertyId, images = []) {
    if (!images || images.length === 0) return [];
    const values = images.map((img, index) => [
      propertyId,
      typeof img === 'string' ? img : img.image_url,
      img.is_primary ? 1 : (index === 0 ? 1 : 0)
    ]);

    await db.query(
      'INSERT INTO property_images (property_id, image_url, is_primary) VALUES ?',
      [values]
    );
    return this.findByPropertyId(propertyId);
  },

  async setPrimary(propertyId, imageId) {
    await db.query('UPDATE property_images SET is_primary = 0 WHERE property_id = ?', [propertyId]);
    await db.query('UPDATE property_images SET is_primary = 1 WHERE property_id = ? AND id = ?', [propertyId, imageId]);
    return this.findByPropertyId(propertyId);
  },

  async deleteById(imageId, propertyId = null) {
    if (propertyId) {
      await db.query('DELETE FROM property_images WHERE id = ? AND property_id = ?', [imageId, propertyId]);
    } else {
      await db.query('DELETE FROM property_images WHERE id = ?', [imageId]);
    }
  },

  async deleteByPropertyId(propertyId) {
    await db.query('DELETE FROM property_images WHERE property_id = ?', [propertyId]);
  },

  prepareForSave(propertyId, files = []) {
    return files.map((file, index) => ({
      property_id: propertyId,
      image_url: file.path ? file.path.replace(/\\/g, '/').replace(/^.*?public/, '') : `/uploads/properties/${file.filename}`,
      is_primary: index === 0 ? 1 : 0
    }));
  }
};

module.exports = PropertyImage;
