const User = require('../models/User');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const Report = require('../models/Report');
const Inquiry = require('../models/Inquiry');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Promotion = require('../models/Promotion');
const Notification = require('../models/Notification');

exports.renderLogin = (req, res) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', {
    title: 'Admin Portal Login | HomeFinder',
    error: null,
    user: null
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('admin/login', {
      title: 'Admin Portal Login | HomeFinder',
      error: 'Please enter both your email and password.',
      user: null
    });
  }

  try {
    const user = await User.findByEmail(email);
    if (!user || user.role !== 'admin') {
      return res.render('admin/login', {
        title: 'Admin Portal Login | HomeFinder',
        error: 'Invalid admin credentials.',
        user: null
      });
    }

    const isMatch = await User.verifyPassword(password, user.password);
    if (!isMatch) {
      return res.render('admin/login', {
        title: 'Admin Portal Login | HomeFinder',
        error: 'Invalid admin credentials.',
        user: null
      });
    }

    req.session.user = {
      id: user.id,
      name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: 'admin',
      avatar: user.profile_image,
      is_verified: 1
    };

    return res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Admin login error:', error);
    return res.render('admin/login', {
      title: 'Admin Portal Login | HomeFinder',
      error: 'An unexpected error occurred.',
      user: null
    });
  }
};

exports.renderDashboard = async (req, res) => {
  try {
    const stats = await Property.getAdminStats();
    const pendingProperties = await Property.findAll({
      verification_status: 'pending',
      limit: 5
    });
    const recentReports = await Report.findAll('pending', 5);
    const recentPayments = await Payment.findAll(5);

    res.render('admin/dashboard', {
      title: 'Administrator Dashboard | HomeFinder',
      stats,
      pendingProperties,
      recentReports,
      recentPayments,
      user: req.session.user
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).send('Admin dashboard error');
  }
};

exports.listProperties = async (req, res) => {
  try {
    const status = req.query.status || null;
    const properties = await Property.findAll({
      verification_status: status,
      limit: 100
    });

    res.render('admin/properties', {
      title: 'Manage Properties | Admin Portal',
      properties,
      currentStatus: status,
      user: req.session.user,
      statusMessage: req.query.status_msg || null
    });
  } catch (error) {
    console.error('Admin properties error:', error);
    res.redirect('/admin/dashboard');
  }
};

exports.listPendingProperties = async (req, res) => {
  try {
    const pendingProperties = await Property.findAll({
      verification_status: 'pending',
      limit: 100
    });

    res.render('admin/pending-properties', {
      title: 'Pending Property Verifications | Admin Portal',
      properties: pendingProperties,
      user: req.session.user,
      statusMessage: req.query.status_msg || null
    });
  } catch (error) {
    console.error('Admin pending properties error:', error);
    res.redirect('/admin/dashboard');
  }
};

exports.approveProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.updateVerificationStatus(id, 'approved', null);

    // Notify landlord
    if (property) {
      await Notification.create({
        user_id: property.landlord_id,
        title: 'Property Approved!',
        message: `Your property listing "${property.title}" has been approved and is now publicly visible.`,
        type: 'property'
      });
    }

    return res.redirect('/admin/properties/pending?status_msg=Property approved successfully');
  } catch (error) {
    console.error('Approve property error:', error);
    return res.redirect('/admin/properties/pending?status_msg=Error approving property');
  }
};

exports.rejectProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason || !rejection_reason.trim()) {
      return res.redirect('/admin/properties/pending?status_msg=A rejection reason is required.');
    }

    const property = await Property.updateVerificationStatus(id, 'rejected', rejection_reason.trim());

    // Notify landlord
    if (property) {
      await Notification.create({
        user_id: property.landlord_id,
        title: 'Property Listing Rejected',
        message: `Your property listing "${property.title}" was not approved. Reason: ${rejection_reason.trim()}`,
        type: 'property'
      });
    }

    return res.redirect('/admin/properties/pending?status_msg=Property listing rejected with feedback.');
  } catch (error) {
    console.error('Reject property error:', error);
    return res.redirect('/admin/properties/pending?status_msg=Error rejecting property');
  }
};

exports.listUsers = async (req, res) => {
  try {
    const role = req.query.role || null;
    const users = await User.getAll({ role, limit: 100 });

    res.render('admin/users', {
      title: 'Manage Users | Admin Portal',
      users,
      currentRole: role,
      user: req.session.user
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.redirect('/admin/dashboard');
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await User.toggleActive(id, is_active === '1' || is_active === true);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Toggle user error:', error);
    res.redirect('/admin/users');
  }
};

exports.listPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll(100);
    res.render('admin/payments', {
      title: 'Platform Payments | Admin Portal',
      payments,
      user: req.session.user
    });
  } catch (error) {
    console.error('Admin payments error:', error);
    res.redirect('/admin/dashboard');
  }
};

exports.listReports = async (req, res) => {
  try {
    const status = req.query.status || null;
    const reports = await Report.findAll(status, 100);

    res.render('admin/reports', {
      title: 'Property Reports & Fraud Flags | Admin Portal',
      reports,
      currentStatus: status,
      user: req.session.user
    });
  } catch (error) {
    console.error('Admin reports error:', error);
    res.redirect('/admin/dashboard');
  }
};

exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    await Report.updateStatus(id, status, admin_notes || null);
    res.redirect('/admin/reports');
  } catch (error) {
    console.error('Update report error:', error);
    res.redirect('/admin/reports');
  }
};

exports.listInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.findAll(100);
    res.render('admin/inquiries', {
      title: 'All Inquiries | Admin Portal',
      inquiries,
      user: req.session.user
    });
  } catch (error) {
    console.error('Admin inquiries error:', error);
    res.redirect('/admin/dashboard');
  }
};

exports.listBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll(100);
    res.render('admin/bookings', {
      title: 'All Viewing Bookings | Admin Portal',
      bookings,
      user: req.session.user
    });
  } catch (error) {
    console.error('Admin bookings error:', error);
    res.redirect('/admin/dashboard');
  }
};

exports.listReviews = async (req, res) => {
  try {
    const status = req.query.status || null;
    const reviews = await Review.findAll(status, 100);
    res.render('admin/reviews', {
      title: 'Moderate Reviews | Admin Portal',
      reviews,
      currentStatus: status,
      user: req.session.user
    });
  } catch (error) {
    console.error('Admin reviews error:', error);
    res.redirect('/admin/dashboard');
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await Review.updateStatus(id, status);
    res.redirect('/admin/reviews');
  } catch (error) {
    console.error('Update review error:', error);
    res.redirect('/admin/reviews');
  }
};
