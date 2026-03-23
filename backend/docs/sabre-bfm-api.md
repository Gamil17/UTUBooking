# Sabre GDS Flight Adapter – BFM API v4.3.0

> ⚠️ **IMPORTANT**: This document describes Sabre Bargain Finder Max (BFM) REST API v4.3.0 field mappings. The field structure is based on the published specification, but **sandbox credentials verification is required** before go-live. Test against your actual Sabre sandbox credentials and adjust the `_toFlightOffer` mapper accordingly.

## Overview

Sabre is a Global Distribution System (GDS) used for flight inventory and bookings. This implementation provides:
- Flight search via Bargain Finder Max (BFM) REST API
- Response caching (3 minutes)
- OAuth2 authentication with token refresh
- Interchangeable adapter interface (same as Amadeus)

See [backend/adapters/sabre.js](../adapters/sabre.js) for implementation details.

---

## API Structure

### Request – OTA_AirLowFareSearchRQ

```json
{
  "OTA_AirLowFareSearchRQ": {
    "Version": "4.3.0",
    "POS": {
      "Source": [{
        "PseudoCityCode": "ABC123",
        "RequestorID": {
          "Type": "1",
          "ID": "1",
          "CompanyName": { "Code": "TN" }
        }
      }]
    },
    "OriginDestinationInformation": [{
      "RPH": "1",
      "DepartureDateTime": "2026-03-15T00:00:00",
      "OriginLocation": { "LocationCode": "JED" },
      "DestinationLocation": { "LocationCode": "RUH" }
    }],
    "TravelPreferences": {
      "CabinPref": [{ "Cabin": "E", "PreferLevel": "Preferred" }],
      "MaxStopsQuantity": 3
    },
    "TravelerInfoSummary": {
      "SeatsRequested": [2],
      "AirTravelerAvail": [{
        "PassengerTypeQuantity": [{ "Code": "ADT", "Quantity": 2 }]
      }],
      "PriceRequestInformation": {
        "CurrencyCode": "SAR"
      }
    },
    "TPA_Extensions": {
      "IntelliSellTransaction": {
        "RequestType": { "Name": "200ITINS" }
      }
    }
  }
}
```

### Response – PricedItinerary (Key Fields)

| Field Path | Type | Notes |
|------------|------|-------|
| `PricedItinerary[0]` | Array | Each element is one fare result |
| `@SequenceNumber` | String | Unique offer ID (use for caching/carts) |
| `AirItinerary.OriginDestinationOptions.OriginDestinationOption[0]` | Object | Contains flight segments |
| `FlightSegment` | Array | Legs in itinerary |
| `FlightSegment[0].@DepartureDateTime` | String | ISO 8601 datetime |
| `FlightSegment[0].DepartureAirport.@LocationCode` | String | IATA code (e.g., "JED") |
| `FlightSegment[0].MarketingAirline.@Code` | String | Airline IATA code |
| `FlightSegment[0].@FlightNumber` | String | Flight number |
| `FlightSegment[0].ResBookDesigCode` | String | Booking class (Y = Economy, C = Business, F = First) |
| `FlightSegment[0].@ElapsedTime` | String/Number | Segment duration in minutes |
| `AirItineraryPricingInfo[0]` | Object | Pricing data |
| `ItinTotalFare.TotalFare.Amount` | String | Total price (as quoted) |
| `ItinTotalFare.BaseFare.Amount` | String | Base fare (excluding taxes/fees) |
| `PTC_FareBreakdowns.PTC_FareBreakdown[0]` | Object | Per-passenger fare details |
| `TPA_Extensions.BaggageAllowance.NumberOfPieces` | Number | Baggage allowance |

---

## Field Mapping – `_toFlightOffer()`

The adapter maps Sabre's response to the internal `FlightOffer` DTO:

