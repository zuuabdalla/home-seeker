const User = require('../models/User');

exports.renderLogin = (req, res) => {
  if (req.session.user) {
    if (req.session.user.role === 'admin') return res.redirect('/admin/dashboard');
    return res.redirect('/landlord/dashboard');
  }

  res.render('auth/login', {
    title: 'Login to HomeFinder',
    next: req.query.next || '',
    error: req.query.error || null,
    success: req.query.success || null,
    user: null
  });
};

exports.login = async (req, res) => {
  const { email, password, next } = req.body;

  if (!email || !password) {
    return res.render('auth/login', {
      title: 'Login to HomeFinder',
      error: 'Please enter both your email and password.',
      next: next || '',
      success: null,
      user: null
    });
  }

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.render('auth/login', {
        title: 'Login to HomeFinder',
        error: 'Invalid email or password.',
        next: next || '',
        success: null,
        user: null
      });
    }

    if (!user.is_active) {
      return res.render('auth/login', {
        title: 'Login to HomeFinder',
        error: 'Your account has been deactivated. Please contact support.',
        next: next || '',
        success: null,
        user: null
      });
    }

    const isMatch = await User.verifyPassword(password, user.password);
    if (!isMatch) {
      return res.render('auth/login', {
        title: 'Login to HomeFinder',
        error: 'Invalid email or password.',
        next: next || '',
        success: null,
        user: null
      });
    }

    // Set user session
    req.session.user = {
      id: user.id,
      name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.profile_image,
      is_verified: user.is_verified
    };

    if (next && next.startsWith('/')) {
      return res.redirect(next);
    }

    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/landlord/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    return res.render('auth/login', {
      title: 'Login to HomeFinder',
      error: 'An unexpected error occurred. Please try again.',
      next: next || '',
      success: null,
      user: null
    });
  }
};

exports.renderRegister = (req, res) => {
  if (req.session.user) {
    return res.redirect('/landlord/dashboard');
  }

  res.render('auth/register', {
    title: 'Register as Landlord or Agent',
    error: null,
    formData: {},
    user: null
  });
};

exports.register = async (req, res) => {
  const { full_name, email, phone, password, confirm_password, role, bio } = req.body;

  if (!full_name || !email || !phone || !password) {
    return res.render('auth/register', {
      title: 'Register as Landlord or Agent',
      error: 'Please fill in all required fields.',
      formData: req.body,
      user: null
    });
  }

  if (password.length < 6) {
    return res.render('auth/register', {
      title: 'Register as Landlord or Agent',
      error: 'Password must be at least 6 characters long.',
      formData: req.body,
      user: null
    });
  }

  if (password !== confirm_password) {
    return res.render('auth/register', {
      title: 'Register as Landlord or Agent',
      error: 'Passwords do not match.',
      formData: req.body,
      user: null
    });
  }

  try {
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.render('auth/register', {
        title: 'Register as Landlord or Agent',
        error: 'An account with this email already exists.',
        formData: req.body,
        user: null
      });
    }

    const existingPhone = await User.findByPhone(phone);
    if (existingPhone) {
      return res.render('auth/register', {
        title: 'Register as Landlord or Agent',
        error: 'An account with this phone number already exists.',
        formData: req.body,
        user: null
      });
    }

    const userRole = role === 'agent' ? 'agent' : 'landlord';
    const newUser = await User.create({
      full_name,
      email,
      phone,
      password,
      role: userRole,
      bio
    });

    req.session.user = {
      id: newUser.id,
      name: newUser.full_name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      avatar: newUser.profile_image,
      is_verified: newUser.is_verified
    };

    return res.redirect('/landlord/dashboard?welcome=1');
  } catch (error) {
    console.error('Registration error:', error);
    return res.render('auth/register', {
      title: 'Register as Landlord or Agent',
      error: 'Registration failed. Please check your details and try again.',
      formData: req.body,
      user: null
    });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/');
  });
};

exports.renderForgotPassword = (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password | HomeFinder',
    message: null,
    error: null,
    user: req.session.user || null
  });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.render('auth/forgot-password', {
      title: 'Forgot Password | HomeFinder',
      error: 'Please enter your registered email address.',
      message: null,
      user: null
    });
  }

  // In production this would dispatch an email with a signed token
  return res.render('auth/forgot-password', {
    title: 'Forgot Password | HomeFinder',
    message: 'If an account exists with that email, a password reset link has been dispatched to your inbox.',
    error: null,
    user: null
  });
};

exports.renderProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    res.render('auth/profile', {
      title: 'My Profile | HomeFinder',
      profileUser: user,
      user: req.session.user,
      success: req.query.success || null,
      error: null
    });
  } catch (err) {
    res.redirect('/landlord/dashboard');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone, bio, current_password, new_password } = req.body;
    const userId = req.session.user.id;

    const currentUser = await User.findById(userId);

    const updateData = {
      full_name,
      phone,
      bio
    };

    if (req.file) {
      updateData.profile_image = `/uploads/profiles/${req.file.filename}`;
    }

    if (new_password) {
      if (!current_password) {
        return res.render('auth/profile', {
          title: 'My Profile | HomeFinder',
          profileUser: currentUser,
          user: req.session.user,
          error: 'Current password is required to change password.',
          success: null
        });
      }
      const isMatch = await User.verifyPassword(current_password, currentUser.password);
      if (!isMatch) {
        return res.render('auth/profile', {
          title: 'My Profile | HomeFinder',
          profileUser: currentUser,
          user: req.session.user,
          error: 'Current password does not match.',
          success: null
        });
      }
      updateData.password = new_password;
    }

    const updated = await User.update(userId, updateData);

    req.session.user.name = updated.full_name;
    req.session.user.phone = updated.phone;
    if (updated.profile_image) {
      req.session.user.avatar = updated.profile_image;
    }

    return res.redirect('/profile?success=Profile updated successfully');
  } catch (err) {
    console.error('Update profile error:', err);
    res.redirect('/profile?error=Failed to update profile');
  }
};
