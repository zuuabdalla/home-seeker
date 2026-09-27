const Booking = require('../models/Booking');
const Property = require('../models/Property');

exports.createBooking = async (req, res) => {
  const propertyId = req.params.id;
  const {
    seeker_name,
    seeker_phone,
    seeker_email,
    viewing_date,
    viewing_time,
    message
  } = req.body;

  if (!seeker_name || !seeker_phone || !viewing_date || !viewing_time) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, message: 'Please provide your name, phone number, viewing date, and time.' });
    }
    return res.redirect(`/properties/${propertyId}?error=Please provide all required booking details.`);
  }

  try {
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const booking = await Booking.create({
      property_id: propertyId,
      landlord_id: property.landlord_id,
      seeker_name,
      seeker_phone,
      seeker_email: seeker_email || null,
      viewing_date,
      viewing_time,
      message: message || null
    });

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(201).json({
        success: true,
        message: 'Viewing appointment requested successfully! The landlord will confirm your booking.',
        booking
      });
    }

    return res.redirect(`/properties/${propertyId}?success=Viewing requested successfully! The landlord will confirm.`);
  } catch (error) {
    console.error('Error creating viewing booking:', error);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Failed to schedule viewing appointment.' });
    }
    return res.redirect(`/properties/${propertyId}?error=Failed to schedule viewing appointment.`);
  }
};

exports.getLandlordBookings = async (req, res) => {
  try {
    const landlordId = req.session.user.id;
    const bookings = await Booking.findByLandlord(landlordId);

    res.render('landlord/bookings', {
      title: 'Viewing Appointments | Landlord Portal',
      bookings,
      user: req.session.user,
      statusMessage: req.query.status || null
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.redirect('/landlord/dashboard');
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const landlordId = req.session.user.role === 'admin' ? null : req.session.user.id;

    await Booking.updateStatus(id, landlordId, status);
    return res.redirect('/landlord/bookings?status=status_updated');
  } catch (error) {
    console.error('Update booking status error:', error);
    return res.redirect('/landlord/bookings');
  }
};
