const Payment = require('../models/Payment');
const Property = require('../models/Property');
const Promotion = require('../models/Promotion');
const PayHeroService = require('../services/payheroService');

exports.renderPromotions = async (req, res) => {
  try {
    const landlordId = req.session.user.id;
    const properties = await Property.findAll({
      landlord_id: landlordId,
      verification_status: 'approved',
      limit: 100
    });
    const promotions = await Promotion.findByLandlord(landlordId);

    res.render('landlord/promotions', {
      title: 'Promote Property | Landlord Portal',
      properties,
      promotions,
      packages: Payment.PACKAGES,
      user: req.session.user,
      selectedPropertyId: req.query.property_id || null,
      statusMessage: req.query.status || null
    });
  } catch (error) {
    console.error('Error rendering promotions page:', error);
    res.redirect('/landlord/dashboard');
  }
};

exports.getLandlordPayments = async (req, res) => {
  try {
    const landlordId = req.session.user.id;
    const payments = await Payment.findByLandlord(landlordId);

    res.render('landlord/payments', {
      title: 'Payment History | Landlord Portal',
      payments,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.redirect('/landlord/dashboard');
  }
};

exports.createPayment = async (req, res) => {
  const landlordId = req.session.user.id;
  const { property_id, package_type, phone_number } = req.body;

  if (!property_id || !package_type || !phone_number) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, message: 'Please select a property, promotion package, and provide your M-Pesa phone number.' });
    }
    return res.redirect('/landlord/promotions?status=missing_fields');
  }

  // 1. Backend determines package price - NEVER TRUST BROWSER AMOUNT
  const packageDetails = Payment.getPackageDetails(package_type);
  if (!packageDetails) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, message: 'Invalid promotion package selected.' });
    }
    return res.redirect('/landlord/promotions?status=invalid_package');
  }

  try {
    // 2. Validate property ownership
    const property = await Property.findById(property_id);
    if (!property || (property.landlord_id !== landlordId && req.session.user.role !== 'admin')) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You can only promote your own properties.' });
      }
      return res.redirect('/landlord/promotions?status=unauthorized');
    }

    // 3. Generate unique external reference
    const externalReference = PayHeroService.generateReference('HF-PROMO');

    // 4. Create pending payment in DB
    const pendingPayment = await Payment.create({
      user_id: landlordId,
      property_id: property.id,
      amount: packageDetails.price,
      package_name: packageDetails.name,
      phone_number,
      external_reference: externalReference
    });

    // 5. Initiate PayHero STK Push
    const stkResult = await PayHeroService.initiateStkPush({
      amount: packageDetails.price,
      phone: phone_number,
      reference: externalReference,
      description: `HomeFinder: ${packageDetails.name} for ${property.title.slice(0, 20)}`
    });

    if (stkResult.is_mock) {
      // In sandbox mode, auto-complete for test convenience
      await Payment.completePayment(pendingPayment.id, {
        transaction_reference: 'MPESA_SIM_' + Date.now().toString().slice(-6),
        payhero_reference: stkResult.checkout_request_id,
        callback_data: { simulated: true, note: 'PayHero Sandbox simulation' }
      });
    }

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(200).json({
        success: true,
        message: stkResult.is_mock
          ? 'Sandbox test: Payment simulated and property promoted successfully!'
          : 'M-Pesa STK Push sent! Please check your phone and enter your M-Pesa PIN.',
        reference: externalReference,
        is_mock: stkResult.is_mock
      });
    }

    return res.redirect(`/landlord/promotions?status=${stkResult.is_mock ? 'promoted_success' : 'stk_sent'}`);
  } catch (error) {
    console.error('Payment creation error:', error);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Payment initiation failed: ' + error.message });
    }
    return res.redirect('/landlord/promotions?status=payment_failed');
  }
};

exports.payheroCallback = async (req, res) => {
  // Idempotent callback processing
  console.log('Received PayHero M-Pesa Callback:', JSON.stringify(req.body));

  try {
    const verified = PayHeroService.verifyCallback(req.body);

    if (!verified.valid || !verified.externalReference) {
      return res.status(400).json({ success: false, message: 'Invalid callback payload' });
    }

    const payment = await Payment.findByExternalReference(verified.externalReference);

    if (!payment) {
      console.warn(`Payment with reference ${verified.externalReference} not found.`);
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    // Check if already completed (idempotent)
    if (payment.status === 'completed') {
      console.log(`Payment ${payment.id} already marked completed. Skipping re-processing.`);
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    if (verified.status === 'completed') {
      await Payment.completePayment(payment.id, {
        transaction_reference: verified.transactionReference,
        payhero_reference: verified.payheroReference,
        callback_data: verified.raw
      });
      console.log(`Payment ${payment.id} successfully completed via callback.`);
    } else {
      await Payment.markFailed(payment.id, verified.raw);
      console.log(`Payment ${payment.id} marked failed via callback.`);
    }

    return res.status(200).json({ success: true, message: 'Callback processed' });
  } catch (error) {
    console.error('PayHero callback error:', error);
    return res.status(500).json({ success: false, message: 'Callback processing error' });
  }
};
