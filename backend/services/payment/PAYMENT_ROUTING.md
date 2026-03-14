# Payment Gateway Routing Architecture

## Overview

The Payment Router is a **single abstraction layer** that routes payments to the correct gateway based on user country. This enables UTUBooking to scale to 9+ payment methods without duplicating code or breaking existing flows.

**Key principle**: All new gateways integrate through this router. The existing STC Pay and Stripe implementations remain unchanged.

---

## Architecture

```
Booking Flow (Frontend)
    ↓
[POST /api/v1/payment/process]
    ↓
PaymentRouter.ts
    ├─ getGateway(countryCode) → 'iyzico'
    ├─ validateAmountForGateway()
    ├─ calculateFee()
    └─ getAvailableGateways()
    ↓
payment.controller.ts
    ├─ processIyzico() [Phase 5]
    ├─ processMidtrans() [Phase 5]
    ├─ processIpay88() [Phase 5]
    ├─ processRazorpay() [Phase 6]
    └─ processJazzcash() [Phase 6]
    ↓
[Existing Gateway SDK - jpy SDK, Midtrans SDK, etc.]
    ↓
Payment Gateway ✅
    ↓
[Webhook confirmation]
    ↓
[Update booking status]
    ↓
[Push notification]
```

---

## Phase Roadmap

### Phase 2-4: Existing (No changes needed)
- **STC Pay** (Saudi Arabia) ✅
- **Stripe** (UAE, Jordan, Kuwait, Bahrain, Oman, Qatar, Egypt, Morocco, Tunisia, Palestine, Lebanon) ✅

### Phase 5: Asia (New — requires implementation)

| Country | Gateway | Notes |
|---------|---------|-------|
| **Turkey** | iyzico | Turkish leading payment platform |
| **Indonesia** | Midtrans | Verifone subsidiary, largest in region |
| **Malaysia** | iPay88 | Malaysian aggregator |

**Effort**: ~3-4 weeks (1-2 for each integration)

### Phase 6: Subcontinent (Planned)

| Country | Gateway | Notes |
|---------|---------|-------|
| **Pakistan** | JazzCash | Pakistan's largest mobile money |
| **India** | Razorpay | India's leading fintech |
| **Bangladesh** | Razorpay | (same provider) |

**Effort**: ~2-3 weeks

### Phase 7: Global (Planned)

| Country | Gateway |
|---------|---------|
| US, Canada, UK | Stripe ✅ |
| Australia | Stripe ✅ |
| France, Germany | Stripe ✅ |

---

## How to Add a New Payment Gateway

### 1. Register in PaymentRouter.ts

```typescript
// PaymentRouter.ts
export const GATEWAY_BY_COUNTRY: Record<string, string> = {
  // ... existing
  TR: 'iyzico',  // Add this
};

export const GATEWAY_CONFIG = {
  // ... existing
  iyzico: {
    fee: 1.75,
    minAmount: 1,
    maxAmount: 1000000,
    webhook: process.env.IYZICO_WEBHOOK_URL,
    timeout: 40000,
  },
};
```

### 2. Create Gateway Service

```typescript
// backend/services/payment/gateways/iyzico.service.ts
import Iyzipay from 'iyzipay';

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY!,
  secretKey: process.env.IYZICO_SECRET_KEY!,
  uri: 'https://api.iyzipay.com', // Use sandbox for testing
});

export async function createPayment(params: {
  userId: string;
  bookingId: string;
  amount: number;
  email: string;
  ipAddress: string;
}) {
  return new Promise((resolve, reject) => {
    iyzipay.payment.create(
      {
        locale: 'en',
        conversationId: params.bookingId,
        price: params.amount.toString(),
        paidPrice: params.amount.toString(),
        currency: 'USD',
        installment: '1',
        basketId: params.bookingId,
        paymentChannel: 'WEB',
        paymentGroup: 'PRODUCT',
        paymentCard: {
          // Each payment method has different card data
          cardUserKey: 'banking-card-key',
          cardToken: 'card-token-from-frontend',
        },
        buyer: {
          id: params.userId,
          name: 'Buyer Name',
          surname: 'Buyer Surname',
          gsmNumber: '+905300000000',
          email: params.email,
          identityNumber: '12345678901',
          registrationDate: new Date().toISOString(),
          lastLoginDate: new Date().toISOString(),
          registrationAddress: 'Istanbul, Turkey',
          ip: params.ipAddress,
          city: 'Istanbul',
          country: 'Turkey',
          zipCode: '34340',
        },
        shippingAddress: {
          contactName: 'Buyer Name',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Istanbul, Turkey',
          zipCode: '34340',
        },
        billingAddress: {
          contactName: 'Buyer Name',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Istanbul, Turkey',
          zipCode: '34340',
        },
        basketItems: [
          {
            id: params.bookingId,
            name: 'Hotel Booking',
            category1: 'Accommodation',
            itemType: 'VIRTUAL',
            price: params.amount.toString(),
          },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });
}

export async function retrievePayment(transactionId: string) {
  return new Promise((resolve, reject) => {
    iyzipay.payment.retrieve(
      {
        locale: 'en',
        conversationId: transactionId,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });
}
```

