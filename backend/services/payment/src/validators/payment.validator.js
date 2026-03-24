const Joi = require('joi');

const uuid   = Joi.string().uuid({ version: 'uuidv4' }).required();
const amount = Joi.number().positive().precision(2).required();

// Legacy GCC/MENA currencies
const currency = Joi.string().valid('SAR', 'AED', 'USD').default('SAR');

// All supported currencies across all markets
const anyCurrency = Joi.string().valid(
  // Middle East
  'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'MAD', 'TND', 'EGP',
  // Europe
  'EUR', 'GBP', 'PLN', 'SEK', 'NOK', 'DKK', 'CHF', 'CZK', 'HUF', 'RON', 'BGN',
  // Americas
  'USD', 'CAD', 'BRL', 'ARS', 'MXN', 'COP', 'CLP', 'PEN',
  // Asia-Pacific
  'TRY', 'IDR', 'MYR', 'PKR', 'INR', 'BDT', 'SGD', 'THB', 'PHP', 'AUD', 'NZD',
).default('USD');

const httpsUrl     = Joi.string().uri({ scheme: ['https'] }).optional();
const countryCode  = Joi.string().length(2).uppercase().optional();

// ─── STC Pay: initiate ────────────────────────────────────────────────────────
// Ref: backend/docs/stcpay-api.md § Request – Payment Initiation
// Amount accepted as SAR decimal; gateway converts to fils (× 100) internally.
const stcpayInitiateSchema = Joi.object({
  bookingId:  uuid,
  amount,
  currency,
  successUrl: httpsUrl,  // optional redirect on payment success
  failureUrl: httpsUrl,  // optional redirect on payment failure
}).options({ stripUnknown: true });

// ─── Moyasar Mada: charge ─────────────────────────────────────────────────────
const madaChargeSchema = Joi.object({
  bookingId:   uuid,
  amount,
  currency,
  description: Joi.string().max(255).optional(),
  source: Joi.object({
    type:  Joi.string().valid('mada').required(),
    token: Joi.string().required(),  // token from Moyasar.js
    name:  Joi.string().max(100).required(),
    month: Joi.string().pattern(/^\d{2}$/).required(),
    year:  Joi.string().pattern(/^\d{2}$/).required(),
  }).required(),
}).options({ stripUnknown: true });

// ─── Stripe: initiate (legacy card-only flow — GCC/MENA) ──────────────────────
const stripeInitiateSchema = Joi.object({
  bookingId:   uuid,
  amount,
  currency:    Joi.string().valid('SAR', 'AED', 'USD', 'EUR', 'GBP').default('SAR'),
  description: Joi.string().max(255).optional(),
}).options({ stripUnknown: true });

// ─── Stripe Payment Element: initiate (EU/global — automatic_payment_methods) ─
// Supports all EU currencies; method (iDEAL, SEPA, Bancontact, BLIK, etc.)
// is resolved by Stripe at checkout time based on currency + customer location.
const stripeElementSchema = Joi.object({
  bookingId:   uuid,
  amount,
  currency:    anyCurrency,
  description: Joi.string().max(255).optional(),
  countryCode,                    // 2-letter ISO; stored in metadata for analytics
}).options({ stripUnknown: true });

// ─── TWINT: initiate (Switzerland — CHF) ──────────────────────────────────────
const twintInitiateSchema = Joi.object({
  bookingId:    uuid,
  amount,
  currency:     Joi.string().valid('CHF').default('CHF'),
  description:  Joi.string().max(255).optional(),
  merchantRef:  Joi.string().max(50).optional(), // optional internal ref
}).options({ stripUnknown: true });

// ─── JazzCash: initiate ───────────────────────────────────────────────────────
// Pakistan mobile format: 11 digits starting with 03 (hyphens/spaces stripped)
const pkMobile = Joi.string()
  .pattern(/^03\d{9}$/)
  .required()
  .messages({ 'string.pattern.base': 'mobileNumber must be a valid Pakistan mobile number (03xxxxxxxxx)' });

const jazzcashInitiateSchema = Joi.object({
  bookingId:    uuid,
  amount:       Joi.number().positive().precision(2).required(),
  mobileNumber: pkMobile,
  description:  Joi.string().max(255).optional(),
}).options({ stripUnknown: true });

// ─── Easypaisa: initiate ──────────────────────────────────────────────────────
const easypaisaInitiateSchema = Joi.object({
  bookingId:    uuid,
  amount:       Joi.number().positive().precision(2).required(),
  mobileNumber: pkMobile,
  description:  Joi.string().max(255).optional(),
}).options({ stripUnknown: true });

// ─── PayPal: initiate ─────────────────────────────────────────────────────────
const paypalInitiateSchema = Joi.object({
  bookingId:   uuid,
  amount,
  currency:    anyCurrency,
  description: Joi.string().max(255).optional(),
  returnUrl:   httpsUrl,  // where PayPal redirects on approval (optional — falls back to FRONTEND_URL)
  cancelUrl:   httpsUrl,  // where PayPal redirects on cancellation
}).options({ stripUnknown: true });

// ─── PayPal: capture ──────────────────────────────────────────────────────────
const paypalCaptureSchema = Joi.object({
  orderId:   Joi.string().required(),                         // PayPal order ID from createOrder()
  paymentId: Joi.string().uuid({ version: 'uuidv4' }).optional(), // our internal payment UUID (fallback lookup)
}).options({ stripUnknown: true });

// ─── Affirm BNPL: initiate ────────────────────────────────────────────────────
// amountUSD is in major USD units (e.g. 249.99), NOT cents.
// Minimum enforced in controller: $200 (UTUBooking policy)
const affirmInitiateSchema = Joi.object({
  bookingId:     uuid,
  amountUSD:     Joi.number().positive().precision(2).required(),
  description:   Joi.string().max(255).optional(),
  confirmUrl:    httpsUrl,   // Affirm redirects here with ?checkout_token= on approval
  cancelUrl:     httpsUrl,   // Affirm redirects here on cancellation
  customerEmail: Joi.string().email().optional(),
}).options({ stripUnknown: true });

// ─── Affirm BNPL: confirm ─────────────────────────────────────────────────────
const affirmConfirmSchema = Joi.object({
  checkoutToken: Joi.string().required(),                           // from Affirm redirect ?checkout_token=
  paymentId:     Joi.string().uuid({ version: 'uuidv4' }).optional(), // fallback lookup
}).options({ stripUnknown: true });

// ─── Helper ───────────────────────────────────────────────────────────────────
function validate(schema, data) {
  return schema.validate(data, { abortEarly: false });
}

module.exports = {
  stcpayInitiateSchema,
  madaChargeSchema,
  stripeInitiateSchema,
  stripeElementSchema,
  twintInitiateSchema,
  jazzcashInitiateSchema,
  easypaisaInitiateSchema,
  paypalInitiateSchema,
  paypalCaptureSchema,
  affirmInitiateSchema,
  affirmConfirmSchema,
  validate,
};
