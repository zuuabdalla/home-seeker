function adminAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted to administrators only.'
    });
  }

  const nextUrl = encodeURIComponent(req.originalUrl || '/admin/dashboard');
  return res.redirect(`/admin/login?next=${nextUrl}`);
}

module.exports = {
  adminAuth
};
