// backend/services/payment/controllers/payment.controller.ts
// Example: How to integrate PaymentRouter into existing payment flow

import { Router, Request, Response } from 'express';
import { getGateway, validateAmountForGateway, calculateFee, GATEWAY_CONFIG } from '../PaymentRouter';
import * as iyzicoService from '../gateways/iyzico.service';

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
        paymentResult = await processIyzico(userId, bookingId, totalInUSD, currency);
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

async function getExchangeRate(from: string, to: string): Promise<number> {
  // Call existing FX service
  return 1.0; // stub
}

async function processStcPay(userId: string, bookingId: string, amount: number, currency: string) {
  // Delegate to existing STC Pay implementation
  return { transactionId: 'stc_xxx', status: 'pending' };
}

async function processStripe(userId: string, bookingId: string, amount: number, currency: string) {
  // Delegate to existing Stripe implementation
  return { transactionId: 'stripe_xxx', status: 'pending' };
}

async function processIyzico(userId: string, bookingId: string, amount: number, currency: string) {
  try {
    // Get buyer email and phone from booking (TODO: fetch from booking service)
    const email = await getBookingEmail(bookingId) || 'customer@example.com';
    const phone = await getBookingPhone(bookingId) || '+90 555 000 0000';
    const firstName = 'Customer'; // TODO: Get from booking
    const lastName = 'Name';      // TODO: Get from booking
    const ipAddress = '127.0.0.1'; // TODO: Get from request

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
      cardToken: undefined, // TODO: Get from frontend in production
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
  // TODO: Implement Phase 5
  return { transactionId: 'midtrans_xxx', status: 'pending' };
}

async function processIpay88(userId: string, bookingId: string, amount: number, currency: string) {
  // TODO: Implement Phase 5
  return { transactionId: 'ipay88_xxx', status: 'pending' };
}

async function processRazorpay(userId: string, bookingId: string, amount: number, currency: string) {
  // TODO: Implement Phase 6
  return { transactionId: 'razorpay_xxx', status: 'pending' };
}

async function processJazzcash(userId: string, bookingId: string, amount: number, currency: string) {
  // TODO: Implement Phase 6
  return { transactionId: 'jazzcash_xxx', status: 'pending' };
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
  return {
    bookingId: webhookData.bookingId,
    userId: body.buyerEmail, // iyzico doesn't send userId, use email lookup TODO
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

async function getBookingEmail(bookingId: string): Promise<string | null> {
  // TODO: Call booking service to fetch email
  return null;
}

async function getBookingPhone(bookingId: string): Promise<string | null> {
  // TODO: Call booking service to fetch phone
  return null;
}

export default router;
