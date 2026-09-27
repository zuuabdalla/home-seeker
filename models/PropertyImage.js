const PropertyImage = {
  prepareForSave(propertyId, files = []) {
    return files.map((file, index) => ({
      id: Date.now() + index,
      property_id: propertyId,
      image_url: file && file.path ? file.path.replace(/\\/g, '/').replace(/^.*?public/, '') : `/uploads/properties/${file.filename}`,
      is_primary: index === 0,
      created_at: new Date(),
    }));
  },

  async saveMany(images) {
    return Promise.resolve(images);
  },
};

module.exports = PropertyImage;