```javascript
{
  id:              raw['@SequenceNumber'],
  flightNum:       `${airline}${flightNumber}`,
  airlineCode:     'SV',                        // MarketingAirline[@Code]
  originIata:      'JED',                       // DepartureAirport[@LocationCode]
  destinationIata: 'RUH',                       // ArrivalAirport[@LocationCode]
  departureAt:     '2026-03-15T08:00:00',       // @DepartureDateTime (ISO 8601)
  arrivalAt:       '2026-03-15T10:30:00',       // @ArrivalDateTime (ISO 8601)
  cabinClass:      'economy',                   // Mapped from ResBookDesigCode
  price:           1250.00,                     // From ItinTotalFare.TotalFare.Amount
  currency:        'SAR',
  durationMinutes: 150,                         // Sum of segment @ElapsedTime
  stops:           0,                           // segments.length - 1
  isRefundable:    false,                       // ⚠️ Not exposed in standard BFM
  baggageIncluded: true,                        // BaggageAllowance.NumberOfPieces > 0
  source:          'sabre'
}
```

### Cabin Class Mapping

| Sabre Code | Internal Value |
|------------|----------------|
| `Y` | `economy` |
| `C` | `business` |
| `F` | `first` |
| `W` | `premium economy` |

---

## Environment Variables

```bash
# .env
SABRE_CLIENT_ID=<base64-encoded-credentials>
SABRE_CLIENT_SECRET=<your-client-secret>
SABRE_TOKEN_URL=https://api.sabre.com/v2/auth/token
SABRE_BASE_URL=https://api.sabre.com
SABRE_PCC=<your-pseudo-city-code>
REDIS_URL=redis://localhost:6379
```

### Credential Format

`SABRE_CLIENT_ID` should be base64-encoded like:
```
V1:<username>:<password>:<domain>
```

Get credentials from [Sabre Developer Portal](https://developer.sabre.com).

---

## Caching

- **Duration:** 180 seconds (3 minutes)
- **Key Format:** `flight:sabre:search:{sha256(params)}`
- **Non-fatal:** If Redis is unavailable, requests still succeed

---

## Testing Checklist Before Integration

- [ ] Get Sabre sandbox credentials and PCC from [developer.sabre.com](https://developer.sabre.com)
- [ ] Verify PricedItinerary JSON structure matches API v4.3.0 spec
- [ ] Test segment `@ElapsedTime` format (string vs number) and adjust parser if needed
- [ ] Confirm `@SequenceNumber` uniqueness across multiple queries
- [ ] Test cabin code mapping against actual sandbox responses
- [ ] Validate `ItinTotalFare` hierarchy doesn't differ from spec
- [ ] Verify OAuth2 token refresh logic with sandbox credentials
- [ ] Test pagination (maxOffers parameter)
- [ ] Check error handling for invalid routes (no flights found)
- [ ] Confirm Redis cache hit/miss behavior

---

## Known Limitations

| Issue | Current Behavior | Future Fix |
|-------|------------------|-----------|
| **Refundability** | Always `false` | Requires deeper parsing of fare rules (TPA_Extensions) or Air Book lookup |
| **Baggage Details** | Count only; no weight/type | Store raw structure in `raw` field for rich frontend display |
| **Seat Availability** | Not parsed | May require Air Book or separate API call |
| **Taxes/Fees Breakdown** | Not exposed | Available in `ItinTotalFare` but not mapped |

---

## Migration Plan (Go-Live)

1. Obtain production Sabre credentials
2. Test with production credentials against the full API endpoint
3. Adjust `_toFlightOffer` mapper if live JSON structure differs
4. Monitor response times and cache hit rates
5. Enable audit logging for all Sabre requests
6. **Code Review Required** – Ensure security team reviews OAuth2 and API credentialing
7. Set up alerts for failed searches or missing fields

---

## References

- [Sabre REST APIs Documentation](https://developer.sabre.com/docs/rest_apis)
- [Bargain Finder Max API v4.3.0](https://developer.sabre.com/docs/rest_apis/air/search/bargain_finder_max)
- [Sabre Pseudo City Code (PCC) Info](https://developer.sabre.com/docs/travel-agency/get-started)
- [Adapter Implementation](../adapters/sabre.js)
- [Flight Service Controller](../hotel-service/src/controllers/search.controller.js)

---

**Last Updated:** 2026-03-07  
**Reviewed By:** _(Pending code review & sandbox verification)_
