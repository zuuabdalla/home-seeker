const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const PAYHERO_API_URL = process.env.PAYHERO_API_URL || 'https://backend.payhero.co.ke/api/v2';

const PayHeroService = {
  formatPhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = phone.toString().replace(/[\s\-\+]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (!cleaned.startsWith('254') && cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  },

  generateReference(prefix = 'HF') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  },

  async initiateStkPush({ amount, phone, reference, description = 'HomeFinder Property Promotion' }) {
    const username = process.env.PAYHERO_USERNAME;
    const password = process.env.PAYHERO_PASSWORD;
    const channelId = process.env.PAYHERO_CHANNEL_ID;
    const callbackUrl = process.env.PAYHERO_CALLBACK_URL || 'http://localhost:5000/payments/callback';

    const formattedPhone = this.formatPhoneNumber(phone);

    // If PayHero credentials are not configured, simulate sandbox success response
    if (!username || !password || !channelId || username === 'YOUR_PAYHERO_USERNAME') {
      console.warn('PayHero credentials not configured in .env. Running in Sandbox / Simulation Mode.');
      return {
        success: true,
        is_mock: true,
        message: 'STK push simulated successfully (Sandbox Mode)',
        reference,
        external_reference: reference,
        checkout_request_id: `ws_CO_${Date.now()}_MOCK`,
        status: 'pending'
      };
    }

    try {
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      const response = await axios.post(
        `${PAYHERO_API_URL}/payments`,
        {
          amount: Number(amount),
          phone_number: formattedPhone,
          channel_id: parseInt(channelId, 10),
          provider: 'm-pesa',
          external_reference: reference,
          callback_url: callbackUrl,
          purpose: description
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`
          },
          timeout: 15000
        }
      );

      return {
        success: true,
        is_mock: false,
        data: response.data,
        reference,
        external_reference: reference
      };
    } catch (error) {
      console.error('PayHero STK push error:', error.response ? error.response.data : error.message);
      // If external API fails (e.g. invalid test creds), provide fallback response with helpful message
      return {
        success: false,
        error: error.response ? (error.response.data.message || error.response.data) : error.message,
        reference
      };
    }
  },

  verifyCallback(body) {
    if (!body) return { valid: false, message: 'Empty callback body' };

    // Standard PayHero callback verification
    const externalReference = body.external_reference || body.reference || (body.response && body.response.external_reference);
    const status = (body.status || (body.response && body.response.status) || '').toLowerCase();
    const mpesaCode = body.mpesa_reference || body.transaction_id || (body.response && body.response.mpesa_reference) || 'MPESA' + Date.now();

    const isSuccess = status === 'success' || status === 'successful' || status === 'completed';

    return {
      valid: true,
      externalReference,
      status: isSuccess ? 'completed' : 'failed',
      transactionReference: mpesaCode,
      payheroReference: body.payhero_reference || body.checkout_request_id || null,
      raw: body
    };
  }
};

module.exports = PayHeroService;
