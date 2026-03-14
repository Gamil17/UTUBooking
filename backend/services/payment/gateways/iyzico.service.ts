// backend/services/payment/gateways/iyzico.service.ts
// Turkey (TR) — iyzico payment gateway integration
// Docs: https://docs.iyzipay.com/

import Iyzipay from 'iyzipay';
import crypto from 'crypto';

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
});

export interface IyzicoPaymentParams {
  userId: string;
  bookingId: string;
  amountInUSD: number;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  ipAddress: string;
  currency?: string; // Default: 'USD'
  cardToken?: string; // From iyzico Checkout Form
}

export interface IyzicoPaymentResult {
  status: 'success' | 'failure';
  transactionId: string;
  paymentId?: string;
  conversationId: string;
  errorMessage?: string;
  authCode?: string;
}

/**
 * Create payment via iyzico
 * For initial implementation, we'll use card token approach
 * In production, redirect to iyzico's hosted payment page
 */
export async function createPayment(
  params: IyzicoPaymentParams
): Promise<IyzicoPaymentResult> {
  try {
    const request = {
      locale: 'en',
      conversationId: params.bookingId,
      price: params.amountInUSD.toFixed(2),
      paidPrice: params.amountInUSD.toFixed(2),
      currency: params.currency || 'USD',
      installment: '1',
      basketId: params.bookingId,
      paymentChannel: 'WEB',
      paymentGroup: 'PRODUCT',

      // Card info — in production, use cardToken from iyzico Checkout Form
      paymentCard: {
        cardUserKey: `utu_${params.userId}`, // Store card for future payments
        cardToken: params.cardToken || 'test_token', // TODO: Get from frontend
      },

      // Buyer info
      buyer: {
        id: params.userId,
        name: params.firstName,
        surname: params.lastName,
        gsmNumber: params.phone,
        email: params.email,
        identityNumber: '00000000001', // TODO: Get from booking data
        registrationDate: new Date().toISOString(),
        lastLoginDate: new Date().toISOString(),
        registrationAddress: 'Istanbul, Turkey',
        ip: params.ipAddress,
        city: 'Istanbul',
        country: 'Turkey',
        zipCode: '34000',
      },

      // Shipping address
      shippingAddress: {
        contactName: `${params.firstName} ${params.lastName}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Istanbul, Turkey',
        zipCode: '34000',
      },

      // Billing address (same as shipping)
      billingAddress: {
        contactName: `${params.firstName} ${params.lastName}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Istanbul, Turkey',
        zipCode: '34000',
      },

      // Basket items
      basketItems: [
        {
          id: params.bookingId,
          name: 'Hotel Booking',
          category1: 'Accommodation',
          itemType: 'VIRTUAL',
          price: params.amountInUSD.toFixed(2),
        },
      ],
    };

    return new Promise((resolve) => {
      iyzipay.payment.create(request, (err: any, result: any) => {
        if (err) {
          console.error('[iyzico] Payment creation error:', err);
          resolve({
            status: 'failure',
            transactionId: params.bookingId,
            conversationId: params.bookingId,
            errorMessage: err.message || 'Payment creation failed',
          });
        } else {
          resolve({
            status: result.status === 'success' ? 'success' : 'failure',
            transactionId: result.paymentId || params.bookingId,
            paymentId: result.paymentId,
            conversationId: result.conversationId,
            errorMessage: result.errorMessage,
            authCode: result.authCode,
          });
        }
      });
    });
  } catch (error) {
    console.error('[iyzico] Create payment exception:', error);
    return {
      status: 'failure',
      transactionId: params.bookingId,
      conversationId: params.bookingId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retrieve existing payment details
 */
export async function retrievePayment(paymentId: string): Promise<any> {
  return new Promise((resolve) => {
    iyzipay.payment.retrieve(
      { locale: 'en', paymentId },
      (err: any, result: any) => {
        if (err) {
          console.error('[iyzico] Retrieve error:', err);
          resolve(null);
        } else {
          resolve(result);
        }
      }
    );
  });
}

/**
 * Refund a payment
 */
export async function refundPayment(
  paymentId: string,
  amountInUSD: number,
  reason: string
): Promise<any> {
  return new Promise((resolve) => {
    iyzipay.refund.create(
      {
        locale: 'en',
        paymentId,
        price: amountInUSD.toFixed(2),
        reason,
      },
      (err: any, result: any) => {
        if (err) {
          console.error('[iyzico] Refund error:', err);
          resolve(null);
        } else {
          resolve(result);
        }
      }
    );
  });
}

/**
 * Verify webhook signature (HMAC-SHA256)
 * iyzico sends: X-IyzipaySignature header
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secretKey: string
): boolean {
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(body)
    .digest('base64');

  return hash === signature;
}

/**
 * Parse iyzico webhook payload
 * Webhooks are sent for: payment.success, payment.failure, refund.completed
 */
export function parseWebhook(body: any): {
  eventType: string;
  transactionId: string;
  bookingId: string;
  status: 'success' | 'failure' | 'refunded';
  amount: number;
} {
  return {
    eventType: body.eventType || 'unknown',
    transactionId: body.paymentId,
    bookingId: body.conversationId,
    status: body.status === 'success' ? 'success' : 'failure',
    amount: parseFloat(body.price),
  };
}

/**
 * Create hosted payment page link (for future use)
 * More secure than passing card tokens
 */
export async function createCheckoutForm(
  params: IyzicoPaymentParams & { returnUrl: string }
): Promise<string | null> {
  return new Promise((resolve) => {
    const request = {
      locale: 'en',
      conversationId: params.bookingId,
      price: params.amountInUSD.toFixed(2),
      currency: 'USD',
      basketId: params.bookingId,
      paymentGroup: 'PRODUCT',
      callbackUrl: params.returnUrl,

      buyer: {
        id: params.userId,
        name: params.firstName,
        surname: params.lastName,
        gsmNumber: params.phone,
        email: params.email,
        identityNumber: '00000000001',
        registrationDate: new Date().toISOString(),
        lastLoginDate: new Date().toISOString(),
        registrationAddress: 'Istanbul, Turkey',
        ip: params.ipAddress,
        city: 'Istanbul',
        country: 'Turkey',
        zipCode: '34000',
      },

      shippingAddress: {
        contactName: `${params.firstName} ${params.lastName}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Istanbul, Turkey',
        zipCode: '34000',
      },

      billingAddress: {
        contactName: `${params.firstName} ${params.lastName}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Istanbul, Turkey',
        zipCode: '34000',
      },

      basketItems: [
        {
          id: params.bookingId,
          name: 'Hotel Booking',
          category1: 'Accommodation',
          itemType: 'VIRTUAL',
          price: params.amountInUSD.toFixed(2),
        },
      ],

      // Enable installments if customer prefers
      enableInstallments: [2, 3, 6, 9],
      forcedInstallmentSelectionRequired: false,
    };

    iyzipay.checkoutFormInitialize.create(
      request,
      (err: any, result: any) => {
        if (err) {
          console.error('[iyzico] Checkout form error:', err);
          resolve(null);
        } else {
          resolve(result.checkoutFormContent); // Base64-encoded HTML
        }
      }
    );
  });
}
