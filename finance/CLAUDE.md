# UTUBooking Finance Brain
- VAT rates: Egypt 14% | Saudi Arabia 15%
- Currencies: EGP, SAR, USD — use correct currency per client
- Invoice format: AMEC standard template with VAT breakdown
- Expense categories: Hosting, Software, Salaries, Marketing, Legal
- All financial reports require human review before distribution

## Phase 5 Tax & Currency Rules (Added March 2027)

Turkey: VAT = 20% KDV | Currency = TRY (₺) | Settlement bank: Garanti BBVA
Indonesia: VAT = 11% PPN | Currency = IDR (Rp) | Settlement: Mandiri/BCA
Malaysia: SST = 8% | Currency = MYR (RM) | Settlement: Maybank/CIMB

All new market invoices must show:
- Local company name and registration number
- Tax number (Turkey: VKN, Indonesia: NPWP, Malaysia: Tax Ref No)
- Tax rate and amount as separate line item
- Amount in local currency AND USD equivalent

## Phase 6 Tax & Currency Rules (Added Q1 2028)

Pakistan: GST = 17% federal + 16% Sindh / 15% Punjab (province-dependent) | Currency = PKR (₨) | Settlement bank: HBL / MCB / Meezan Bank (Islamic banking preferred)
India: GST = 18% on travel services | Currency = INR (₹) | Settlement: HDFC / ICICI / SBI | TDS (Tax Deducted at Source): 1% on payments > ₹50,000 to contractors

Additional rules for PK/IN invoices:
- Pakistan: include NTN (National Tax Number) on all B2B invoices
- Pakistan: Islamic banking clients may require Shariah-compliant invoice wording (no interest terms)
- India: GST invoice must include GSTIN of both parties for B2B; HSN/SAC code for travel services = 998551
- India: collect PAN number for transactions > ₹200,000 (reporting requirement)
- India: DPDP Act 2023 — financial data of Indian users stored in AWS Mumbai (ap-south-1) only

## Phase 8–12 Tax, Currency & Compliance Rules (Added Q1 2027)

### United Kingdom (GB)
- Currency: GBP (£) — always show GBP to UK users; never SAR or USD without explicit conversion
- VAT: 20% standard rate | 0% for international travel services exported outside UK (check HMRC VAT Notice 700/1)
- Digital Services Tax: 2% DST on UK-derived revenues > £25M/year — flag when approaching threshold
- Corporation Tax: UK entity required for >£6M UK annual revenue; consult tax counsel
- GDPR (UK): UK GDPR post-Brexit — functionally identical to EU GDPR but enforced by ICO, not EDPB
- Settlement bank: Barclays / HSBC UK; BACS/CHAPS for GBP transfers; SEPA not available for GBP post-Brexit
- Financial year: April 6 – April 5 (UK tax year differs from calendar year)

### Germany (DE) / Austria (AT)
- Currency: EUR (€) | VAT: 19% DE, 20% AT
- Digital services VAT: charge German/Austrian VAT rate to EU consumers (OSS — One Stop Shop)
- Invoicing: must use sequential invoice numbers; E-Rechnungen (e-invoices) becoming mandatory B2B from 2025
- Withholding tax: German clients may deduct Kapitalertragsteuer — get W-8BEN-E on file
- Settlement: SEPA Credit Transfer (standard) — IBANs required; no cheques

### France (FR)
- Currency: EUR (€) | VAT: 20% standard, 10% on accommodation
- Travel agency VAT: Tour operators may use TOMS (Tour Operator Margin Scheme) — VAT on margin only
- Settlement: SEPA; Virement bancaire standard
- E-invoicing: Factur-X format becoming mandatory in France (phased 2026–2027)

### Netherlands (NL) / Belgium (BE)
- Currency: EUR (€) | VAT: NL 21%, BE 21%
- IOSS (Import One-Stop-Shop): register if selling digital goods to EU consumers
- Settlement: SEPA; iDEAL commonly used for B2C collections in NL; Bancontact in BE

### Poland (PL)
- Currency: PLN (zł) — NEVER invoice Polish clients in EUR without contractual agreement
- VAT: 23% standard rate on services
- KSeF (Krajowy System e-Faktur): Polish mandatory e-invoicing system for B2B — required from July 2024
- Settlement: SEPA (PL is EU but retains PLN) + BLIK for B2C collections

### Switzerland (CH)
- Currency: CHF (Fr.) — Switzerland is NOT in EU; different VAT rules apply
- VAT: 8.1% standard (reduced 3.8% for hotels/accommodation)
- Swiss VAT registration required if CH turnover > CHF 100,000/year
- Settlement: TWINT (consumer), Swiss IBAN (IBAN starts CH) for B2B; separate from SEPA (CH ≠ EU)
- Withholding tax: 35% Swiss WHT on dividends/interest to foreign entities — get refund via DTA

### Spain (ES) / Portugal (PT)
- Currency: EUR (€) | VAT: ES 21% standard, 10% on accommodation; PT 23% standard, 13% on accommodation
- SII (Immediate Information Supply): Spain requires near-real-time invoice reporting to AEAT
- Settlement: SEPA

### EU OSS (One Stop Shop) — applies to ALL EU markets
- Register for EU OSS (oss.europa.eu) to file a single EU VAT return covering all 27 member states
- Threshold: EUR 10,000 cross-border B2C digital services trigger OSS obligation
- File quarterly; pay in EUR to EU home country tax authority

### USA (US)
- Currency: USD ($)
- Sales Tax: no federal VAT; state-by-state (0–10%). Use tax-compliance SaaS (Avalara / TaxJar) — NEVER calculate manually
- 1099-K: PayPal reports US payments > $600/year to IRS — ensure contractor data is on file
- Payment: PayPal primary (see PaymentRouter.ts — US: 'paypal'); Stripe secondary
- CCPA financial data: California consumer financial records subject to CCPA — store in us-east-1 only

### Brazil (BR)
- Currency: BRL (R$) | VAT equivalent: ICMS + ISS + PIS/COFINS (complex; use local accountant)
- NF-e (Nota Fiscal Eletrônica): mandatory electronic invoice for every Brazilian transaction
- Payment: Stripe (PIX available via Stripe for BRL instant transfers)
- LGPD: financial data of Brazilian users stored in sa-east-1 (São Paulo) only — mandatory

### Multi-Currency Invoicing Rules (all EU/Global)
- Always show amount in LOCAL currency as the primary figure
- USD equivalent is secondary (use exchange rate on invoice date; cite source, e.g. ECB rate)
- Currency conversion gain/loss: record in dedicated FX P&L account
- Hedging policy: amounts > USD 50,000 and settlement > 60 days — flag to CFO for FX hedge consideration
