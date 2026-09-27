const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');

exports.createInquiry = async (req, res) => {
  const propertyId = req.params.id;
  const {
    seeker_name,
    seeker_phone,
    seeker_email,
    message,
    preferred_viewing_date,
    preferred_contact_method
  } = req.body;

  if (!seeker_name || !seeker_phone || !message) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, message: 'Please provide your name, phone number, and message.' });
    }
    return res.redirect(`/properties/${propertyId}?error=Please fill in all required inquiry fields.`);
  }

  try {
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const inquiry = await Inquiry.create({
      property_id: propertyId,
      landlord_id: property.landlord_id,
      seeker_name,
      seeker_phone,
      seeker_email: seeker_email || null,
      message,
      preferred_viewing_date: preferred_viewing_date || null,
      preferred_contact_method: preferred_contact_method || 'phone'
    });

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(201).json({
        success: true,
        message: 'Your inquiry has been sent to the landlord successfully! They will contact you shortly.',
        inquiry
      });
    }

    return res.redirect(`/properties/${propertyId}?success=Inquiry sent successfully! The landlord will contact you.`);
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Failed to send inquiry. Please try again.' });
    }
    return res.redirect(`/properties/${propertyId}?error=Failed to send inquiry. Please try again.`);
  }
};

exports.getLandlordInquiries = async (req, res) => {
  try {
    const landlordId = req.session.user.id;
    const inquiries = await Inquiry.findByLandlord(landlordId);

    res.render('landlord/inquiries', {
      title: 'Property Inquiries | Landlord Portal',
      inquiries,
      user: req.session.user,
      statusMessage: req.query.status || null
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.redirect('/landlord/dashboard');
  }
};

exports.updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const landlordId = req.session.user.role === 'admin' ? null : req.session.user.id;

    await Inquiry.updateStatus(id, landlordId, status);
    return res.redirect('/landlord/inquiries?status=updated');
  } catch (error) {
    console.error('Update inquiry status error:', error);
    return res.redirect('/landlord/inquiries');
  }
};
