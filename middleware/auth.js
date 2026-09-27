function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) {
    return next();
  }

  const nextUrl = encodeURIComponent(req.originalUrl || '/landlord/properties/add');
  return res.redirect(`/login?next=${nextUrl}`);
}

module.exports = ensureAuthenticated;
