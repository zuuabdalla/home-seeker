const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const propertyRoutes = require('./routes/propertyRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'homefinder-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || {
    id: 101,
    name: 'Akinyi Kamau',
    role: 'landlord',
  };
  next();
});

app.get('/login', (req, res) => {
  if (!req.session.user) {
    req.session.user = {
      id: 101,
      name: 'Akinyi Kamau',
      role: 'landlord',
    };
  }

  res.redirect('/landlord/properties/add');
});

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/landlord/properties/add');
  }

  res.render('home', {
    title: 'HomeFinder | Find a Place You Can Call Home',
    user: req.session.user || null,
  });
});

app.use(propertyRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong while processing your request.',
  });
});

app.listen(PORT, () => {
  console.log(`HomeFinder app listening at http://localhost:${PORT}`);
});
