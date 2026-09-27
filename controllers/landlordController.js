const Property = require('../models/Property');
const Inquiry = require('../models/Inquiry');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');

exports.renderDashboard = async (req, res) => {
  try {
    const landlordId = req.session.user.id;

    const stats = await Property.getStats(landlordId);
    const recentProperties = await Property.findAll({
      landlord_id: landlordId,
      verification_status: null,
      limit: 4
    });
    const recentInquiries = await Inquiry.findByLandlord(landlordId, 5);
    const recentBookings = await Booking.findByLandlord(landlordId, 5);
    const unreadNotifications = await Notification.getUnreadCount(landlordId);

    res.render('landlord/dashboard', {
      title: 'Landlord Dashboard | HomeFinder',
      stats,
      recentProperties,
      recentInquiries,
      recentBookings,
      unreadNotifications,
      user: req.session.user
    });
  } catch (error) {
    console.error('Landlord dashboard error:', error);
    res.status(500).send('Error loading landlord dashboard');
  }
};

exports.renderNotifications = async (req, res) => {
  try {
    const landlordId = req.session.user.id;
    const notifications = await Notification.findByUser(landlordId, 50);

    res.render('landlord/notifications', {
      title: 'Notifications | HomeFinder',
      notifications,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.redirect('/landlord/dashboard');
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const landlordId = req.session.user.id;
    await Notification.markAsRead(id, landlordId);

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true });
    }
    res.redirect('/landlord/notifications');
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.redirect('/landlord/notifications');
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const landlordId = req.session.user.id;
    await Notification.markAllAsRead(landlordId);
    res.redirect('/landlord/notifications');
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.redirect('/landlord/notifications');
  }
};
