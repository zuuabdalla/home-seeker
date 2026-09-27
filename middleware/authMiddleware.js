function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    return next();
  }
  const nextUrl = encodeURIComponent(req.originalUrl || '/');
  return res.redirect(`/login?next=${nextUrl}`);
}

function ensureLandlordOrAgent(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    const role = req.session.user.role;
    if (role === 'landlord' || role === 'agent' || role === 'admin') {
      return next();
    }
    return res.status(403).render('partials/alerts', {
      title: 'Access Denied',
      errorMessage: 'This area is restricted to landlords and property agents.',
      backUrl: '/'
    });
  }
  const nextUrl = encodeURIComponent(req.originalUrl || '/landlord/dashboard');
  return res.redirect(`/login?next=${nextUrl}`);
}

module.exports = {
  ensureAuthenticated,
  ensureLandlordOrAgent
};
