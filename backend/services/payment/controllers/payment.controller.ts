// backend/services/payment/controllers/payment.controller.ts
// Example: How to integrate PaymentRouter into existing payment flow

import { Router, Request, Response } from 'express';
import { getGateway, validateAmountForGateway, calculateFee, GATEWAY_CONFIG } from '../PaymentRouter';
import * as iyzicoService from '../gateways/iyzico.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const exchangeRateSvc  = require('../src/services/exchangeRate.service');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const stcpayGateway    = require('../src/gateways/stcpay.gateway');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const stripeGateway    = require('../src/gateways/stripe.gateway');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const midtransGateway  = require('../src/gateways/midtrans.gateway');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ipay88Gateway    = require('../src/gateways/ipay88.gateway');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const razorpayGateway  = require('../src/gateways/razorpay.gateway');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jazzcashGateway  = require('../src/gateways/jazzcash.gateway');

const router = Router();

/**
 * POST /api/v1/payment/process
 *
 * Body:
 * {
 *   userId: string,
 *   bookingId: string,
 *   countryCode: string,    // User's country (SA, TR, ID, etc.)
 *   amountInSAR: number,     // Amount in user's local currency
 *   currency: string,        // SAR, TRY, IDR, etc.
 *   gatewayOverride?: string // (optional) force specific gateway
 * }
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    const { userId, bookingId, countryCode, amountInSAR, currency, gatewayOverride } = req.body;

    // Validate input
    if (!userId || !bookingId || !countryCode || !amountInSAR) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Step 1: Determine gateway
    const gateway = gatewayOverride || getGateway(countryCode);
    console.log(`[Payment] User=${userId}, Country=${countryCode}, Gateway=${gateway}`);

    // Step 2: Convert to USD for processing
    const exchangeRate = await getExchangeRate(currency, 'USD');
    const amountInUSD = amountInSAR / exchangeRate;

    // Step 3: Validate amount
    const validation = validateAmountForGateway(gateway, amountInUSD);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        gateway,
        availableGateways: getAvailableGateways(countryCode),
      });
    }

    // Step 4: Calculate fees
    const fee = calculateFee(gateway, amountInUSD);
    const totalInUSD = amountInUSD + fee;

    // Step 5: Route to correct payment processor
    let paymentResult;
    switch (gateway) {
      case 'stcpay':
        paymentResult = await processStcPay(userId, bookingId, amountInSAR, currency);
        break;

      case 'stripe':
        paymentResult = await processStripe(userId, bookingId, totalInUSD, currency);
        break;

      case 'iyzico':
        paymentResult = await processIyzico(userId, bookingId, totalInUSD, currency, req);
        break;

      case 'midtrans':
        paymentResult = await processMidtrans(userId, bookingId, totalInUSD, currency);
        break;

      case 'ipay88':
        paymentResult = await processIpay88(userId, bookingId, totalInUSD, currency);
        break;

      case 'razorpay':
        paymentResult = await processRazorpay(userId, bookingId, totalInUSD, currency);
        break;

      case 'jazzcash':
        paymentResult = await processJazzcash(userId, bookingId, totalInUSD, currency);
        break;

      default:
        return res.status(400).json({ error: `Unknown gateway: ${gateway}` });
    }

    // Step 6: Record transaction
    await recordTransaction(userId, bookingId, gateway, amountInUSD, fee, paymentResult);

    // Step 7: Trigger push notification on success
    if (paymentResult.status === 'completed') {
      await triggerPushNotification(userId, 'booking_confirmed', {
        ref: bookingId,
        amount: amountInSAR.toFixed(2),
      });
    }

    return res.json({
      success: true,
      transactionId: paymentResult.transactionId,
      gateway,
      amountInUSD,
      fee,
      status: paymentResult.status,
    });
  } catch (error) {
    console.error('[Payment Error]', error);
    return res.status(500).json({ error: 'Payment processing failed' });
  }
});

/**
 * GET /api/v1/payment/available-gateways?countryCode=TR
 * Returns available payment methods for a country
 */
