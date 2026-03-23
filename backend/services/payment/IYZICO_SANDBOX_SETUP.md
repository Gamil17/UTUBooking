# iyzico Sandbox Setup & Testing Guide

## Overview

This guide walks through setting up iyzico sandbox for testing Turkey (Phase 5) payments locally before production deployment.

**Timeline**: 2-3 hours for full setup and testing

---

## Step 1: Create iyzico Sandbox Account

### 1.1 Sign Up

1. Go to: https://sandbox-merchant.iyzipay.com/auth/register
2. Enter your email and password
3. Accept terms and create account
4. Check email for verification link
5. Verify and log in

### 1.2 Find Your API Credentials

After login:

1. Click **Settings** (top right → gear icon)
2. Go to **API & Webhooks** → **API Keys**
3. You'll see two keys:
   - **API Key** (e.g., `sandbox_xxxxxxxxxxxxx`)
   - **Secret Key** (e.g., `sandbox_yyyyyyyyyyyyy`)

### 1.3 Add to `.env`

```bash
# In backend/.env

# iyzico Sandbox Credentials
IYZICO_API_KEY=sandbox_xxxxxxxxxxxxx        # Copy from dashboard
IYZICO_SECRET_KEY=sandbox_yyyyyyyyyyyyy     # Copy from dashboard
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
IYZICO_WEBHOOK_URL=https://api.utubooking.local/api/v1/payment/webhook/iyzico
```

**Note**: In development, `IYZICO_WEBHOOK_URL` can be localhost with a tunnel tool like `ngrok`.

---

## Step 2: Local Environment Setup

### 2.1 Install Dependencies

```bash
cd backend/services/payment
npm install      # Already includes 'iyzipay' package if not already installed
```

If missing, add to `package.json`:

```json
{
  "dependencies": {
    "iyzipay": "^2.0.55"
  }
}
```

Then run:

```bash
npm install
```

### 2.2 Verify Environment Variables

```bash
# Test that env vars are loaded
node -e "console.log(process.env.IYZICO_API_KEY)"
# Should output: sandbox_xxxxxxxxxxxxx
```

---

## Step 3: Start Payment Service

### 3.1 Run the Payment Service

```bash
cd backend/services/payment

# Option A: Development mode (auto-reload)
npm run dev

# Option B: Standard start
npm start

# Should output:
# [Payment Service] Listening on http://localhost:3007
```

### 3.2 Verify Service is Ready

```bash
curl http://localhost:3007/health
# Should return: { "status": "ok" }
```

---

## Step 4: Test Payment Creation (Sandbox)

### 4.1 Prepare Test Data

You'll need:
- **User ID**: `user-test-001`
- **Booking ID**: `booking-test-001`
- **Country Code**: `TR`
- **Amount**: `100.00` (USD)

### 4.2 Create Test Payment

```bash
curl -X POST http://localhost:3007/api/v1/payment/process \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-test-001",
    "bookingId": "booking-test-001",
    "countryCode": "TR",
    "amountInUSD": 100.00,
    "currency": "USD"
  }'
```

### 4.3 Expected Response

**Success**:
```json
{
  "success": true,
  "transactionId": "999999999999999",
  "gateway": "iyzico",
  "amountInUSD": 100.00,
  "fee": 2.50,
  "status": "completed"
}
```

**Failure** (invalid credentials):
```json
{
  "success": false,
  "error": "Invalid API key",
  "gateway": "iyzico"
}
```

### 4.4 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `Invalid API key` | Wrong IYZICO_API_KEY | Re-copy from sandbox dashboard |
| `Connection refused` | Payment service not running | `npm start` in payment directory |
| `400 Bad Request` | Missing required fields | Check all required fields: userId, bookingId, countryCode, amountInUSD |
| `Unsupported currency` | Currency not TRY/USD/EUR | Use USD for sandbox testing |

---

## Step 5: Configure Webhooks

### 5.1 Set Up Webhook Endpoint (Local)

For local testing, use **ngrok** to expose localhost:

```bash
# Install ngrok (one time)
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3007
# Output shows: Forwarding https://xxxxx.ngrok.io -> http://localhost:3007
```

### 5.2 Add Webhook to iyzico Dashboard

1. Go to iyzico Dashboard → **Settings** → **Webhooks**
2. Click **Add Webhook**
3. Enter:
   - **URL**: `https://xxxxx.ngrok.io/api/v1/payment/webhook/iyzico`
   - **Events**: Select `payment.success`, `payment.failure`, `refund.completed`
4. Click **Save**

### 5.3 Test Webhook Delivery

From iyzico dashboard:

1. Go to **Settings** → **Webhooks**
2. Find your webhook entry
3. Click **Test** (or **Send Test Event**)
4. Select event type: `payment.success`
5. Execute

### 5.4 Verify Webhook Reception

Check backend logs:

```bash
# In payment service terminal, should see:
[iyzico] Webhook received: payment.success, booking-test-001
[Booking] booking-test-001 -> completed
[Push] User=user-test-001, Trigger=booking_confirmed
```

---

## Step 6: End-to-End Payment Flow Test

### 6.1 Simulate Full Booking Flow

```bash
# Step 1: Create payment
curl -X POST http://localhost:3007/api/v1/payment/process \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-integration-test",
    "bookingId": "booking-e2e-001",
    "countryCode": "TR",
    "amountInUSD": 150.00,
    "currency": "USD"
  }'

# Step 2: Simulate webhook from iyzico (from dashboard Test button)

# Step 3: Verify booking status updated (in your booking service DB)
curl http://localhost:3006/api/v1/bookings/booking-e2e-001
# Should show: status: "completed"
```

### 6.2 Check Logs

