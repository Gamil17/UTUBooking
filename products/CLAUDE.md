# UTUBooking Product Brain
- User stories format: As a [persona] I want [goal]
- Acceptance criteria: Given/When/Then format
- Priority: Makkah hotel search > flights > cars
- Mobile-first design — test on iPhone 14 + Samsung S23
- RTL: every feature must work in Arabic RTL layout

## Muslim World Market UX Rules (Phase 5-7 Addition)

| Market | Currency | Payment first | Layout |
|--------|----------|---------------|--------|
| Turkish users (tr) | TRY (₺) | Iyzico | LTR, km not miles |
| Indonesian users (id) | IDR (Rp) | GoPay | LTR |
| Malaysian users (ms) | MYR (RM) | FPX | LTR, Tabung Haji widget visible |
| Pakistani users (ur) | PKR (₨) | JazzCash | RTL, Urdu Nastaliq font required |
| Indian users (hi) | INR (₹) | UPI | LTR, Indian number format (12,34,567) |
| Iranian users (fa) | IRR | — | RTL, Farsi — ONLY if legal clearance in place |

### Hajj Module — Country-Specific Rules:
- **PK + IN**: Mehram verification required for female pilgrims under 45
- **ID**: show BPIH cost (government Hajj cost subsidy information)
- **MY**: show Tabung Haji balance + queue position widget
- **TR**: show Diyanet Hajj quota + application link for Turkish pilgrims
- **PK**: show MoRA quota + application window (NationalQuotaCard)
- **ID**: show Kemenag BPIH quota + province waitlist (NationalQuotaCard)