### 3. Add to Payment Controller

```typescript
// payment.controller.ts
import * as iyzicoService from '../gateways/iyzico.service';

async function processIyzico(userId: string, bookingId: string, amount: number, currency: string) {
  const result = await iyzicoService.createPayment({
    userId,
    bookingId,
    amount,
    email: user.email,
    ipAddress: req.ip,
  });

  return {
    transactionId: result.paymentId,
    status: result.status === 'success' ? 'completed' : 'failed',
  };
}

// Add webhook handler
function parseIyzicoWebhook(body: any) {
  return {
    transactionId: body.paymentId,
    bookingId: body.conversationId,
    userId: body.userId,
    status: body.status === 'success' ? 'completed' : 'failed',
  };
}
```

### 4. Set Environment Variables

```bash
# .env
IYZICO_API_KEY=your_api_key
IYZICO_SECRET_KEY=your_secret_key
IYZICO_WEBHOOK_URL=https://api.utubooking.com/webhooks/iyzico
```

### 5. Handle Webhooks

Each gateway sends webhooks with different structures. The controller maps them to a standard format:

```typescript
router.post('/webhook/iyzico', async (req, res) => {
  const webhookData = parseIyzicoWebhook(req.body);
  // Handle standard format...
});
```

---

## Integration Checklist (Per Gateway)

- [ ] **Research & Setup**
  - [ ] Read gateway API docs
  - [ ] Create merchant/business account
  - [ ] Get API key, secret key
  - [ ] Test in sandbox environment
  - [ ] Add to environment variables

- [ ] **Backend Implementation**
  - [ ] Create `gateways/{name}.service.ts`
  - [ ] Implement `createPayment()`, `refund()`, `retrieve()`
  - [ ] Add to PaymentRouter.ts
  - [ ] Add to payment.controller.ts
  - [ ] Implement webhook parser
  - [ ] Test with mock data

- [ ] **Frontend Integration**
  - [ ] Add gateway to `/available-gateways` response
  - [ ] Create payment form for this gateway
  - [ ] Test payment flow end-to-end

- [ ] **Testing & QA**
  - [ ] Unit tests for gateway service
  - [ ] Integration tests with payment controller
  - [ ] Load test (1000+ concurrent transactions)
  - [ ] Webhook validation
  - [ ] Refund flow testing
  - [ ] Error handling (declined cards, timeouts, etc.)

- [ ] **Monitoring & Docs**
  - [ ] Add Apollo metrics for this gateway
  - [ ] Update runbooks for gateway issues
  - [ ] Document currency conversion logic
  - [ ] Document fee calculation
  - [ ] Add to troubleshooting guide

---

## Current State Files

| File | Status | Purpose |
|------|--------|---------|
| `PaymentRouter.ts` | ✅ Ready | Country → gateway routing |
| `payment.controller.ts` | ✅ Template | HTTP endpoints & webhooks |
| `gateways/stcpay.service.ts` | ✅ Existing | STC Pay (Phase 2) |
| `gateways/stripe.service.ts` | ✅ Existing | Stripe (Phase 3-4) |
| `gateways/iyzico.service.ts` | ⬜ TODO Phase 5 | Iyzico (Turkey) |
| `gateways/midtrans.service.ts` | ⬜ TODO Phase 5 | Midtrans (Indonesia) |
| `gateways/ipay88.service.ts` | ⬜ TODO Phase 5 | iPay88 (Malaysia) |
| `gateways/razorpay.service.ts` | ⬜ TODO Phase 6 | Razorpay (India/BD) |
| `gateways/jazzcash.service.ts` | ⬜ TODO Phase 6 | JazzCash (Pakistan) |

---