router.get('/available-gateways', (req: Request, res: Response) => {
  const { countryCode } = req.query as { countryCode: string };

  if (!countryCode) {
    return res.status(400).json({ error: 'countryCode required' });
  }

  const gateway = getGateway(countryCode);
  const config = GATEWAY_CONFIG[gateway];

  return res.json({
    countryCode,
    primaryGateway: gateway,
    displayName: getGatewayDisplayName(gateway),
    fee: config.fee,
    minAmount: config.minAmount,
    maxAmount: config.maxAmount,
    currency: getCurrencyForGateway(gateway),
  });
});

/**
 * Webhook endpoint for all payment gateways
 * Each gateway sends confirmation here
 */
router.post('/webhook/:gateway', async (req: Request, res: Response) => {
  const { gateway } = req.params;
  const signature = req.headers['x-signature'] as string;

  try {
    // Verify webhook signature
    const verified = verifyWebhookSignature(gateway, req.body, signature);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Handle webhook based on gateway
    let webhookData;
    switch (gateway) {
      case 'stcpay':
        webhookData = parseStcPayWebhook(req.body);
        break;
      case 'stripe':
        webhookData = parseStripeWebhook(req.body);
        break;
      case 'iyzico':
        webhookData = parseIyzicoWebhook(req.body);
        break;
      case 'midtrans':
        webhookData = parseMidtransWebhook(req.body);
        break;
      case 'ipay88':
        webhookData = parseIpay88Webhook(req.body);
        break;
      case 'razorpay':
        webhookData = parseRazorpayWebhook(req.body);
        break;
      case 'jazzcash':
        webhookData = parseJazzcashWebhook(req.body);
        break;
      default:
        return res.status(400).json({ error: `Unknown gateway: ${gateway}` });
    }

    // Update booking status
    await updateBookingStatus(webhookData.bookingId, webhookData.status);

    // Trigger notifications
    if (webhookData.status === 'completed') {
      await triggerPushNotification(webhookData.userId, 'booking_confirmed', {
        ref: webhookData.bookingId,
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error(`[Webhook Error] ${gateway}:`, error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// --- Helper Functions (Stubs) ---
// These delegate to existing gateway-specific implementations

/**
 * Returns how many units of `from` equal 1 USD.
 * Used by the caller as: amountInUSD = amountLocal / getExchangeRate(localCurrency, 'USD')
 * e.g. getExchangeRate('SAR', 'USD') → 3.75  →  375 SAR / 3.75 = 100 USD
 */
async function getExchangeRate(from: string, _to: string): Promise<number> {
  try {
    // getRate('USD', from, 1) = how many `from` per 1 USD (e.g. 3.75 for SAR)
    const rate = await exchangeRateSvc.getRate('USD', from, 1);
    return (rate as number) || 1.0;
  } catch {
    console.error(`[FX] Failed to get rate USD→${from}, falling back to 1.0`);
    return 1.0;
  }
}

async function processStcPay(userId: string, bookingId: string, amount: number, currency: string) {
  // amount is in SAR (STC Pay only operates in SAR)
  const sarRate   = await getExchangeRate('SAR', 'USD');
  const amountSAR = amount * sarRate;
  const booking   = await getBookingDetails(bookingId);

  const result = await stcpayGateway.initiatePayment({
    bookingId,
    amount:     amountSAR,
    currency:   'SAR',
    mobileNumber: booking?.phone,
  });

  return {
    transactionId: result.stcPayRef,
    paymentUrl:    result.paymentUrl,
    status:        'pending',
  };
}

async function processStripe(userId: string, bookingId: string, amount: number, currency: string) {
  // amount is already in USD from the main handler
  const result = await stripeGateway.createPaymentIntent({
    bookingId,
    amount,
    currency:    'USD',
    description: `UTUBooking hotel booking ${bookingId}`,
  });

  return {
    transactionId: result.paymentIntentId,
    clientSecret:  result.clientSecret,
    status:        result.status === 'succeeded' ? 'completed' : 'pending',
  };
}

async function processIyzico(
  userId: string, bookingId: string, amount: number, currency: string,
  req: Request
) {
  try {
    const booking   = await getBookingDetails(bookingId);
    const email     = booking?.email     || 'customer@example.com';
    const phone     = booking?.phone     || '+90 555 000 0000';
    const firstName = booking?.firstName || 'UTU';
    const lastName  = booking?.lastName  || 'Guest';
    const ipAddress = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim()
      || req.socket?.remoteAddress
      || '127.0.0.1';

    // Call iyzico service
    const result = await iyzicoService.createPayment({
      userId,
      bookingId,
      amountInUSD: amount,
      email,
      phone,
      firstName,
      lastName,
      ipAddress,
      currency: 'USD',
      cardToken: undefined, // Checkout Form flow — token comes from iyzico callback
    });

    return {
      transactionId: result.transactionId,
      paymentId: result.paymentId,
      status: result.status === 'success' ? 'completed' : 'failed',
      errorMessage: result.errorMessage,
    };
  } catch (error) {
    console.error('[iyzico] Payment processing error:', error);
    return {
      transactionId: bookingId,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Payment failed',
    };
  }
}

async function processMidtrans(userId: string, bookingId: string, amount: number, currency: string) {
  // amount is in USD — convert to IDR for Midtrans
  const idrRate   = await getExchangeRate('IDR', 'USD');   // IDR per 1 USD
  const amountIDR = Math.round(amount * idrRate);
  const booking   = await getBookingDetails(bookingId);

  const result = await midtransGateway.createTransaction({
    bookingId,
    amount:         amountIDR,
    currency:       'IDR',
    customerName:   booking ? `${booking.firstName} ${booking.lastName}` : undefined,
    customerEmail:  booking?.email,
    customerPhone:  booking?.phone,
  });

  return {
    transactionId: result.token,         // Snap token — frontend opens Snap.js popup
    snapToken:     result.token,
    redirectUrl:   result.redirectUrl,
    status:        'pending',
  };
}

async function processIpay88(userId: string, bookingId: string, amount: number, currency: string) {
  // amount is in USD — convert to MYR for iPay88
  const myrRate   = await getExchangeRate('MYR', 'USD');
  const amountMYR = (amount * myrRate).toFixed(2);
  const booking   = await getBookingDetails(bookingId);

  const result = ipay88Gateway.initiatePayment({
    bookingId,
    amount:        amountMYR,
    currency:      'MYR',
    customerName:  booking ? `${booking.firstName} ${booking.lastName}` : undefined,
    customerEmail: booking?.email,
    customerPhone: booking?.phone,
  });

  return {
    transactionId: bookingId,            // RefNo — iPay88 uses bookingId as reference
    paymentUrl:    result.paymentUrl,    // frontend POSTs formParams to this URL
    formParams:    result.formParams,
    status:        'pending',
  };
}

async function processRazorpay(userId: string, bookingId: string, amount: number, currency: string) {
  // amount is in USD — convert to INR for Razorpay
  const inrRate   = await getExchangeRate('INR', 'USD');
  const amountINR = amount * inrRate;
  const booking   = await getBookingDetails(bookingId);

  const result = await razorpayGateway.createOrder({
    bookingId,
    amount:   amountINR,
    currency: 'INR',
    notes:    { userId, email: booking?.email ?? '' },
  });

  return {
    transactionId: result.orderId,   // Razorpay order ID — passed to Checkout widget
    orderId:       result.orderId,
    keyId:         result.keyId,
    amountPaise:   result.amountPaise,
    emiOptions:    result.emiOptions,
    status:        'pending',
  };
}

async function processJazzcash(userId: string, bookingId: string, amount: number, currency: string) {
  // amount is in USD — convert to PKR for JazzCash
  const pkrRate   = await getExchangeRate('PKR', 'USD');
  const amountPKR = amount * pkrRate;
  const booking   = await getBookingDetails(bookingId);

  if (!booking?.phone) {
    console.warn(`[JazzCash] No mobile number for booking ${bookingId} — cannot initiate MPAY`);
    return { transactionId: bookingId, status: 'failed', errorMessage: 'Mobile number required for JazzCash' };
  }

  const result = await jazzcashGateway.initiateMobileWalletPayment({
    bookingId,
    amount:       amountPKR,
    mobileNumber: booking.phone,
    description:  `UTUBooking ref ${bookingId}`,
  });

  return {
    transactionId: result.txnRefNo,
    status:        result.status === 'success' ? 'pending' : 'failed',
    errorMessage:  result.status !== 'success' ? result.jazzCashResponse?.pp_ResponseMessage : undefined,
  };
}

async function recordTransaction(
  userId: string,
  bookingId: string,
  gateway: string,
  amount: number,
  fee: number,
  result: any
) {
  // Store in database (existing transaction table)
  console.log(`[Transaction] User=${userId}, Booking=${bookingId}, Gateway=${gateway}, Amount=$${amount}`);
}

async function triggerPushNotification(userId: string, trigger: string, vars: Record<string, string>) {
  // Call existing push notification service
  console.log(`[Push] User=${userId}, Trigger=${trigger}`);
}

async function updateBookingStatus(bookingId: string, status: string) {
  console.log(`[Booking] ${bookingId} -> ${status}`);
}

function verifyWebhookSignature(gateway: string, body: any, signature: string): boolean {
  // Verify based on gateway-specific secret
  if (gateway === 'iyzico') {
    const secretKey = process.env.IYZICO_SECRET_KEY;
    if (!secretKey) {
      console.warn('[iyzico] IYZICO_SECRET_KEY not configured');
      return false;
    }
    return iyzicoService.verifyWebhookSignature(
      JSON.stringify(body),
      signature,
      secretKey
    );
  }
  return true; // stub for other gateways
}

function parseStcPayWebhook(body: any) {
  return { bookingId: body.bookingId, userId: body.userId, status: body.status };
}

function parseStripeWebhook(body: any) {
  return { bookingId: body.metadata.bookingId, userId: body.metadata.userId, status: 'completed' };
}

function parseIyzicoWebhook(body: any) {
  // Use iyzico service's webhook parser
  const webhookData = iyzicoService.parseWebhook(body);
  // conversationId == bookingId; userId is looked up from booking service at notification time
  return {
    bookingId: webhookData.bookingId,
    userId: body.conversationId, // resolve to userId via booking service downstream
    status: webhookData.status === 'success' ? 'completed' : 'failed',
  };
}

function parseMidtransWebhook(body: any) {
  return { bookingId: body.order_id, userId: body.custom_field1, status: 'completed' };
}

function parseIpay88Webhook(body: any) {
  return { bookingId: body.RefNo, userId: body.Param1, status: 'completed' };
}

function parseRazorpayWebhook(body: any) {
  return { bookingId: body.notes.bookingId, userId: body.notes.userId, status: 'completed' };
}

function parseJazzcashWebhook(body: any) {
  return { bookingId: body.pp_TxnRefNo, userId: body.pp_CustomerId, status: 'completed' };
}

function getGatewayDisplayName(gateway: string): string {
  const names: Record<string, string> = {
    stcpay: 'STC Pay',
    stripe: 'Credit/Debit Card',
    iyzico: 'Iyzico',
    midtrans: 'Midtrans',
    ipay88: 'iPay88',
    razorpay: 'Razorpay',
    jazzcash: 'JazzCash',
  };
  return names[gateway] || gateway;
}

function getCurrencyForGateway(gateway: string): string {
  const currencies: Record<string, string> = {
    stcpay: 'SAR',
    stripe: 'USD',
    iyzico: 'TRY',
    midtrans: 'IDR',
    ipay88: 'MYR',
    razorpay: 'INR',
    jazzcash: 'PKR',
  };
  return currencies[gateway] || 'USD';
}

function getAvailableGateways(countryCode: string): string[] {
  const gateway = getGateway(countryCode);
  return [gateway, 'stripe'].filter((g, i, arr) => arr.indexOf(g) === i);
}

interface BookingDetails {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
}

const BOOKING_SERVICE = process.env.INTERNAL_BOOKING_SERVICE_URL ?? 'http://booking-service:3006';

async function getBookingDetails(bookingId: string): Promise<BookingDetails | null> {
  try {
    const res = await fetch(
      `${BOOKING_SERVICE}/api/v1/bookings/${bookingId}/contact`,
      {
        headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '' },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) return null;
    return await res.json() as BookingDetails;
  } catch {
    return null;
  }
}

export default router;
