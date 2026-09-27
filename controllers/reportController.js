const Report = require('../models/Report');
const Property = require('../models/Property');

exports.createReport = async (req, res) => {
  const propertyId = req.params.id;
  const { reporter_name, reporter_phone, reporter_email, reason, description } = req.body;

  if (!reason) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, message: 'Please specify the reason for reporting this property.' });
    }
    return res.redirect(`/properties/${propertyId}?error=Please select a report reason`);
  }

  try {
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const report = await Report.create({
      property_id: propertyId,
      reporter_name,
      reporter_phone,
      reporter_email,
      reason,
      description
    });

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(201).json({
        success: true,
        message: 'Thank you for your report. Our security team will review this listing to keep HomeFinder safe.',
        report
      });
    }

    return res.redirect(`/properties/${propertyId}?success=Report submitted. Our moderation team will investigate promptly.`);
  } catch (error) {
    console.error('Error reporting property:', error);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Failed to submit report. Please try again.' });
    }
    return res.redirect(`/properties/${propertyId}?error=Failed to submit report.`);
  }
};