```bash
# Payment service logs
tail -f backend/services/payment/logs/app.log

# Should show sequence:
# [Payment] User=user-integration-test, Country=TR, Gateway=iyzico
# [iyzico] Created payment: transition-id-xxx
# [Transaction] User=user-integration-test, Booking=booking-e2e-001, Gateway=iyzico
# [iyzico] Webhook received: payment.success
# [Booking] booking-e2e-001 -> completed
# [Push] User=user-integration-test, Trigger=booking_confirmed
```

---

## Step 7: Test Refunds

### 7.1 Issue a Test Refund

```bash
curl -X POST http://localhost:3007/api/v1/payment/refund \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "999999999999999",
    "amountInUSD": 150.00,
    "reason": "Customer requested cancellation"
  }'
```

### 7.2 Expected Response

```json
{
  "success": true,
  "refundId": "refund-xxx",
  "status": "pending",
  "message": "Refund submitted successfully"
}
```

---

## Step 8: Test with Real iyzico Sandbox Cards

### 8.1 Use iyzico Test Cards

iyzico provides test card numbers for sandbox:

| Card Type | Card Number | CVV | Exp Date |
|-----------|-------------|-----|----------|
| **Visa (Success)** | 4111111111111111 | 123 | 12/25 |
| **Mastercard (Success)** | 5555555555554444 | 456 | 12/25 |
| **Amex (Success)** | 374245455400126 | 7890 | 12/25 |
| **Visa (Failure)** | 4111111111111112 | 123 | 12/25 |

### 8.2 Payment Form Testing

When frontend integration is complete, test with these cards:

```javascript
// Frontend checkout form
const cardToken = await iyzico.createCardToken({
  cardNumber: "4111111111111111",
  expireMonth: "12",
  expireYear: "25",
  cvc: "123"
});
```

---

## Step 9: Performance Metrics

### 9.1 Measure Latency

```bash
# Time payment creation
time curl -X POST http://localhost:3007/api/v1/payment/process \
  -H "Content-Type: application/json" \
  -d { ... }

# Target: P99 < 3s
# Typical sandbox response: 1.5 - 2.5s
```

### 9.2 Load Test (Optional)

```bash
# Install k6 load testing tool
npm install -g k6

# Create test script (save as payment-test.js)
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function() {
  const payload = {
    userId: `user-${__VU}`,
    bookingId: `booking-${__ITER}`,
    countryCode: 'TR',
    amountInUSD: 100.00,
    currency: 'USD'
  };

  const res = http.post('http://localhost:3007/api/v1/payment/process', payload);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'transaction created': (r) => r.body.includes('transactionId'),
  });
}

# Run test
k6 run payment-test.js
```

---

## Step 10: Troubleshooting

### Problem: "Invalid Signature" on Webhook

**Cause**: Webhook signature verification failing

**Fix**:
1. Verify `IYZICO_SECRET_KEY` matches dashboard
2. Check X-IyzipaySignature header is being sent
3. Verify JSON.stringify(body) order matches iyzico's format

### Problem: "Unsupported Currency"

**Cause**: iyzico doesn't support the currency code

**Fix**: Use USD for sandbox. In production, convert all currencies to USD before sending to iyzico.

### Problem: "Invalid Amount"

**Cause**: Amount below minimum or above maximum

**Fix**: Use amounts between $1.00 and $10,000.00 USD

### Problem: Webhook Not Received

**Cause**: URL not accessible from iyzico servers

**Fix**:
1. Use ngrok for local testing
2. Verify tunnel URL is working: `curl https://xxxxx.ngrok.io/api/v1/payment/webhook/iyzico`
3. Check firewall/router allows inbound connections

### Problem: "Connection Refused"

**Cause**: Payment service not running on port 3007

**Fix**: `npm start` in backend/services/payment directory

---

## Checklist for Sandbox Testing

- [ ] Created iyzico sandbox account
- [ ] Copied API Key and Secret Key to `.env`
- [ ] Payment service running on localhost:3007
- [ ] Test payment creation works (returns transactionId)
- [ ] ngrok tunnel active for webhook delivery
- [ ] Webhook endpoint registered in iyzico dashboard
- [ ] Webhook test sent and received successfully
- [ ] Refund test executed
- [ ] Latency measured (P99 < 3s)
- [ ] Error handling tested (invalid cards, amount limits)
- [ ] Load test passed (50 concurrent users, < 0.5% errors)
- [ ] All logs verified and no exceptions

---

## Next Steps

### Week 2: Move to Integration Testing

Once sandbox testing passes:

1. **Frontend Integration**: Implement card token collection
2. **Booking Flow**: Integrate payment into booking wizard
3. **Mobile Testing**: Test iyzico on Expo app
4. **Database**: Add transaction logging to bookings DB
5. **Monitoring**: Set up CloudWatch metrics

### Week 3: Preparation for Production

1. **Get Production Credentials**: Apply for production account
2. **Update Env Vars**: Switch to production API keys
3. **Security Review**: KVKK compliance + PCI DSS requirements
4. **Team Training**: Document onboarding for support team

### Week 4: Go-Live

1. **Deploy to Staging**: Test with production credentials
2. **Monitor Closely**: Watch error rates + webhook delivery
3. **Gradual Rollout**: Launch to 10% of Turkish users first
4. **Gather Feedback**: User experience + payment success rate

---

## Resources

- **iyzico Docs**: https://docs.iyzipay.com/
- **API Reference**: https://docs.iyzipay.com/en/api-reference
- **Webhook Guide**: https://docs.iyzipay.com/en/webhook-management
- **Test Cards**: https://docs.iyzipay.com/en/test-card-numbers
- **Sandbox Dashboard**: https://sandbox-merchant.iyzipay.com

---

**Created**: 2026-03-14
**Status**: Ready for Week 1-2 sandbox testing
**Next Review**: After first successful sandbox payment