## Key Variables

### User → Country Detection
```typescript
// User record should have:
const user = {
  userId: 'user-123',
  countryCode: 'TR', // or 'ID', 'MY', etc.
  tierLevel: 'gold',          // Determines payment method options
  preferredPaymentMethod: 'iyzico', // User's saved preference
};
```

### Database Schema (transactions table)
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,
  bookingId UUID NOT NULL,
  gateway VARCHAR(50) NOT NULL,  -- 'iyzico', 'midtrans', etc.
  amountInUSD DECIMAL(10,2),
  amountInLocalCurrency DECIMAL(10,2),
  feeInUSD DECIMAL(10,2),
  paymentStatus VARCHAR(50),     -- 'pending', 'completed', 'failed', 'refunded'
  gatewayTransactionId VARCHAR(255),
  gatewayResponse JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_booking ON transactions(bookingId);
CREATE INDEX idx_transactions_gateway ON transactions(gateway);
```

---

## Environment Variables: New Gateways

```bash
# Phase 5
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
IYZICO_WEBHOOK_URL=

MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_WEBHOOK_URL=

IPAY88_MERCHANT_CODE=
IPAY88_MERCHANT_KEY=
IPAY88_WEBHOOK_URL=

# Phase 6
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_URL=

JAZZCASH_MERCHANT_ID=
JAZZCASH_PASSWORD=
JAZZCASH_WEBHOOK_URL=
```

---

## Testing Payment Routes

```bash
# Test gateway discovery
curl http://localhost:3007/api/v1/payment/available-gateways?countryCode=TR
# Response:
# {
#   "countryCode": "TR",
#   "primaryGateway": "iyzico",
#   "displayName": "Iyzico",
#   "fee": 1.75,
#   "minAmount": 1,
#   "maxAmount": 1000000,
#   "currency": "TRY"
# }

# Test payment processing
curl -X POST http://localhost:3007/api/v1/payment/process \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "bookingId": "booking-456",
    "countryCode": "TR",
    "amountInSAR": 5000,
    "currency": "SAR"
  }'
```

---

## Monitoring & Metrics

Add these CloudWatch metrics:

```typescript
// After successful payment
await cloudwatch.putMetricData({
  Namespace: 'UTUBooking/Payment',
  MetricData: [
    {
      MetricName: 'PaymentSuccess',
      Value: 1,
      Dimensions: [
        { Name: 'Gateway', Value: gateway },
        { Name: 'Country', Value: countryCode },
      ],
    },
    {
      MetricName: 'TransactionAmount',
      Value: amountInUSD,
      Unit: 'None',
    },
    {
      MetricName: 'ProcessingFee',
      Value: fee,
      Unit: 'None',
    },
  ],
});
```

---

## Rollout Strategy

### Phase 5 Rollout (Weeks 1-4)

**Week 1**: Iyzico (Turkey)
- [ ] Sandbox testing
- [ ] Code review
- [ ] Deploy to production
- [ ] Monitor for 24h

**Week 2**: Midtrans (Indonesia)
- [ ] Follow same process

**Week 3**: iPay88 (Malaysia)
- [ ] Follow same process

**Week 4**: Buffer & fixes
- [ ] Monitor all three gateways
- [ ] Update documentation
- [ ] Gather merchant feedback

### Gradual Rollout
- Day 1-2: Country launch limited to 1% of bookings
- Day 3-5: Increase to 10%
- Day 6-7: Full rollout to 100%
- Maintain Stripe as fallback for any issues

---

## Troubleshooting

### Payment fails for [Country]
1. Check PaymentRouter.ts mapping exists
2. Verify environment variables are set
3. Check gateway service logs
4. Verify webhook endpoint is accessible
5. Test with sandbox credentials

### Webhook not received
1. Verify webhook URL is publicly accessible
2. Check gateway is posting to correct URL
3. Verify webhook signature validation
4. Check logs for parsing errors
5. Contact gateway support

### Currency conversion failing
1. Check FX service is running
2. Verify exchange rates are current
3. Check for API rate limits
4. Fall back to cached rates if needed

---

## Success Metrics

Target for Phase 5 launch:
- ✅ P99 payment latency < 3s
- ✅ Payment success rate > 98%
- ✅ Webhook delivery rate > 99.9%
- ✅ Zero unhandled errors in production

---

**Created**: 2026-03-14
**Status**: Ready for Phase 5 implementation
**Next**: Start Iyzico integration
