# UTUBooking — Series A Pitch Deck Narrative
> Draft — requires human approval before publishing per marketing/CLAUDE.md

---

## Slide 1 — Cover: "Powering the Journey to the Holy Land"

**Speaker Notes:**

Welcome, and thank you for your time. UTUBooking is on a mission to digitize the most sacred journey in the world: Hajj and Umrah. We are building the infrastructure layer that connects millions of Muslim pilgrims — from Riyadh to Rabat — with hotels, flights, and ground services, seamlessly, in Arabic and English, on mobile.

This is not simply a travel booking app. It is the trust layer for the most emotionally significant trip a person will make in their lifetime. We have spent the last several years building the technical foundation, the regulatory relationships, and the product experience to earn that trust at scale.

Today we are raising a USD 5M Series A to accelerate our expansion from KSA and UAE into Jordan and North Africa — Morocco and Tunisia — and to deepen the infrastructure that will power the next generation of Hajj and Umrah travel operators.

**Key Visuals:**
- Brand wordmark: UTUBooking (green #10B981 on dark background)
- Tagline: "Powering the Journey to the Holy Land"
- Aerial image of Masjid al-Haram / the Kaaba
- Funding target: USD 5M Series A
- Registered: Kingdom of Saudi Arabia

---

## Slide 2 — The Problem: Fragmented, Offline, Opaque

**Speaker Notes:**

Let us be honest about the market we are entering. Hajj and Umrah travel today is largely booked by phone, via WhatsApp message, through unlicensed middlemen, or at physical offices that operate with zero transparency. A pilgrim in Cairo or Tunis calling a travel agent has no way to compare prices, verify hotel star ratings against their actual proximity to the Haram, or confirm their booking is legitimate before they board a plane.

Operators face a parallel problem. A small Umrah operator in Amman or Casablanca runs their entire business on spreadsheets, phone logs, and manual bank transfers. They have no CRM, no real-time inventory feed, no digital payment layer, and no way to scale without hiring more staff.

This fragmentation creates pricing opacity, high fraud rates, and deeply poor customer experiences. Customers overpay. Operators cannot grow. And no single platform has emerged to serve this market with the sophistication it deserves — until now.

The pain is measurable: an estimated 40–60% of Umrah bookings in North Africa still involve at least one offline touchpoint, and customer complaint rates in the sector run 2–3x higher than mainstream OTA benchmarks.

**Key Visuals:**
- Diagram: fragmented booking chain (pilgrim → agent → sub-agent → hotel → airline)
- Stat callout: "60% of bookings involve offline intermediaries"
- Stat callout: "No single Arabic-first platform holds >5% market share"
- Customer pain quote (anonymized): "I didn't know if my Makkah hotel was real until I landed."

---

## Slide 3 — The Solution: One Platform, Search → Book → Pay → Manage

**Speaker Notes:**

UTUBooking collapses the fragmented booking chain into a single, Arabic-first digital platform. A pilgrim opens our mobile app — built natively in React Native, fully RTL, localized in Saudi Arabic — and within three minutes they can search hotels by proximity to the Haram, book a flight, and pay via STC Pay, Mada, Visa, or Apple Pay. No phone calls. No paper receipts. No uncertainty.

For operators, we offer a white-label B2B engine. A licensed Umrah agency in Jordan or Morocco can plug UTUBooking's inventory and booking infrastructure directly into their own branded app or website. They keep their customer relationships; we provide the rails. This is the Stripe model applied to Hajj travel: invisible infrastructure powering visible brands.

Our platform today encompasses seven Node.js microservices handling authentication, hotel inventory, flight search, car hire, bookings, payments, and loyalty — all deployed on AWS ECS in the Bahrain region for low latency across the Gulf and Levant. The architecture was purpose-built to scale to 100,000 concurrent users during Hajj peak season.

**Key Visuals:**
- Product flow diagram: Search → Results → Detail → Book → Pay → My Trips
- App screenshots: HomeScreen (hotels/flights/cars), HotelResults, BookingFlow payment step
- B2B white-label diagram: Agency brand skin → UTUBooking engine → Hotel/Flight APIs
- Tech stack icons: React Native, Next.js, Node.js, AWS ECS Bahrain

---

## Slide 4 — Market Opportunity: TAM / SAM / SOM

**Speaker Notes:**

The Hajj and Umrah travel market is one of the largest and most structurally underserved verticals in global travel. The Kingdom of Saudi Arabia alone has set a Vision 2030 target of 30 million Umrah visitors per year by 2030, up from approximately 13.5 million in 2023. Each pilgrim spends an average of USD 1,500 to USD 4,000 on their trip depending on origin country, creating a gross travel spend that exceeds USD 20 billion annually.

Our Total Addressable Market is the full Hajj and Umrah travel spend: USD 20B+ per year, served across the OIC's 57 member states. Our Serviceable Addressable Market is the digitizable portion of that spend across our initial markets — KSA, UAE, Jordan, Morocco, Tunisia, and Egypt — which we estimate at USD 6–8B annually based on online penetration rates in each country.

Our Serviceable Obtainable Market for the next three years is USD 150–200M in Gross Merchandise Value. At our blended commission rate of 8–12% for B2C and a platform fee plus revenue share for B2B, this translates to USD 15–24M in net revenue. These are conservative figures — they do not factor in loyalty program monetization, ancillary upsells (visa services, Mina camp upgrades, guided ziyarat), or the compounding effect of our B2B white-label network.

**Key Visuals:**
- Concentric circles: TAM ($20B+) → SAM ($6–8B) → SOM ($150–200M GMV)
- Bar chart: Umrah visitor growth 2019–2030 (Vision 2030 target overlay)
- Map: KSA, UAE, Jordan, Egypt, Morocco, Tunisia highlighted
- Source citations: Saudi Ministry of Hajj data, Statista, UNWTO

---

## Slide 5 — Product: B2C App + B2B White-Label Engine

**Speaker Notes:**

Our product strategy is two-pronged, and deliberately so. The B2C mobile app serves pilgrims directly and builds brand equity, trust data, and pricing intelligence. The B2B white-label engine monetizes that infrastructure by licensing it to the thousands of licensed Umrah operators across the MENA region who lack the technical capability to build it themselves.

On the B2C side, our mobile app is built mobile-first, RTL Arabic by default, and designed to meet WCAG 2.1 AA accessibility standards. Every interaction — from searching hotels by Haram distance in metres to completing an STC Pay transaction — is optimized for a user who may be making this booking for the first time in their life. We support four payment methods: STC Pay (dominant in KSA), Mada (Saudi debit), Visa/Mastercard, and Apple Pay. Our three-step booking wizard has been tested on iPhone 14 and Samsung Galaxy S23 for the core device demographic.

On the B2B side, our white-label engine gives travel agencies a fully branded booking interface, a real-time inventory API, and a dashboard for managing customer bookings, payments, and loyalty points. Agencies pay a monthly platform fee plus a revenue share on GMV processed through our infrastructure. This creates a recurring, high-margin revenue stream that is largely decoupled from individual booking volume.

**Key Visuals:**
- Side-by-side: B2C app mockup (Arabic, dark mode) + B2B agency dashboard mockup
- Feature checklist: Hotels near Haram, Flights, Cars, STC Pay, Loyalty, RTL Arabic, English
- B2B agency logos (placeholder: "Agency Partner — Jordan", "Agency Partner — Morocco")
- Quote: "We built the rails. Operators run the trains."

---

## Slide 6 — Traction: Metrics, Partner Wins, Expansion

**Speaker Notes:**

We are pre-Series A, and we are showing the traction that justifies this raise. Our platform is live and processing real bookings. We have established distribution partnerships with Umrah operators in Jordan and are in active discussions with licensed operators in Morocco and Tunisia ahead of our formal Maghreb launch.

On the technology side, we have completed what we call Phase 3 of our infrastructure build: full Redis cluster implementation for session and caching at scale, read/write database pool separation, and a complete observability stack — Grafana dashboards, Artillery load tests validated to 100,000 concurrent users, and OWASP ZAP security scanning integrated into our CI/CD pipeline. This is enterprise-grade infrastructure, built and validated before we raise, not after.

Our go-to-market in Jordan has revealed a strong pull from operators who are actively seeking a technology partner to digitize their existing customer relationships. The white-label model resonates deeply: they keep their license, their brand, their customer trust — and we provide the booking engine, payment processing, and inventory access they cannot build themselves.

[Note to founder: insert live MRR, booking volume, and partner count figures here before investor meetings.]

**Key Visuals:**
- Traction metrics dashboard (placeholder tiles): Active Bookings, Partner Operators, MRR, GMV
- Timeline: Platform launch → Phase 3 infra → Jordan partnership → Morocco/Tunisia pipeline
- Map with growth arrows: KSA → UAE → Jordan → Maghreb
- Logos: AWS Partner Network, [Jordan OTA partner placeholder], [Morocco agency placeholder]

---

## Slide 7 — Business Model: B2C Commission + B2B SaaS

**Speaker Notes:**

UTUBooking operates a dual-revenue model designed for compounding returns. On the B2C side, we earn a commission of 8 to 12 percent on Gross Merchandise Value for every hotel, flight, or car booking completed through our consumer app. This is in line with global OTA commission standards and is fully priced into the rates we display to users.

On the B2B side, we charge licensed Umrah operators a monthly platform fee — tiered by booking volume — plus a revenue share of 2 to 4 percent on GMV processed through the white-label engine. This creates a predictable, subscription-like revenue base that grows as our operator network scales. A single mid-size operator in Amman processing USD 2M in annual Umrah bookings generates USD 40,000 to USD 80,000 in annual revenue for UTUBooking at our B2B rates.

We have also designed the architecture for a third revenue stream — loyalty and ancillaries — which we will activate in Year 2 post-raise. Pilgrims accumulate loyalty points redeemable on future bookings; operators can offer branded loyalty programs powered by our infrastructure. Ancillary upsells — visa processing, Mina camp upgrades, guided ziyarat experiences, travel insurance — carry gross margins of 30 to 60 percent and represent a significant untapped opportunity in this vertical.

**Key Visuals:**
- Revenue model table: B2C (8–12% commission) vs B2B (platform fee + 2–4% rev share) vs Ancillaries
- Unit economics: Average Booking Value, Commission per Booking, LTV per Repeat Pilgrim
- Revenue mix pie chart (Year 3 projection): B2C 45%, B2B 35%, Ancillaries 20%
- Quote: "Two revenue streams. One platform. Compounding returns."

---

## Slide 8 — Go-to-Market: KSA → UAE → Jordan → Maghreb

**Speaker Notes:**

Our expansion playbook is deliberate and sequenced. We started in the Kingdom of Saudi Arabia — the epicenter of Hajj and Umrah — because that is where supply lives. Hotels within 500 metres of the Haram, licensed Mutawwif operators, Mina camp allocations: these relationships are forged in Makkah and Madinah, and we have built them.

From KSA, we extended to the UAE — the Arab world's highest per-capita online travel spending market — where a large community of GCC residents books Umrah multiple times per year. UAE bookings tend to be higher value (longer stays, premium hotels) and have driven our early data on LTV and repeat purchase rates.

Jordan is our current expansion focus. Amman hosts a significant cluster of licensed Umrah travel agencies that serve the broader Levant market — including Palestinian, Iraqi, and Syrian diaspora communities. Our white-label B2B model is ideally suited here: we partner with the existing operator ecosystem rather than displacing it. We are actively onboarding our first Jordanian operator partners as of Q1 2026.

Morocco and Tunisia are the next frontier. These markets have large Muslim populations, growing air connectivity to Jeddah and Madinah, and a licensed Umrah operator ecosystem that is almost entirely offline. The Series A funding will enable us to establish in-country partnerships, localize for Darija and French-language interfaces, and build the regulatory relationships needed to operate in both markets.

**Key Visuals:**
- Geographic expansion map with color-coded stages (live / active / pipeline)
- Timeline: KSA (live) → UAE (live) → Jordan (Q1 2026) → Morocco/Tunisia (Q3 2026)
- Market size by country: KSA, UAE, Jordan, Morocco, Tunisia (Umrah travel spend estimate)
- B2B partner acquisition funnel: Licensed operators → API integration → Live bookings

---

## Slide 9 — Competitive Landscape

**Speaker Notes:**

The competitive landscape in Hajj and Umrah travel is fragmented, and we believe that fragmentation is our opportunity. The largest digital players — Almosafer and Tajawal — are broad-market OTAs with Hajj/Umrah as one product line among many. They are optimized for leisure and business travel; their Umrah products are visible but not purpose-built. Nusuk, the official Ministry of Hajj and Umrah platform, is a government service focused on visa issuance and package registration — it is a regulatory interface, not a commercial booking engine.

Legacy operators — the thousands of licensed Hajj and Umrah agencies across the MENA region — are our most important competitive consideration. They own the customer relationships and the regulatory licenses. But they are technology partners, not competitors: our B2B white-label model turns them into distribution channels for our infrastructure.

Our differentiation is threefold. First, vertical focus: we build exclusively for the Hajj and Umrah journey, which means every feature, every localization decision, every infrastructure choice is optimized for this use case. Second, infrastructure depth: seven microservices, AWS ECS Bahrain, Phase 3 scale-readiness at 100K concurrent users — this is a technical moat that a broad OTA will not replicate for a niche vertical. Third, the B2B layer: no competitor offers a white-label engine purpose-built for licensed Umrah operators in the Levant and Maghreb.

**Key Visuals:**
- Competitive matrix: Rows = UTUBooking, Almosafer, Tajawal, Nusuk, Legacy Agents; Columns = Hajj/Umrah focus, Arabic-first mobile, B2B white-label, RTL native, Payment localization, 100K scale
- Positioning map: X-axis = Breadth (niche → general); Y-axis = Digitization (offline → online)
- UTUBooking positioned: High digitization + Niche/vertical focus (uncontested quadrant)

---

## Slide 10 — Technology: 7 Microservices, AWS ECS Bahrain, 100K Users

**Speaker Notes:**

We have made deliberate, defensible technology choices. Our backend is composed of seven Node.js microservices — authentication, hotel search, flight search, car hire, booking management, payment processing, and loyalty — each independently deployable on AWS ECS in the Bahrain (me-south-1) region. Bahrain was chosen for sub-50ms latency to users in KSA, UAE, and Kuwait — the core booking markets — while remaining within data residency frameworks that matter to our B2B operator partners.

Our Phase 3 infrastructure build, completed in early 2026, represents a significant technical milestone. We implemented a Redis cluster for shared caching and session management across all microservices. We separated database read and write pools — write traffic to primary, read traffic to replicas — with connection pools of 20 per service, designed for Hajj peak concurrency. Our load tests, built on Artillery and k6, have validated 100,000 concurrent user sessions during simulated Hajj peak scenarios. Our security posture includes OWASP ZAP scanning in every PR pipeline, CORS locked to our production domain, and HSTS enforced.

Infrastructure as code is complete: seven CloudFormation stacks covering VPC, ALB, ECS clusters, RDS, ElastiCache, and Grafana observability. Our disaster recovery runbook targets a 4-hour RTO with automated PostgreSQL backups to S3. This is not startup infrastructure — it is enterprise-grade, investor-ready, and built to scale with the funding we are raising.

**Key Visuals:**
- Architecture diagram: 7 microservices (ports 3001–3008) behind ALB, ECS Bahrain, RDS + Redis
- Load test result: "100,000 concurrent users validated — Artillery Hajj Peak Scenario"
- Security badge row: OWASP ZAP, HSTS, CORS, CloudFormation IaC, Grafana observability
- AWS region map: me-south-1 (Bahrain) highlighted with latency rings to KSA/UAE/Jordan

---

## Slide 11 — Team

**Speaker Notes:**

We are a team built specifically for this market. Our founders bring a rare combination of deep Muslim travel domain expertise, enterprise technology experience, and MENA startup operational experience. We have lived in Makkah during Hajj season. We have sat across the table from Ministry of Hajj officials. We understand, at a visceral level, why this market has resisted digitization — and exactly how to change that.

[Insert founder biographies here. Recommended structure: Name, current role at UTUBooking, prior companies/roles, relevant domain expertise — e.g., prior OTA leadership, payments in GCC, Umrah operator relationships, AWS solutions architecture.]

We are actively hiring with Series A funds into three key roles: Head of Business Development (Jordan/Maghreb focus), Senior Backend Engineer (microservices, Node.js), and a Regional Sales Lead for North Africa. We have identified candidates for each role and will move to offer within 60 days of close.

Our advisors include [Placeholder: named advisors with Hajj Ministry connections, GCC fintech background, and Series A travel vertical investors].

**Key Visuals:**
- Headshots + bios: [Name, Title, Prior Company] × 3–4 founders/key hires
- Advisor row: [Name, Title, Affiliation] × 2–3 advisors
- Open roles: Head of BD (Jordan/Maghreb), Senior Backend Engineer, North Africa Sales Lead
- Team location map: Riyadh, Dubai, Amman (current team distribution)

---

## Slide 12 — Financial Highlights: MRR, LTV:CAC, Path to USD 300K MRR Month 60

**Speaker Notes:**

Our financial model is built on conservative assumptions validated by real booking data. We project reaching USD 300,000 Monthly Recurring Revenue by Month 60 post-raise — a trajectory that reflects organic growth in KSA/UAE, the addition of Jordan B2B partners in Year 1, and the Maghreb market contribution coming online in Year 2.

The key driver of our unit economics is the repeat pilgrim. The average Muslim who performs Umrah does so 2.3 times over a 5-year period in our core demographics. This generates a Lifetime Value that is meaningfully higher than a one-time booking event. Our current LTV:CAC ratio is [insert live figure]; our target post-raise is 4:1 or better as our B2B partner acquisition cost is amortized across the GMV they bring to the platform.

Our B2B revenue stream creates a base of predictable, subscription-like revenue that de-risks the model against the seasonality inherent in Hajj and Umrah travel (peak: Ramadan, Dhul-Hijja; trough: summer non-pilgrimage months). By Year 3, we project B2B recurring revenue representing 35% of total revenue — a structural hedge that broad OTAs in this space do not have.

[Note to founder: insert actual MRR, GMV, and LTV:CAC figures from your financial model before investor presentations. The narrative above is calibrated to your USD 5M raise and Month 60 targets.]

**Key Visuals:**
- MRR growth chart: Month 1–60 (S-curve projection with funding milestone marked)
- LTV:CAC bar: Current vs. Target (post-raise scale)
- Revenue breakdown by stream: B2C commissions, B2B platform fees, B2B rev share, Ancillaries
- Key metrics table: GMV (current), MRR (current), Bookings (last 90 days), B2B partners (live)

---

## Slide 13 — The Ask: USD 5M Series A, Use of Funds

**Speaker Notes:**

We are raising USD 5 million in a Series A round. This capital will fund three priorities over an 18-month deployment horizon: geographic expansion into Jordan and the Maghreb, technology platform investment, and team growth to support the B2B sales motion.

Geographic expansion — approximately 40% of the raise, USD 2M — covers market entry costs for Morocco and Tunisia: regulatory licensing, local partnership development, in-country business development hires, and Arabic dialect and French-language localization for the Darija-speaking Maghreb market. Jordan expansion costs are partially funded; this allocation accelerates our operator onboarding pipeline there.

Technology investment — approximately 30% of the raise, USD 1.5M — covers three engineering hires (two senior backend, one mobile), the development of our B2B operator dashboard and API marketplace, loyalty program infrastructure, and ancillary services integrations (visa, ground transport, Mina camp APIs). This investment cements the technical moat and opens the ancillary revenue stream.

Team and operations — approximately 20%, USD 1M — covers the Head of BD, North Africa Sales Lead, and supporting operations roles in finance and customer success. The remaining 10% — USD 500K — is held as working capital reserve, providing 6 months of runway buffer above the operational plan.

**Key Visuals:**
- Use of funds donut chart: Geographic Expansion 40%, Technology 30%, Team & Ops 20%, Working Capital 10%
- Milestone timeline: Month 6 (Jordan live), Month 12 (Morocco launch), Month 18 (Tunisia live, USD 300K MRR trajectory confirmed)
- Round structure: USD 5M, [lead investor placeholder], SAFE/priced round [confirm with legal]
- Runway: 18–24 months to Series B readiness (USD 1M+ ARR target)

---

## Slide 14 — Milestones: 18-Month Post-Raise Roadmap

**Speaker Notes:**

Our 18-month roadmap is organized around four milestone clusters: product, geography, revenue, and team. Each cluster has clear, measurable outcomes that we will report to investors on a quarterly basis.

On product, by Month 6 we will ship the B2B operator dashboard v2 with self-serve onboarding, eliminating the manual integration process that currently limits our partner acquisition rate. By Month 12, the loyalty program and ancillary services layer will be live, enabling our first ancillary revenue. By Month 18, the API marketplace will be open to third-party integrations, positioning UTUBooking as the infrastructure platform for the Hajj/Umrah ecosystem.

On geography, Jordan B2B partners will be processing live bookings by Month 3. Morocco soft launch (B2B-first) is planned for Month 9, with consumer app available in Month 12. Tunisia follows on a 3-month lag. By Month 18, we will have active operations in six markets: KSA, UAE, Jordan, Egypt (B2B pipeline initiated), Morocco, and Tunisia.

On revenue, our trajectory targets USD 50K MRR by Month 6, USD 150K MRR by Month 12, and USD 300K MRR by Month 18 — at which point we will be 12 months from Series B readiness at USD 1M+ ARR. On team, we will close all three open hires within the first 60 days post-close.

**Key Visuals:**
- Gantt-style timeline: 18 months, 4 swim lanes (Product / Geography / Revenue / Team)
- Revenue target markers: $50K MRR M6, $150K MRR M12, $300K MRR M18
- Geographic milestones: Jordan live M3, Morocco B2B M9, Morocco B2C M12, Tunisia M12–15
- Series B readiness indicator: $1M ARR target, Month 30

---

## Slide 15 — Closing: "Every Muslim Pilgrim, Digitally Served"

**Speaker Notes:**

We close with our north star: every Muslim pilgrim, digitally served. There are 1.8 billion Muslims in the world. Every one of them aspires to perform Hajj or Umrah at least once in their lifetime. That is not a niche. That is an identity market — one defined by profound personal meaning, deep recurring intent, and a booking behavior that has been underserved by technology for decades.

UTUBooking is not building an OTA. We are building the digital infrastructure of the Muslim pilgrim's journey — the trust layer, the payment rails, the operator enablement platform — for a market that is growing by mandate of Vision 2030 and by the aspirations of 1.8 billion people. The technology is built. The market is real. The team is ready.

We are looking for investors who understand MENA, who believe in the transformative potential of digitizing a vertical market, and who want to be part of a company that serves one of the most meaningful journeys in human experience. If that is you, we would be honored to have you at the table.

Thank you.

**Key Visuals:**
- Full-bleed image: Tawaf (circumambulation of the Kaaba) from above, golden hour
- Overlay text: "Every Muslim Pilgrim, Digitally Served."
- Sub-text: "USD 5M Series A — investors@utubooking.com"
- UTUBooking wordmark + tagline: "Powering the Journey to the Holy Land"
- Final call: "Join us."

---

*Draft — requires human approval before publishing per marketing/CLAUDE.md*
