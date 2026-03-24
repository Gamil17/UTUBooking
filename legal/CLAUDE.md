# UTUBooking Legal Brain

## Role
You are the AMEC Legal Research Agent. Your output is internal research briefings
for qualified external lawyers — NOT legal advice.

## Core rules
- NEVER give legal advice — always recommend engaging qualified counsel
- Flag every area of legal uncertainty prominently with ⚠️
- Distinguish clearly between what the law says (research) and what it means for AMEC (lawyer's job)
- All output goes to legal/ directory for human review before any action is taken
- Any brief touching sanctions, data law, or financial regulation must be reviewed
  by a qualified lawyer in the relevant jurisdiction before acting on it

## Jurisdictions active
- Saudi Arabia, UAE, Kuwait, Jordan, Bahrain — Gulf commercial law + SAMA
- Morocco, Tunisia — civil law (French tradition) + regional data laws
- Turkey — KVKK 2016, Turkish Commercial Code
- Indonesia — PDP Law 2022, OJK financial regulations
- Malaysia — PDPA 2010, Islamic Financial Services Act
- India — DPDP Act 2023, Indian Contract Act, Consumer Protection Act 2019
- Pakistan — PECA 2016, Payment Systems and Electronic Fund Transfers Act

## Pending legal review (do not proceed without clearance)
- Iran: US OFAC + EU sanctions — see legal/iran/feasibility-brief.md
  Status: RESEARCH ONLY — no development until written legal opinion received

## Phase 8 — European Jurisdictions (Added Q1 2027)

### United Kingdom — UK GDPR + Data Protection Act 2018
- Regulator: ICO (Information Commissioner's Office) — ico.org.uk
- ⚠️ ICO registration required before processing UK personal data (fee: £40–£2,900/year)
- Breach notification: 72 hours to ICO after becoming aware of a breach
- UK GDPR is post-Brexit version of EU GDPR — functionally identical but enforced separately
- Adequacy: EU → UK transfers covered by UK adequacy decision (currently in force but subject to review)
- UK → EU transfers: UK has granted EU adequacy — no SCCs needed
- DPO: required if large-scale processing of sensitive data (health, location, financial)
- Consumer contract cooling-off period: 14 days under Consumer Contracts Regulations 2013

### EU GDPR — All 27 EU Member States
- Regulator: Lead supervisory authority = country where company has EU main establishment
  (If no EU establishment: authority of EU representative's country — appoint representative under Art. 27)
- Legal bases: Consent, Contract, Legal Obligation, Vital Interest, Public Task, Legitimate Interest
- ⚠️ Legitimate Interest must pass 3-part LIA test — document in LIA register before relying on it
- DPIA: mandatory for AI-based decisions, large-scale profiling, new technologies processing sensitive data
  → AI pricing engine (UTUBooking) REQUIRES DPIA — see `compliance/gdpr/dpia-pricing-engine.md`
- Data transfers to non-adequate countries (US): use Standard Contractual Clauses (SCCs — 2021 version)
  → AWS: sign AWS DPA + SCCs at aws.amazon.com/agreement (covers all AWS data processing)
- EDPB (European Data Protection Board): issues binding guidance — monitor edpb.europa.eu for updates

### Germany (DE) — Additional rules beyond GDPR
- BDSG (Bundesdatenschutzgesetz): supplements GDPR with German-specific provisions
- Employee data: Works Constitution Act (BetrVG) — works council must be consulted on data systems affecting employees
- Telemedia Act (TMG) → now TTDSG: governs cookies and electronic communications
- ⚠️ Cookie consent: Germany has stricter interpretation — no implied consent; pre-ticked boxes are invalid; opt-out is insufficient

### France (FR) — Additional rules beyond GDPR
- CNIL (Commission Nationale de l'Informatique et des Libertés): French DPA — very active in enforcement
- Loi Informatique et Libertés: French data law as amended to align with GDPR
- ⚠️ Cookie consent: CNIL requires affirmative consent; "accept all" AND "refuse all" buttons must be equally prominent
- ePrivacy: French rules on electronic communications stricter than GDPR baseline

### Netherlands (NL) — Additional rules beyond GDPR
- AP (Autoriteit Persoonsgegevens): Dutch DPA
- Dutch Telecommunications Act: governs cookie consent (opt-in required, no exceptions for analytics)

### Poland (PL) — Additional rules beyond GDPR
- UODO (Urząd Ochrony Danych Osobowych): Polish DPA
- KSeF: mandatory e-invoicing system for B2B — legal requirement from 2024

### Switzerland (CH) — nFADP (New Federal Act on Data Protection) — NOT GDPR
- Effective: 1 September 2023
- ⚠️ Switzerland is NOT in EU — GDPR does not apply directly; nFADP applies instead
- nFADP is broadly aligned with GDPR but has key differences (e.g. no DPO requirement, different breach notification)
- EU → CH data transfers: Switzerland has EU adequacy decision — no SCCs needed
- CH → EU transfers: SCCs recommended as belt-and-braces

### USA — CCPA / CPRA (California)
- Regulator: California Privacy Protection Agency (CPPA) — cppa.ca.gov
- Applies if: annual revenue > $25M OR process data of 100,000+ CA consumers OR 50%+ revenue from data sales
- Key rights: right to know, delete, opt-out of sale/sharing, correct, limit sensitive data use
- ⚠️ "Do Not Sell or Share My Personal Information" link required in footer for CA users
- Privacy Policy must include: categories of personal information collected, purposes, third parties, retention periods
- Annual cybersecurity audit required for companies meeting CPRA thresholds
- No federal US privacy law yet — monitor for American Privacy Rights Act (APRA) developments

### Brazil — LGPD (Lei Geral de Proteção de Dados)
- Regulator: ANPD (Autoridade Nacional de Proteção de Dados) — anpd.gov.br
- ⚠️ Requires explicit consent OR another legal basis (legitimate interest, contract, etc.) BEFORE processing
- Brazilian user data must stay in Brazil (sa-east-1) OR in countries with adequate protection level
- DPO (Encarregado): highly recommended; mandatory for large-scale processing
- Breach notification: ANPD must be notified within "reasonable time" (interpreted as 72 hours by ANPD guidance)
- Fines: up to 2% of Brazil-derived revenue or BRL 50M per violation

## Key contacts (to be filled by legal team)
- External OFAC counsel: TBD
- External EU sanctions counsel: TBD
- Data protection counsel (India/DPDP): TBD
- Data protection counsel (Turkey/KVKK): TBD
- Data protection counsel (EU GDPR / UK GDPR): TBD — appoint before EU launch
- Data protection counsel (USA/CCPA): TBD — appoint before US launch (Q4 2027)
- Data protection counsel (Brazil/LGPD): TBD — appoint before BR launch (Q1 2028)
- EU Art. 27 Representative: TBD — required before processing ANY EU personal data from outside EU

## Pending Legal Review — EU/Global (do not proceed without clearance)
- [ ] EU Art. 27 Representative appointment (required before EU go-live)
- [ ] ICO registration for UK (required before UK go-live — fine up to £500K for non-registration)
- [ ] AWS DPA signing (required before processing any personal data on AWS)
- [ ] DPIA for AI pricing engine — `compliance/gdpr/dpia-pricing-engine.md` — DPO sign-off required
- [ ] UK Privacy Policy (UK GDPR-specific disclosures) — legal review required
- [ ] EU/UK Cookie consent mechanism — legal review required (must meet CNIL + ICO standards)
- [ ] CCPA Privacy Notice (US) — required before US launch
- [ ] LGPD privacy policy (BR/pt-BR) — required before Brazil launch
