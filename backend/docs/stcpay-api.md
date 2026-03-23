# STC Pay Gateway Integration – API v2

> ⚠️ **IMPORTANT**: This document describes STC Pay API v2 field mappings and configuration. Verify all values against your **sandbox credentials** before go-live.

## Overview

STC Pay is a Saudi Arabia–based digital wallet and payment gateway. This implementation supports:
- Payment initiation and status polling
- Webhook notifications for payment updates
- Integration with the Moyasar payment orchestration gateway

See [backend/services/payment](../services/payment) for implementation details.

---

## API v2 Field Reference

### Request – Payment Initiation

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `amount` | Integer | ✓ | Amount in fils (smallest unit, 100 fils = 1 SAR) |
| `currency` | String | ✓ | Always `"SAR"` for Saudi Arabia |
| `orderId` | String | ✓ | Unique order ID (idempotent key) |
| `callbackUrl` | String | ✓ | Where STC Pay sends webhook notifications |
| `failureUrl` | String | Optional | Redirect on payment failure |
| `successUrl` | String | Optional | Redirect on success |

### Response – Payment Status

| Field | Type | Description |
|-------|------|-------------|
| `STCPayPmtRef` | String | Unique STC Pay payment reference (primary identifier) |
| `PaymentStatus` | Enum | One of: `INITIATED`, `COMPLETED`, `FAILED`, `CANCELLED` |
| `BankID` | String | For STC Pay: `"31"` |
| `TransactionId` | String | Optional transaction ID for reconciliation |
| `Amount` | Integer | Amount in fils |

---

## Implementation Details

### Gateway File
[stcpay.gateway.js](../services/payment/src/gateways/stcpay.gateway.js)

**Key Methods:**
- `initiate(orderData)` – Create a payment session
- `verify(paymentRef)` – Poll for payment status
- `parseWebhook(payload)` – Process incoming notifications

### Controller
[stcpay.controller.js](../services/payment/src/controllers/stcpay.controller.js)

**Endpoints:**
- `POST /api/v1/payments/stcpay/initiate` – Start payment
- `POST /api/v1/payments/webhooks/stcpay` – Webhook handler

---

## Environment Variables

```bash
# .env
STCPAY_API_KEY=<your-sandbox-api-key>
STCPAY_API_SECRET=<your-sandbox-api-secret>
STCPAY_MERCHANT_ID=<your-merchant-id>
STCPAY_SANDBOX_MODE=true  # Set to false for production
```

**Sandbox Credentials:**
- Get credentials from [STC Pay Developer Portal](https://dev.stcpay.net)
- Test merchant ID usually starts with `TEST_`

---

## Testing Checklist

- [ ] Verify `BankID: "31"` matches your sandbox merchant setup
- [ ] Confirm `STCPayPmtRef` is correctly extracted from responses
- [ ] Test webhook signature validation (see [webhookAuth.js](../services/payment/src/middleware/webhookAuth.js))
- [ ] Validate `PaymentStatus` enum mapping in [payment.validator.js](../services/payment/src/validators/payment.validator.js)
- [ ] Test idempotency using duplicate `orderId` requests
- [ ] Confirm error handling for declined payments

---

## Status Codes & Error Handling

| Status | Code | Action |
|--------|------|--------|
| `COMPLETED` | 200 | Mark booking as confirmed |
| `FAILED` | 400/402 | Retry or prompt user |
| `CANCELLED` | 410 | Allow re-initiation |
| `INITIATED` | 202 | Poll or wait for webhook |

---

## Migration Plan (Go-Live)

1. Get production API credentials from STC Pay
2. Update `.env` and set `STCPAY_SANDBOX_MODE=false`
3. Run E2E tests against production credentials
4. Enable audit logging (see [audit.service.js](../services/payment/src/services/audit.service.js))
5. Monitor webhook traffic and reconciliation
6. **Code Review Required** – Ensure security team approves before deployment

---

## References

- [STC Pay Official Documentation](https://stcpay.net/en)
- [Moyasar Integration](../services/payment/src/gateways/moyasar.gateway.js) (primary orchestrator)
- [Payment Service README](../services/payment/README.md)

---

**Last Updated:** 2026-03-07  
**Reviewed By:** _(Pending code review)_
