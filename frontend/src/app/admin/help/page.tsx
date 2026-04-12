'use client';

import { useState, useEffect } from 'react';

// ─── Data model ──────────────────────────────────────────────────────────────

interface TabRow {
  name: string;
  shows: string;
  actions: string;
}

interface Task {
  title: string;
  steps: string[];
}

interface ChapterDef {
  id: string;
  num: number;
  title: string;
  route: string;
  purpose: string;
  tabs: TabRow[];
  tasks: Task[];
  aiFeature?: string;
  tips: string[];
}

// ─── Chapter data ─────────────────────────────────────────────────────────────

const CHAPTERS: ChapterDef[] = [
  {
    id: 'ch-01-getting-started',
    num: 1,
    title: 'Getting Started & Navigation',
    route: '/admin',
    purpose:
      'The UTUBooking Admin Portal is the central control plane for the entire platform. It covers 23 departments — from revenue optimization and fraud prevention to HR and legal — all accessible from the collapsible sidebar. This chapter explains how to log in, navigate, and make use of the global AI assistant.',
    tabs: [
      { name: 'Sidebar', shows: 'All 26 navigation sections grouped by department', actions: 'Click any link to navigate; active page is highlighted in blue' },
      { name: 'Top Bar', shows: 'Brand logo, workflow task badge, Sign Out button', actions: 'Click task badge to open My Task Inbox; Sign Out ends your session' },
      { name: 'AI Chat', shows: 'Floating chat button present on every admin page', actions: 'Ask any business question; AI reads the current page context' },
    ],
    tasks: [
      {
        title: 'Log in to the admin portal',
        steps: [
          'Navigate to /admin/login in your browser.',
          'Enter your admin email and password.',
          'On success you are redirected to /admin (Revenue Optimization Dashboard).',
        ],
      },
      {
        title: 'Navigate to a department',
        steps: [
          'Locate the relevant section heading in the left sidebar (e.g. "Fraud & Risk", "Finance").',
          'Click the department link — the sidebar item turns blue to confirm the active page.',
          'Use the browser Back button or click another link to change departments.',
        ],
      },
      {
        title: 'Use the floating AI assistant',
        steps: [
          'Click the AI chat button in the bottom-right corner of any page.',
          'Type your question in plain English or Arabic (e.g. "How many open fraud cases?").',
          'The AI reads live data from the current department and responds with insights.',
          'Close the chat panel by clicking the X — your history persists for the session.',
        ],
      },
      {
        title: 'Sign out safely',
        steps: [
          'Click "Sign Out" in the top-right corner of the header.',
          'Your session cookie is cleared and you are redirected to /admin/login.',
        ],
      },
    ],
    aiFeature:
      'The floating AdminAIChat assistant is available on every page. It is context-aware — ask it about the data displayed on the current page and it will respond with department-specific insights. It does not send emails or make changes without your explicit approval.',
    tips: [
      'Bookmark deep links (e.g. /admin/fraud, /admin/finance) to jump directly to a department.',
      'The workflow task badge in the header shows pending approvals across all departments — check it daily.',
      'The sidebar scrolls independently — scroll down to find Infrastructure, AI Intelligence, and Help sections.',
    ],
  },

  {
    id: 'ch-02-revenue-dashboard',
    num: 2,
    title: 'Revenue Optimization Dashboard',
    route: '/admin',
    purpose:
      'The main admin landing page is the Revenue Optimization Dashboard — your daily high-level view of platform health. It surfaces RevPAR (Revenue Per Available Room) by market, the conversion funnel by country and device, platform-wide booking statistics, and AI-generated pricing recommendations waiting for your review.',
    tabs: [
      { name: 'Platform Stats', shows: 'Total users, pending approvals, inventory count, revenue MTD', actions: 'Read-only overview — click individual stats to drill into the relevant department' },
      { name: 'RevPAR', shows: 'Revenue Per Available Room progress bars by market (KSA, UAE, TR, ID, MY…)', actions: 'Compare actual vs target; green = on track, amber = lagging, red = below 90%' },
      { name: 'Conversion Funnel', shows: 'Search → view → book drop-off rates segmented by country and device', actions: 'Identify underperforming markets; share with Marketing agent for campaign action' },
      { name: 'AI Pricing Recs', shows: 'AI-generated pricing adjustment suggestions with confidence scores', actions: 'Accept or Reject each recommendation; accepted recs create pricing rules automatically' },
    ],
    tasks: [
      {
        title: 'Read your RevPAR progress at a glance',
        steps: [
          'Look at the RevPAR widget — each market shows a progress bar.',
          'Green (≥100%) = target met. Amber (90–99%) = close. Red (<90%) = action needed.',
          'Click through to /admin/revenue to create or adjust pricing rules for underperforming markets.',
        ],
      },
      {
        title: 'Accept an AI pricing recommendation',
        steps: [
          'Locate the AI Pricing Recommendations widget on the dashboard.',
          'Review the suggested adjustment: market, % change, and confidence score.',
          'Click Accept — the recommendation is automatically converted into an active pricing rule.',
          'Click Reject if the suggestion is inappropriate — the AI notes your feedback.',
        ],
      },
      {
        title: 'Analyse the conversion funnel',
        steps: [
          'Open the Conversion Funnel widget.',
          'Select a country or device filter to isolate a segment.',
          'Note which step (search → view or view → book) has the highest drop-off.',
          'Share the finding with the Marketing agent to investigate targeted campaigns.',
        ],
      },
    ],
    aiFeature:
      'The AI Pricing Recommendations widget surfaces dynamic pricing suggestions generated by the Pricing Service (port 3011). Each recommendation shows a confidence score — green (≥80%) means high confidence and can usually be accepted directly; amber (60–79%) warrants a manual check; red (<60%) should be reviewed carefully before accepting.',
    tips: [
      'Accept AI pricing recs with ≥80% confidence first — they have the highest revenue impact.',
      'RevPAR targets for Hajj season are automatically elevated by 35% — check the Revenue department for rule setup.',
      'The dashboard auto-refreshes every 60 seconds — no need to reload manually.',
    ],
  },

  {
    id: 'ch-03-bookings',
    num: 3,
    title: 'Bookings Management',
    route: '/admin/bookings',
    purpose:
      'The Bookings page gives you a unified view of all platform bookings — hotels, flights, and car rentals — across every market. You can filter by status, type, and date, update booking statuses manually, and trigger AI-powered booking insights to spot anomalies and trends.',
    tabs: [
      { name: 'Booking List', shows: 'All bookings with status, type, traveller, amount, and booking date', actions: 'Filter by status/type; update status via dropdown; view booking detail' },
      { name: 'AI Insights', shows: 'AI analysis of booking patterns, anomalies, and health score', actions: 'Click "Run Insights" to trigger analysis; review flagged bookings' },
    ],
    tasks: [
      {
        title: 'Filter bookings by status and type',
        steps: [
          'Use the Status filter (pending / confirmed / cancelled / refunded / no_show).',
          'Use the Type filter (hotel / flight / car).',
          'Results update immediately — combine both filters for precision.',
        ],
      },
      {
        title: 'Update a booking status',
        steps: [
          'Locate the booking in the list.',
          'Click the status badge or the edit icon to open the status dropdown.',
          'Select the new status and confirm — a change log entry is created automatically.',
        ],
      },
      {
        title: 'Trigger AI Booking Insights',
        steps: [
          'Click the "AI Insights" collapsible panel.',
          'Click "Analyze" — the AI scans current booking data.',
          'Review the health score, anomaly flags, and recommended actions.',
        ],
      },
    ],
    aiFeature:
      'The AI Booking Insights panel performs a real-time scan of the booking queue. It returns a health score (0–100), surfaces anomalies (e.g. unusually high cancellation rate in a market), and flags individual bookings that may need manual review. Refresh the analysis after bulk status changes.',
    tips: [
      'Status colour guide: amber = pending, green = confirmed, red = cancelled, purple = refunded.',
      'Results page at 50 per page — use filters rather than scrolling through large datasets.',
      'Hajj bookings flagged with a crescent badge are treated as highest priority — never cancel without CEO approval.',
    ],
  },

  {
    id: 'ch-04-analytics',
    num: 4,
    title: 'Analytics & BI Dashboard',
    route: '/admin/analytics',
    purpose:
      'The Analytics department is the platform\'s business intelligence layer. It lets you define KPI targets across all departments, build custom dashboards, schedule recurring reports, and configure automated alerts that fire when a metric crosses a threshold. Think of it as the control room for data-driven decisions.',
    tabs: [
      { name: 'Overview', shows: 'Summary cards: KPIs on target, off target, active alerts, reports count', actions: 'Quick read of BI health; click cards to jump to relevant tab' },
      { name: 'KPI Targets', shows: 'All defined KPIs with category, unit, period, current value, target, and hit %', actions: 'Create / edit / delete KPIs; progress bar turns red/amber/green based on attainment' },
      { name: 'Dashboards', shows: 'Custom dashboard library with title, creator, and last-updated date', actions: 'Create / edit / delete dashboards; pin widgets to a dashboard' },
      { name: 'Reports', shows: 'Scheduled and on-demand BI reports with run history', actions: 'Create report definitions; run on demand; download output' },
      { name: 'Alerts', shows: 'Alert rules with condition, threshold, and last-triggered timestamp', actions: 'Create / edit / delete alerts; toggle alert active/inactive' },
    ],
    tasks: [
      {
        title: 'Create a new KPI target',
        steps: [
          'Go to the KPI Targets tab and click "Add KPI".',
          'Fill in: Name, Category (revenue / bookings / users / conversion / retention / operations), Unit (SAR / % / count / ms / days), Period (daily / weekly / monthly / quarterly / annual), and Target value.',
          'Click Save — the KPI appears in the list with a progress bar.',
          'The traffic light updates automatically: green ≥100%, amber 90–99%, red <90%.',
          'KPI current values are sourced from the live database — no manual input needed.',
        ],
      },
      {
        title: 'Set an alert threshold',
        steps: [
          'Go to the Alerts tab and click "Add Alert".',
          'Select a KPI and choose a condition: below_target / above_target / below_threshold / above_threshold.',
          'Enter the threshold value and choose notification recipients.',
          'Save and toggle the alert to Active.',
        ],
      },
      {
        title: 'Build a custom dashboard',
        steps: [
          'Go to the Dashboards tab and click "New Dashboard".',
          'Enter a name and choose which KPI widgets to pin.',
          'Drag to reorder widgets, then Save.',
          'Share the dashboard URL with team members for their daily review.',
        ],
      },
      {
        title: 'Run a saved report on demand',
        steps: [
          'Go to the Reports tab and find the report.',
          'Click "Run Now" — the report processes and a download link appears.',
          'Click Download to export as CSV or PDF.',
        ],
      },
    ],
    aiFeature:
      'The AI KPI Analyser runs automatically when an alert fires. It returns a plain-language explanation of why the KPI is off target and a recommended corrective action (e.g. "Conversion rate drop in Malaysia driven by Iyzico payment timeout — check PRC-001"). You can also trigger a manual analysis on any KPI from the KPI Targets tab.',
    tips: [
      'The 8 seeded platform KPIs (Revenue SAR 5M, Conversion 3.2%, MAU 50K, NPS 50, etc.) are pre-configured — edit their targets to match your current goals.',
      'Traffic light logic applies separately for cost metrics (lower is better): <90% of target = green for cost KPIs.',
      'Set alerts for both below_target AND above_threshold on revenue to catch unexpected spikes as well as shortfalls.',
    ],
  },

  {
    id: 'ch-05-finance',
    num: 5,
    title: 'Finance Department',
    route: '/admin/finance',
    purpose:
      'Finance is the hub for all monetary operations: managing vendor relationships, tracking invoices, controlling budgets, processing expense claims, and issuing refunds. It also handles payment gateway reconciliation across 25+ markets. All financial actions above SAR 10,000 require CEO approval.',
    tabs: [
      { name: 'Overview', shows: 'Revenue today / week / month / YTD; product breakdown (hotels, flights, cars); daily revenue bar chart', actions: 'Read-only snapshot; use for daily finance briefing' },
      { name: 'Vendors', shows: 'All vendor records with type, status, and last-payment date', actions: 'Add / edit / delete vendors; run AI vendor due-diligence per vendor' },
      { name: 'Invoices', shows: 'Invoice pipeline with status, amount, due date, and supplier', actions: 'Create / approve / pay invoices; flag as disputed; generate overdue report' },
      { name: 'Budgets', shows: 'Budget envelopes with department, period, total allocation, and spend-to-date', actions: 'Create budgets; add / edit line items; approve budget requests' },
      { name: 'Expense Claims', shows: 'Employee expense submissions with status and category', actions: 'Approve / reject claims; run AI expense analysis; export for payroll' },
      { name: 'Reconciliation', shows: 'Daily/weekly gateway reconciliation reports', actions: 'Review matched and unmatched transactions; flag discrepancies' },
      { name: 'Refunds', shows: 'Pending and processed refund queue', actions: 'Approve refunds within authority; escalate large refunds to CEO' },
    ],
    tasks: [
      {
        title: 'Add a new vendor',
        steps: [
          'Go to the Vendors tab and click "Add Vendor".',
          'Enter: Name, Type (payment_gateway / hotel_supplier / airline_GDS / SaaS / professional_services / infrastructure), Country, Contact email.',
          'Set Status to "active" once paperwork is signed.',
          'Run AI Vendor Due-Diligence to check for compliance flags before activating.',
        ],
      },
      {
        title: 'Approve an invoice',
        steps: [
          'Go to the Invoices tab and filter by status = "pending".',
          'Open the invoice and verify amount, supplier, and due date.',
          'Click Approve — status changes to "approved" and is queued for payment.',
        ],
      },
      {
        title: 'Create a budget with line items',
        steps: [
          'Go to the Budgets tab and click "New Budget".',
          'Set: Department, Period (monthly / quarterly / annual), and Total Allocation (SAR).',
          'Click Save, then open the budget and click "Add Line Item" for each cost category.',
          'Set allocation per line item — the system tracks spend vs allocation in real time.',
          'Submit for approval if the total exceeds your authority level.',
        ],
      },
      {
        title: 'Process an expense claim',
        steps: [
          'Go to Expense Claims and filter by status = "pending".',
          'Review the claim: amount, category, receipt attachment.',
          'Click Approve or Reject (add a rejection reason).',
          'Approved claims are exported to payroll at month-end.',
        ],
      },
      {
        title: 'Issue a refund',
        steps: [
          'Go to Refunds tab and find the refund request.',
          'Verify booking reference, refund amount, and reason.',
          'If amount < SAR 1,000: self-approve. If SAR 1,000–9,999: Finance Agent + CS Agent. If ≥ SAR 10,000: CEO approval required.',
        ],
      },
    ],
    aiFeature:
      'Two AI tools are available: AI Vendor Due-Diligence (per-vendor button) checks for sanctions exposure, GDPR compliance gaps, and SOC 2 certification status; AI Expense Analyser (on the Expense Claims tab) identifies spending anomalies, duplicate submissions, and policy violations across the current month\'s claims.',
    tips: [
      'Vendor types help route invoices correctly — always set the correct type during onboarding.',
      'Reconciliation auto-runs daily at midnight — review the report each morning for unmatched transactions.',
      'Overdue invoices (past due date with status "pending") are highlighted in red — prioritise these to avoid late fees with suppliers.',
    ],
  },

  {
    id: 'ch-06-revenue-pricing',
    num: 6,
    title: 'Revenue & Pricing — Yield Management',
    route: '/admin/revenue',
    purpose:
      'The Revenue department controls all dynamic pricing logic for the platform. You can create pricing rules for seasons and events, block out dates when booking is not permitted, apply manual price overrides, and review AI-generated pricing recommendations with confidence scores. Pricing rules feed directly into the live booking engine.',
    tabs: [
      { name: 'Overview', shows: 'Active rule count, blackout periods, overrides, pending AI recs, and RevPAR targets with progress bars', actions: 'Read RevPAR attainment; identify which targets need attention' },
      { name: 'Pricing Rules', shows: 'All pricing rules with type, adjustment %, priority, and active status', actions: 'Create / edit / delete rules; toggle active/inactive; reorder by priority' },
      { name: 'Blackout Periods', shows: 'Date ranges where bookings are blocked (e.g. Hajj quota exhaustion)', actions: 'Create / edit / delete blackouts; set per-market scope' },
      { name: 'Manual Overrides', shows: 'Temporary price overrides for specific properties or markets', actions: 'Create / edit / delete overrides; set expiry date' },
      { name: 'AI Audit', shows: 'AI-generated pricing recommendations awaiting decision', actions: 'Accept or Reject each recommendation; view confidence score and rationale' },
    ],
    tasks: [
      {
        title: 'Create a seasonal pricing rule',
        steps: [
          'Go to Pricing Rules tab and click "Add Rule".',
          'Set Type = "seasonal", enter the date range, adjustment % (e.g. +35% for Hajj), and market scope.',
          'Set Priority — lower numbers override higher ones (Priority 1 = highest).',
          'Toggle Active = on to make it live immediately.',
        ],
      },
      {
        title: 'Set a blackout period',
        steps: [
          'Go to Blackout Periods tab and click "Add Blackout".',
          'Enter the start and end date, reason, and which markets/properties it applies to.',
          'Save — bookings for the blocked dates will be rejected at checkout.',
          'Note: blackouts override all pricing rules for their date range.',
        ],
      },
      {
        title: 'Apply a manual override',
        steps: [
          'Go to Manual Overrides and click "Add Override".',
          'Specify the property, market, price (SAR), and validity window.',
          'The override takes precedence over all pricing rules until its expiry date.',
        ],
      },
      {
        title: 'Review AI audit recommendations',
        steps: [
          'Go to the AI Audit tab — recommendations are listed by confidence score.',
          'Read the rationale for each suggestion (e.g. "Demand spike detected in Makkah: +15% recommended").',
          'Click Accept to convert to a pricing rule, or Reject to dismiss.',
          'Accepted recommendations are automatically added to Pricing Rules with the suggested values.',
        ],
      },
      {
        title: 'Monitor RevPAR targets',
        steps: [
          'Open the Overview tab.',
          'Scan the RevPAR target cards — each shows actual vs target with a progress bar.',
          'For any market below 90%, go to Pricing Rules and consider increasing the base adjustment or creating an event rule.',
        ],
      },
    ],
    aiFeature:
      'The AI Audit tab surfaces pricing recommendations from the Pricing Service (port 3011). Confidence scores are colour-coded: green (≥80%) = high confidence, accept with minimal review; amber (60–79%) = moderate confidence, review rationale; red (<60%) = low confidence, always review manually. Accepted recs become active pricing rules instantly.',
    tips: [
      'Standard seasonal uplifts: Ramadan +20%, Hajj +35%, Eid +15%. Pre-configure these at the start of the year.',
      'Priority 1 rules always win — use this for manual overrides and emergency price changes.',
      'Blackouts completely suppress AI pricing suggestions for the blocked date range.',
    ],
  },

  {
    id: 'ch-07-customer-success',
    num: 7,
    title: 'Customer Success',
    route: '/admin/customer-success',
    purpose:
      'Customer Success manages account health, proactive outreach, and escalations for UTUBooking\'s key customer accounts. The goal is to reduce churn by catching at-risk accounts early, logging meaningful touchpoints, and resolving escalations quickly. The NPS target is 50 (current: 42).',
    tabs: [
      { name: 'Overview', shows: 'KPI cards: active accounts, at-risk accounts, open escalations, average health score', actions: 'Quick read of account portfolio health; click cards to filter the Accounts tab' },
      { name: 'Accounts', shows: 'All CS accounts with tier, status, health score, and last touchpoint date', actions: 'Create / edit accounts; run AI health analysis per account; log touchpoints' },
      { name: 'Escalations', shows: 'Open and resolved escalations with priority and status', actions: 'Create / update / resolve escalations; set priority; link to account' },
      { name: 'Activity Log', shows: 'Full chronological log of all touchpoints across all accounts', actions: 'Search and filter by account, type, or date range' },
    ],
    tasks: [
      {
        title: 'Identify at-risk accounts',
        steps: [
          'Go to Accounts tab and filter by Status = "at_risk".',
          'Sort by health score ascending to see the most critical accounts first.',
          'Click into each account to see the last touchpoint date and escalation history.',
        ],
      },
      {
        title: 'Log a customer touchpoint',
        steps: [
          'Open the account record.',
          'Click "Add Touchpoint".',
          'Choose type (call / email / check_in / training / meeting), add notes, and save.',
          'The last_touchpoint_at field updates automatically — important for churn monitoring.',
        ],
      },
      {
        title: 'Create an escalation',
        steps: [
          'Go to the Escalations tab and click "New Escalation".',
          'Select the account, set priority (P1–P4), describe the issue, and assign an owner.',
          'P1 escalations (stranded traveller, Hajj hotel issue) notify CEO immediately.',
          'Set a target resolution date — SLA timers are tracked automatically.',
        ],
      },
      {
        title: 'Resolve an escalation',
        steps: [
          'Open the escalation and review the resolution notes.',
          'Update status to "resolved" and add a resolution summary.',
          'Notify the customer of the resolution (drafts require CEO approval before sending).',
        ],
      },
      {
        title: 'Run AI account health analysis',
        steps: [
          'Open any account record and click "Run AI Analysis".',
          'The AI returns: churn risk level, health score, engagement trend, strengths, and recommended next touchpoints.',
          'Act on the recommendations — log the touchpoint immediately after the outreach.',
        ],
      },
    ],
    aiFeature:
      'The AI Account Health Modal analyses each individual account and returns a churn risk level (critical / high / medium / low), health score (0–100), engagement trend (improving / stable / declining / at_risk), specific concerns and strengths, and the recommended next touchpoint type and timing.',
    tips: [
      'Any account with no touchpoint in 30+ days should be flagged — filter Accounts by last_touchpoint_at.',
      'Churn risk colours: red = critical, orange = high, yellow = medium, grey = low.',
      'NPS detractors (score 0–6) must receive a personal follow-up within 48 hours — not a template response.',
    ],
  },

  {
    id: 'ch-08-sales-crm',
    num: 8,
    title: 'Sales & CRM',
    route: '/admin/sales',
    purpose:
      'The Sales department manages the full B2B pipeline: hotel partner deals, white-label reseller agreements, investor conversations, and individual sales rep quotas. The CRM tracks every deal from initial lead through to signed contract, with AI coaching available at every stage.',
    tabs: [
      { name: 'Overview', shows: 'Pipeline value, stage distribution, overdue deal count, top reps by quota attainment', actions: 'Read-only pipeline health summary' },
      { name: 'Deals', shows: 'All deals with type, stage, value, owner, and next action date', actions: 'Create / edit / delete deals; advance stage; log activities; export to CSV' },
      { name: 'Hotel Partners', shows: 'Direct hotel partner prospects and signed partners with priority, city, and status', actions: 'Create / edit partners; log outreach activities; track last_contacted_at' },
      { name: 'Activities', shows: 'All logged sales activities (calls, emails, demos, meetings) across all deals', actions: 'Log new activities; filter by deal or rep' },
      { name: 'Sales Reps', shows: 'Rep directory with assigned quota and attainment %', actions: 'Add reps; set quotas; track performance' },
      { name: 'Contacts', shows: 'Contact records linked to deals', actions: 'Add / edit contacts; link to LinkedIn profiles' },
    ],
    tasks: [
      {
        title: 'Create a new deal',
        steps: [
          'Go to Deals tab and click "New Deal".',
          'Set: Title, Partner Name, Type (hotel_partner / b2b_whitelabel / airline / investor / other), Stage = "lead", Value, and Owner.',
          'Save — the deal appears in the pipeline at stage "lead".',
          'Log the first activity immediately (e.g. "initial outreach email sent").',
        ],
      },
      {
        title: 'Advance a deal through pipeline stages',
        steps: [
          'Open the deal and click "Edit".',
          'Change Stage from current to next: lead → qualified → demo → proposal → negotiation → won / lost.',
          'Update next_action_date to the scheduled follow-up.',
          'An activity log entry is created automatically when the stage changes.',
        ],
      },
      {
        title: 'Add a hotel partner prospect',
        steps: [
          'Go to Hotel Partners tab and click "Add Partner".',
          'Enter: Hotel Name, City, Stars, Distance to Haram (for Makkah/Madinah), and Priority (1 = highest).',
          'Set outreach_status = "prospect" initially.',
          'Log first outreach activity after CEO approves the email draft.',
        ],
      },
      {
        title: 'Log a sales activity',
        steps: [
          'Open the deal or hotel partner record.',
          'Click "Log Activity" and choose type (call / email / demo / meeting / proposal_sent / follow_up / note).',
          'Add notes and set a next_action_date, then save.',
        ],
      },
      {
        title: 'Run AI deal coaching',
        steps: [
          'Open any deal and click "AI Deal Analysis".',
          'The AI returns a win probability, risk flags, and next-best-action recommendation for the current stage.',
          'Log the recommended action as an activity to track execution.',
        ],
      },
    ],
    aiFeature:
      'Two AI tools are available: AI Deal Analysis provides a win probability score and risk assessment per deal; AI Deal Coach generates specific next-best-action recommendations based on the current stage, deal size, and time since last activity. Any deal in proposal or negotiation for >14 days with no activity is automatically flagged.',
    tips: [
      'Overdue deals (next_action_date in the past) are highlighted — check the "Overdue" filter daily.',
      'Makkah and Madinah hotel partners at Priority 1 are business-critical — treat them as P1 regardless of deal size.',
      'Export deals to CSV for monthly board reporting via the Deals tab export button.',
    ],
  },

  {
    id: 'ch-09-corporate-travel',
    num: 9,
    title: 'Corporate Travel',
    route: '/admin/corporate',
    purpose:
      'Corporate Travel manages B2B accounts for companies booking travel for their employees — government ministries, oil & gas companies, banks, and large enterprises. This is UTUBooking\'s highest-value customer segment, with accounts potentially worth SAR 500K+ per year.',
    tabs: [
      { name: 'Overview', shows: 'Active accounts, prospects, total corporate spend, new applications this month', actions: 'Read account portfolio health at a glance' },
      { name: 'Accounts', shows: 'All corporate accounts with tier, status, spend, and contract expiry', actions: 'Create / activate / deactivate accounts; add contacts; set travel policy' },
      { name: 'Enquiries', shows: 'Inbound corporate travel enquiries pipeline', actions: 'Qualify / contact / convert enquiries; draft responses for CEO approval' },
      { name: 'Bookings', shows: 'Corporate bookings requiring admin confirmation', actions: 'Approve or reject corporate booking requests' },
      { name: 'Employees', shows: 'Employee traveller profiles linked to corporate accounts', actions: 'Add / edit employee records; set booking permissions' },
      { name: 'Groups', shows: 'Group travel bookings (e.g. delegation trips)', actions: 'Create and manage group itineraries' },
    ],
    tasks: [
      {
        title: 'Create a corporate account',
        steps: [
          'Go to Accounts tab and click "New Account".',
          'Enter: Company Name, Industry, Country, Tier (enterprise / premium / standard), and annual_travel_budget_sar.',
          'Set travel policy fields: max_flight_class, max_hotel_stars, per_diem_sar, preferred_airlines, advance_booking_days.',
          'Add a travel_manager contact before activating portal access.',
        ],
      },
      {
        title: 'Qualify an inbound enquiry',
        steps: [
          'Go to Enquiries tab and open a new enquiry (status = "new").',
          'Estimate annual value: traveller_count × 12 trips × SAR 3,000 avg (government: ×1.5, oil & gas: ×2.0).',
          'Update status to "contacted" after CEO approves the response email.',
          'Advance to "qualified" once a discovery call is scheduled.',
        ],
      },
      {
        title: 'Activate the corporate portal',
        steps: [
          'Ensure account record is complete (travel policy set, travel_manager contact added, contract signed).',
          'Click "Activate Portal" — this creates a portal login for the travel_manager.',
          'Send the login credentials via secure channel (do NOT email plaintext passwords).',
        ],
      },
    ],
    tips: [
      'Account tiers: enterprise (>SAR 500K/year), premium (SAR 100K–500K), standard (<SAR 100K).',
      'Government and oil & gas enquiries are treated as P1 — CEO is notified on the same day.',
      'Any enterprise account silent for 30+ days needs a CEO check-in call — do not let it slip.',
    ],
  },

  {
    id: 'ch-10-bizdev',
    num: 10,
    title: 'Business Development',
    route: '/admin/bizdev',
    purpose:
      'Business Development manages strategic partnerships, market expansion initiatives, distribution and affiliate agreements, and the full partner lifecycle from first contact to live and earning. It also covers advertising enquiries from brands wanting to promote on the UTUBooking platform.',
    tabs: [
      { name: 'Overview', shows: 'Active partners, live agreements, partner-generated revenue, market expansion stage', actions: 'Read portfolio health; spot at-risk partners and expiring agreements' },
      { name: 'Partners', shows: 'Partner directory with tier, status, and last activity date', actions: 'Create / edit partners; advance pipeline stage; trigger AI advisor' },
      { name: 'Activities', shows: 'Chronological log of all partner interactions', actions: 'Log calls, emails, meetings, negotiations, and signed events' },
      { name: 'Agreements', shows: 'Partnership agreements with type, term, and expiry', actions: 'Create / edit / renew agreements; track signature status' },
      { name: 'Markets', shows: 'Market expansion targets with status and priority', actions: 'Add new market targets; update status; set priority (critical / high / medium / low)' },
    ],
    tasks: [
      {
        title: 'Add a new partner',
        steps: [
          'Go to Partners tab and click "New Partner".',
          'Enter: Company Name, Type, Country, Tier (platinum / gold / silver / standard), and assign an owner.',
          'Set Status = "prospect" initially.',
          'Log first contact activity within 1 hour of any outreach.',
        ],
      },
      {
        title: 'Advance partner through pipeline',
        steps: [
          'Open the partner record and click "Edit".',
          'Change Stage: prospect → contacted → negotiating → signed → live → paused / churned.',
          'Each stage advance auto-timestamps last_updated_at — use this for SLA tracking.',
        ],
      },
      {
        title: 'Create a distribution agreement',
        steps: [
          'Go to Agreements tab and click "New Agreement".',
          'Set: Partner, Type (service / API / distribution), Term dates, Commission rate, and Key terms.',
          'Mark as "pending_signature" — update to "active" once both parties have signed.',
          'Set a renewal reminder 90 days before expiry.',
        ],
      },
    ],
    aiFeature:
      'The AI BizDev Advisor panel analyses the entire partnership portfolio and returns: overall portfolio health score, at-risk partners (with urgency), agreements expiring in 90 days, top partners to prioritise for development, strategic market gaps, and recommended next actions. Run it weekly as part of the Monday pipeline review.',
    tips: [
      'Partner tiers determine priority of outreach: platinum partners get weekly check-ins, standard get monthly.',
      'An affiliate partner in "pro" tier earns 5% commission; "elite" earns 6% — tier is set on the agreement record.',
      'Market expansion statuses: researching → pilot → launched → paused. Update after each milestone.',
    ],
  },

  {
    id: 'ch-11-fraud-risk',
    num: 11,
    title: 'Fraud & Risk Management',
    route: '/admin/fraud',
    purpose:
      'Fraud & Risk protects the platform from fraudulent transactions, account takeovers, and payment abuse. The system uses automated detection rules to score every transaction (0–100) and routes high-risk cases to a manual review queue. A decision audit trail records every human judgment for compliance.',
    tabs: [
      { name: 'Overview', shows: 'Pending review count, confirmed fraud count, rule count, watchlist size, false positive rate', actions: 'Quick health check; trigger AI Fraud Intelligence analysis' },
      { name: 'Review Queue', shows: 'Cases awaiting manual review with risk scores and severity badges', actions: 'Open case; make decision (dismiss / confirm_fraud / escalate); add notes' },
      { name: 'Rules', shows: 'All active and inactive detection rules with type, priority, and trigger count', actions: 'Create / edit / delete rules; activate / deactivate; adjust thresholds' },
      { name: 'Watchlist', shows: 'Blocked identifiers: emails, IPs, card BINs, device IDs, phone numbers', actions: 'Add entries; set expiry; remove entries; search watchlist' },
      { name: 'Decision Audit', shows: 'Immutable log of every case decision with analyst and timestamp', actions: 'Search and filter by case, decision type, or date range; export for compliance review' },
    ],
    tasks: [
      {
        title: 'Review a flagged transaction',
        steps: [
          'Go to Review Queue — cases are sorted by risk score (highest first).',
          'Open a case and read the risk breakdown (which rules triggered, score components).',
          'Cross-reference with the Decision Audit for this user\'s history.',
          'Choose: Dismiss (false positive), Confirm Fraud (blocks future transactions), or Escalate to CEO.',
        ],
      },
      {
        title: 'Create a fraud detection rule',
        steps: [
          'Go to Rules tab and click "New Rule".',
          'Set: Name, Type (threshold / velocity / geo / device / card / pattern / ML), Trigger condition, Risk score contribution, and Priority.',
          'Toggle Active = on.',
          'Monitor the false positive rate — target is <10%. Adjust thresholds if FP rate rises.',
        ],
      },
      {
        title: 'Add an entry to the watchlist',
        steps: [
          'Go to Watchlist tab and click "Add Entry".',
          'Choose entry type: email / IP / card_bin / device_id / phone.',
          'Enter the value, set expiry (max 90 days unless CEO extends), and add a reason.',
          'EU/UK entries require a note confirming GDPR Art. 22 review was completed.',
        ],
      },
      {
        title: 'Score a case with AI assistance',
        steps: [
          'Open a case from the Review Queue.',
          'Click "AI Score Analysis" — the AI explains the score breakdown in plain language.',
          'Use the AI explanation alongside your own review before making the final decision.',
        ],
      },
      {
        title: 'Export the decision audit for compliance',
        steps: [
          'Go to Decision Audit tab.',
          'Apply date range and decision type filters.',
          'Click Export — downloads a tamper-evident CSV log.',
        ],
      },
    ],
    aiFeature:
      'The AI Fraud Intelligence Advisor (collapsible violet panel on Overview) runs a comprehensive scan of the entire fraud queue and rule set. It returns: overall fraud_health badge (excellent / good / fair / poor), coverage gaps in the rule set, high-risk patterns detected, false positive analysis, and a prioritised list of quick-win improvements. Run daily before the morning briefing.',
    tips: [
      'Risk score thresholds: ≥90 = auto-block, 70–89 = hold for review, 40–69 = monitor, <40 = dismiss.',
      'Watchlist entries expire automatically after 90 days — review and renew only if still needed.',
      'The false positive target is <10% of all flagged cases. If it exceeds this, your rules are too aggressive — raise thresholds.',
    ],
  },

  {
    id: 'ch-12-marketing',
    num: 12,
    title: 'Marketing Hub',
    route: '/admin/marketing',
    purpose:
      'The Marketing Hub is where all content planning, email campaign management, and audience hygiene happens. It supports bilingual content in English and Arabic, a content calendar with approval workflow, template management, and detailed email delivery analytics including bounce and suppression tracking.',
    tabs: [
      { name: 'Calendar', shows: 'Monthly content calendar with planned/draft/review/approved/published status per entry', actions: 'Create / edit calendar entries; advance status through approval workflow' },
      { name: 'Drafts', shows: 'Draft content files (blog posts, email copy, social scripts) with metadata', actions: 'View / download drafts; flag for review; archive' },
      { name: 'Templates', shows: 'Reusable email templates with subject, preview, and language (EN/AR)', actions: 'Create / edit / delete templates; preview render; set as default' },
      { name: 'Campaigns', shows: 'Email campaigns with status (draft / scheduled / sent / cancelled) and performance metrics', actions: 'Create / schedule / send / duplicate / cancel campaigns; view open/click rates' },
      { name: 'Email Log', shows: 'Per-message delivery log with sent, bounce, and suppression status', actions: 'Search by recipient; identify bounce patterns; export for analysis' },
      { name: 'Suppressions', shows: 'Opted-out and bounced addresses that should not receive emails', actions: 'Search suppression list; lift suppression with reason; bulk import' },
      { name: 'Analysis', shows: 'AI-powered campaign performance analysis', actions: 'Trigger AI analysis; review content recommendations' },
    ],
    tasks: [
      {
        title: 'Schedule a content calendar entry',
        steps: [
          'Go to Calendar tab and click "Add Entry".',
          'Set: Title, Type (blog / email / social / video), Publish Date, Assigned Writer, Language (EN / AR).',
          'Save at status = "planned".',
          'Advance through statuses: planned → draft → review → approved → published.',
        ],
      },
      {
        title: 'Create and send an email campaign',
        steps: [
          'Go to Campaigns tab and click "New Campaign".',
          'Select a template, set subject line, choose audience segment, and set a send date.',
          'Save as "draft" — review with team.',
          'Update status to "scheduled" once approved.',
          'The notification service sends automatically at the scheduled time.',
        ],
      },
      {
        title: 'Manage suppression list',
        steps: [
          'Go to Suppressions tab and search for a specific address.',
          'To lift a suppression: click the address, add a reason (e.g. "Customer re-subscribed"), and click "Lift".',
          'The address is removed from the suppression list and will receive future emails.',
        ],
      },
      {
        title: 'Duplicate a high-performing campaign',
        steps: [
          'Go to Campaigns tab and find a campaign with strong open/click rates.',
          'Click "Duplicate" — a copy is created at draft status.',
          'Edit the copy: adjust subject, update date, and revise audience if needed.',
        ],
      },
    ],
    aiFeature:
      'The AI Campaign Analysis tool (Analysis tab) reviews all sent campaigns and returns: best-performing content types, optimal send times by market and device, subject line recommendations, and audience segment performance breakdown. Run it monthly to update your content strategy.',
    tips: [
      'All content is draft-only until published — never mark as published without a human review step.',
      'Arabic content (AR language flag) must pass Gulf Arabic speaker review before scheduling.',
      'Suppression list is automatically updated when a user unsubscribes or email bounces — never override suppressions without a documented reason.',
    ],
  },

  {
    id: 'ch-13-hr',
    num: 13,
    title: 'HR Department',
    route: '/admin/hr',
    purpose:
      'The HR Department manages the UTUBooking team across 10+ jurisdictions — from Saudi Arabia and the UAE to the UK, Germany, and France. It handles employee records, department structure, leave requests, annual leave balances, and the organisational chart. All employment actions require jurisdiction-specific legal review.',
    tabs: [
      { name: 'Overview', shows: 'Headcount, active employees, employees on leave, pending leave requests, department breakdown bar chart', actions: 'Daily headcount snapshot; click department bar to filter' },
      { name: 'Employees', shows: 'Full employee directory with status, type, department, salary, and start date', actions: 'Add / edit / deactivate employees; run AI performance analysis; bulk CSV import' },
      { name: 'Departments', shows: 'Department list with headcount and manager', actions: 'Create / edit / delete departments; assign managers' },
      { name: 'Leave', shows: 'All leave requests with type, date range, status, and requester', actions: 'Approve / reject requests; filter by pending; add rejection reason' },
      { name: 'Balances', shows: 'Annual leave balance per employee (days entitlement, days used, days remaining)', actions: 'Seed balances for the new year; adjust individual balances manually' },
      { name: 'Org Chart', shows: 'Visual org chart tree generated from department and manager relationships', actions: 'Read-only view; auto-updates when employee records change' },
    ],
    tasks: [
      {
        title: 'Add a new employee',
        steps: [
          'Go to Employees tab and click "Add Employee".',
          'Enter: Full Name, Email, Role, Department, Employment Type (full_time / part_time / contractor / intern), Country, Salary, and Start Date.',
          'Set Status = "active".',
          'Ensure employment contract has been reviewed by the Legal Agent for the employee\'s jurisdiction before sending.',
        ],
      },
      {
        title: 'Bulk import employees via CSV',
        steps: [
          'Go to Employees tab and click "Bulk Import".',
          'Download the CSV template, fill in employee data, and upload.',
          'Review the import preview — fix any validation errors.',
          'Confirm import — employees are created at status "active".',
        ],
      },
      {
        title: 'Approve a leave request',
        steps: [
          'Go to Leave tab and filter by status = "pending".',
          'Review the request: type (annual / sick / emergency / maternity / paternity / unpaid), date range, and employee balance.',
          'Click Approve or Reject (add reason for rejections).',
        ],
      },
      {
        title: 'Seed annual leave balances',
        steps: [
          'Go to Balances tab at the start of the year.',
          'Click "Seed Balances" — this populates the standard entitlement for each employee based on their jurisdiction and tenure.',
          'Manually adjust any special cases (e.g. carry-over from previous year).',
        ],
      },
    ],
    aiFeature:
      'The AI Performance Analysis tool (per-employee button in the Employees tab) generates a performance review summary, identifies high performers and employees at risk, and recommends actions (e.g. training, role adjustment, recognition). Note: all AI output requires HR and CEO review before any action is taken.',
    tips: [
      'Employment type affects tax and benefits — set it correctly at onboarding.',
      'All EU employees have GDPR rights over their HR data — process any data requests within 30 days.',
      'The org chart is read-only and auto-generated — to fix it, update the department and manager fields on the employee record.',
    ],
  },

  {
    id: 'ch-14-compliance',
    num: 14,
    title: 'Compliance & Privacy',
    route: '/admin/compliance',
    purpose:
      'The Compliance department handles all Data Subject Requests (DSRs) under GDPR, PDPL (Saudi Arabia), LGPD (Brazil), and CCPA (California). It tracks erasure requests, data exports, and DSR fulfillment SLAs across all database shards. Missing an SLA deadline can result in regulatory fines.',
    tabs: [
      { name: 'Overview', shows: 'Pending erasures, overdue requests, data exports in progress, compliance health indicator', actions: 'Immediate view of SLA risk; red = overdue requests exist' },
      { name: 'Erasure Requests', shows: 'All erasure requests with regulation, status, request date, and SLA countdown', actions: 'Process erasures; update status; document reason for any rejection' },
      { name: 'Data Exports', shows: 'Data export requests (user\'s right to portability) with status', actions: 'Generate and deliver data packages; track delivery confirmation' },
      { name: 'DSR Fulfillment', shows: 'SLA fulfillment dashboard by regulation and database shard', actions: 'Run DSR fulfillment report; identify at-risk requests by shard' },
    ],
    tasks: [
      {
        title: 'Process an erasure request',
        steps: [
          'Go to Erasure Requests tab and open a pending request.',
          'Verify the requester\'s identity against the account record.',
          'Update status to "in_progress" — this starts the erasure workflow.',
          'The system anonymises all PII across the relevant database shards.',
          'Update status to "completed" once confirmed — document completion in the notes field.',
        ],
      },
      {
        title: 'Generate a data export for a DSR',
        steps: [
          'Go to Data Exports tab and find the pending export request.',
          'Click "Generate Export" — the system compiles all data from the relevant shards.',
          'Download the package and deliver it to the requester via secure email.',
          'Mark as delivered and record the delivery timestamp.',
        ],
      },
      {
        title: 'Monitor SLA compliance by regulation',
        steps: [
          'Go to DSR Fulfillment tab.',
          'Review the SLA breakdown: GDPR = 30 days, CCPA = 45 days, LGPD = 15 business days, PDPL = 30 days.',
          'Any request approaching its SLA deadline is highlighted — prioritise these.',
        ],
      },
    ],
    aiFeature:
      'The AI Compliance Advisor panel assesses the current DSR queue against all active regulations. It returns: compliance_health badge, count of overdue erasures, regulation-specific risk flags (e.g. "3 GDPR erasures approaching 28-day mark"), enforcement exposure level, and recommended remediation steps. Run daily.',
    tips: [
      'SLA deadlines are hard legal limits — a missed GDPR deadline can result in fines up to €20M or 4% of global turnover.',
      'UK GDPR and EU GDPR have the same SLA (30 days) but are separate regulations — UK data stays in eu-west-2 (London), not Frankfurt.',
      'LGPD requests (Brazil) have the shortest SLA at 15 business days — prioritise these.',
    ],
  },

  {
    id: 'ch-15-legal',
    num: 15,
    title: 'Legal Department',
    route: '/admin/legal',
    purpose:
      'The Legal Department tracks all ongoing legal matters, manages task deadlines, maintains a document registry, and provides AI-powered contract risk review. It is the central hub for all regulatory inquiries, litigation, and compliance contract management.',
    tabs: [
      { name: 'Overview', shows: 'Open matters, overdue tasks, active reviews, document count', actions: 'Quick health check of legal risk; click cards to filter' },
      { name: 'Matters', shows: 'All legal matters with status, urgency, jurisdiction, and owner', actions: 'Create / update / close matters; set urgency (immediate / this_week / this_month)' },
      { name: 'Tasks', shows: 'Legal tasks with due dates, assignees, and parent matters', actions: 'Create / complete tasks; set due dates; link to matters' },
      { name: 'Documents', shows: 'Document registry with category, version, owner, and upload date', actions: 'Upload / download / archive documents; search by keyword' },
      { name: 'Contract Review', shows: 'Contracts submitted for AI risk assessment', actions: 'Upload contract; run AI review; review risk findings; accept / flag for attorney review' },
    ],
    tasks: [
      {
        title: 'Open a new legal matter',
        steps: [
          'Go to Matters tab and click "New Matter".',
          'Enter: Title, Type, Jurisdiction (e.g. KSA, UAE, EU, UK), Urgency, and Assigned Owner.',
          'Set Status = "open".',
          'Create initial tasks under the matter with due dates.',
        ],
      },
      {
        title: 'Run an AI contract review',
        steps: [
          'Go to Contract Review tab and click "Upload Contract".',
          'Upload the PDF — the AI analyses the document for risk clauses.',
          'Review the risk_level output (critical / high / medium / low) and clause-level findings.',
          'Critical or high risk findings must be reviewed by a qualified attorney before signing.',
        ],
      },
      {
        title: 'Track and close tasks',
        steps: [
          'Go to Tasks tab and filter by status = "open".',
          'Sort by due date to prioritise overdue items.',
          'Mark tasks as complete and add completion notes.',
        ],
      },
    ],
    aiFeature:
      'Two AI tools are available: the AI Legal Advisor panel (Overview tab) provides an overall legal health assessment across Saudi, UAE, and EU frameworks; the AI Contract Review (Contract Review tab) performs clause-level risk analysis on uploaded contracts, flagging non-standard terms, liability caps, IP assignment issues, and jurisdiction concerns.',
    tips: [
      'Contract risk colours: red = critical (do not sign), amber = high (attorney review required), blue = medium, grey = low.',
      'All contracts over SAR 500,000 in value require CEO personal presentation to the counterparty — not just email delivery.',
      'Urgency = "immediate" triggers an automatic escalation notification to the CEO.',
    ],
  },

  {
    id: 'ch-16-ops-support',
    num: 16,
    title: 'Operations & Support',
    route: '/admin/ops',
    purpose:
      'Operations & Support manages internal platform incidents and staff support tickets — separate from external customer-facing issues (which are handled by Customer Success). Incidents track system degradation events, and the support ticket queue captures operational problems reported by staff or monitoring systems.',
    tabs: [
      { name: 'Overview', shows: 'Open incidents, open tickets, SLA breach count, and ops health badge', actions: 'Daily health check; trigger AI Ops Analysis for a full assessment' },
      { name: 'Incidents', shows: 'All incidents with severity, status, affected service, and age', actions: 'Create / update / resolve / close incidents; escalate to EMG-001 for full outages' },
      { name: 'Support Tickets', shows: 'Ticket queue with category, priority, status, and assignee', actions: 'Create / assign / resolve tickets; set priority; add resolution notes' },
      { name: 'Platform Health', shows: 'Live infrastructure health links and status summary', actions: 'Read-only dashboard; links to the Infrastructure Health Monitor for detail' },
    ],
    tasks: [
      {
        title: 'Create and triage an incident',
        steps: [
          'Go to Incidents tab and click "New Incident".',
          'Set: Title, Severity (critical / high / medium / low), Affected Service, Description, and Impact.',
          'Critical and high incidents automatically launch an incident response workflow.',
          'Assign to Dev Agent and set status to "investigating".',
        ],
      },
      {
        title: 'Escalate a critical incident',
        steps: [
          'If a critical incident is open for >1 hour without resolution: escalate to EMG-001 (Platform Outage SOP).',
          'PATCH incident status to "investigating" and notify CEO directly.',
          'Post a platform status update if user impact is confirmed.',
        ],
      },
      {
        title: 'Assign and resolve a support ticket',
        steps: [
          'Go to Support Tickets tab and filter by priority = "urgent".',
          'Urgent tickets have a 30-minute response SLA — assign immediately.',
          'Open the ticket, assign to the appropriate agent, and set status = "in_progress".',
          'When resolved: update status to "resolved" and fill the resolution field.',
        ],
      },
      {
        title: 'Run the AI Ops daily health check',
        steps: [
          'Go to Overview tab and click "Analyze".',
          'The AI Ops Advisor returns: ops_health badge, open critical incidents, SLA breach risks, and Hajj season risk windows.',
          'Act on the recommended quick actions before the daily standup.',
        ],
      },
    ],
    aiFeature:
      'The AI Ops Advisor panel runs an analysis of all open incidents and tickets. It returns a health badge, surfaces critical incidents needing immediate triage, identifies SLA breach risks, spots ticket backlog patterns (e.g. 5 payment tickets in one day = likely systemic issue), and recommends escalation to incident management when patterns emerge.',
    tips: [
      'Incident severity SLAs: critical <1h, high <4h, medium <24h, low <72h.',
      'Multiple tickets in the same category in one day often signal an underlying incident — create an incident record to coordinate the response.',
      'Platform Health tab polls the Infrastructure service live — use it for the first check during any incident.',
    ],
  },

  {
    id: 'ch-17-procurement',
    num: 17,
    title: 'Procurement',
    route: '/admin/procurement',
    purpose:
      'Procurement manages all third-party supplier relationships, contractual commitments, SLA monitoring, and the purchase order lifecycle. It ensures that every significant spend has proper approval, every contract is tracked before expiry, and every supplier SLA is monitored for breaches.',
    tabs: [
      { name: 'Overview', shows: 'Active suppliers, contracts expiring in 90 days, breached SLAs, pending POs, annual spend SAR', actions: 'Spot expiry and breach risks; trigger AI procurement risk analysis' },
      { name: 'Suppliers', shows: 'Supplier directory with type, status, country, and primary contact', actions: 'Add / edit suppliers (soft-delete keeps history); suspend / terminate suppliers' },
      { name: 'Contracts', shows: 'All contracts with type, term dates, expiry countdown, and linked supplier', actions: 'Create / edit / renew contracts; set expiry alerts; upload signed copies' },
      { name: 'SLAs', shows: 'SLA commitments with current status and breach history', actions: 'Record SLA targets; update status (met / at_risk / breached / pending); log breach events' },
      { name: 'Purchase Orders', shows: 'PO pipeline with status, amount, and delivery target', actions: 'Create / approve / send / mark delivered POs; track PO vs invoice matching' },
    ],
    tasks: [
      {
        title: 'Onboard a new supplier',
        steps: [
          'Go to Suppliers tab and click "Add Supplier".',
          'Enter: Name, Type, Country, Contact, and set Status = "onboarding".',
          'Conduct due diligence: sanctions check, GDPR/data-processing agreement, SOC 2 review.',
          'Update Status to "active" once all checks are complete.',
        ],
      },
      {
        title: 'Create a contract',
        steps: [
          'Go to Contracts tab and click "New Contract".',
          'Select the supplier, set Type (service / API / license / distribution / NDA / framework), Term dates, and Value.',
          'Upload the signed PDF.',
          'Set an expiry alert 90 days before the end date.',
        ],
      },
      {
        title: 'Raise a purchase order',
        steps: [
          'Go to Purchase Orders and click "New PO".',
          'Set: Supplier, Description, Amount (SAR), and Delivery Target Date.',
          'For POs ≥ SAR 10,000: submit for manager approval. For ≥ SAR 50,000: CEO + Finance approval. For ≥ SAR 250,000: Board approval.',
          'After approval: update status to "approved" then "sent" when dispatched to supplier.',
        ],
      },
      {
        title: 'Record an SLA breach',
        steps: [
          'Go to SLAs tab and find the affected supplier SLA.',
          'Update status to "breached" and log the breach event with date and description.',
          'Notify the supplier formally — document the notification in the SLA record.',
          'Escalate to Procurement Agent for supplier remediation discussion.',
        ],
      },
    ],
    aiFeature:
      'The AI Procurement Risk Analyser (Overview tab) scans all supplier and contract data. It returns: at-risk suppliers (e.g. breached SLA with no remediation plan), contracts expiring in 30/60/90 days with urgency flags, spend concentration warnings (if >30% of spend is with one supplier), and ZATCA invoicing compliance gaps for KSA suppliers.',
    tips: [
      'PO lifecycle: draft → approved → sent → delivered → paid → cancelled. Never skip the approved step.',
      'Contracts expiring in <30 days show a red badge; <90 days show amber. Review the amber list every Monday.',
      'SLA status "breached" triggers an automatic workflow for supplier remediation — do not set it without documentary evidence.',
    ],
  },

  {
    id: 'ch-18-loyalty',
    num: 18,
    title: 'Loyalty Program',
    route: '/admin/loyalty',
    purpose:
      'The Loyalty Program rewards frequent UTUBooking travellers with points that can be redeemed for discounts, free nights, and upgrades. The admin portal manages member records, points ledger entries, the rewards catalogue, and tier configurations. The redemption rate target is 15–25%.',
    tabs: [
      { name: 'Overview', shows: 'Total members, points in circulation, redemption rate, tier distribution, points liability SAR', actions: 'Monitor programme health; flag if redemption rate falls below 15% or exceeds 25%' },
      { name: 'Members', shows: 'Member directory with tier, points balance, and last transaction date', actions: 'View / edit member records; adjust tier; flag for manual review' },
      { name: 'Points Ledger', shows: 'All point transactions (earn and burn events) with amounts and source', actions: 'Add manual credit / debit entries; search by member; export for reconciliation' },
      { name: 'Rewards', shows: 'Reward catalogue with value, validity, and redemption count', actions: 'Create / edit / deactivate rewards; set stock limits; track usage' },
    ],
    tasks: [
      {
        title: 'View a member\'s points balance',
        steps: [
          'Go to Members tab and search by name or email.',
          'Open the member record — balance, tier, and last transaction date are displayed.',
          'Click "View Ledger" to see the full earn/burn history for this member.',
        ],
      },
      {
        title: 'Create a new reward',
        steps: [
          'Go to Rewards tab and click "New Reward".',
          'Set: Title, Description, Points Cost, Validity Window, Category, and Stock Limit.',
          'Toggle Active = on to make it available to members immediately.',
          'Monitor redemption count to assess popularity.',
        ],
      },
      {
        title: 'Manually adjust a member\'s tier',
        steps: [
          'Open the member record in the Members tab.',
          'Click "Edit" and change the Tier field.',
          'Add a note explaining the manual tier adjustment (e.g. "Goodwill upgrade — complaint resolution").',
          'Tier upgrades are effective immediately — the member sees the new tier at next login.',
        ],
      },
    ],
    aiFeature:
      'The AI Loyalty Advisor analyses member engagement and programme economics. It returns: member retention rate, churn-at-risk members (no activity in 90+ days), tier upgrade candidates who are close to the next threshold, recommended promotional offers to drive redemption, and points liability trend (is the liability growing faster than revenue?).',
    tips: [
      'Tiers are Bronze / Silver / Gold / Platinum — thresholds are configured in Settings.',
      'Expired rewards are hidden from members automatically — no manual action needed.',
      'Points liability (total unredeemed points × SAR value) is a real balance sheet liability — monitor it weekly.',
    ],
  },

  {
    id: 'ch-19-wallet',
    num: 19,
    title: 'Wallet Management',
    route: '/admin/wallet',
    purpose:
      'The Wallet feature allows users to hold a balance in their UTUBooking account in any of 10 supported currencies, and use it for bookings. Admins can view balances, review transaction history, process manual credits, and monitor AML-flagged transactions. Manual credits are irreversible — verify the recipient before proceeding.',
    tabs: [
      { name: 'Overview', shows: 'Total wallet holders, total value in circulation (SAR equivalent), AML flag count, currency breakdown', actions: 'Spot AML flag spikes; link through to Fraud for investigation' },
      { name: 'Balances', shows: 'All wallet holders with balance by currency and last transaction date', actions: 'Search by user; view balance breakdown; issue manual credit' },
      { name: 'Transactions', shows: 'All wallet transactions with type, amount, currency, and timestamp', actions: 'Filter by type (topup / debit / convert_out / convert_in / refund); search by user; export' },
    ],
    tasks: [
      {
        title: 'View a user\'s wallet balance',
        steps: [
          'Go to Balances tab and search by user name or email.',
          'The balance card shows all non-zero currency balances.',
          'Click "Transaction History" to see the full ledger for this wallet.',
        ],
      },
      {
        title: 'Issue a manual wallet credit',
        steps: [
          'Go to Balances tab and open the user\'s wallet.',
          'Click "Issue Credit" — enter amount, currency, and a documented reason.',
          'Credits require Finance Agent approval for amounts ≥ SAR 1,000.',
          'The credit is posted instantly and creates an immutable ledger entry.',
        ],
      },
      {
        title: 'Investigate an AML-flagged transaction',
        steps: [
          'AML flags appear as red badges on transactions exceeding SAR 50,000 or patterns of >10 transactions in 24 hours.',
          'Open the flagged transaction and review the wallet\'s recent history.',
          'Escalate to the Fraud department if the pattern indicates money laundering.',
        ],
      },
    ],
    tips: [
      'Supported currencies: SAR, AED, USD, EUR, GBP, MYR, IDR, TRY, BDT, PKR.',
      'Transaction types: topup (user added funds), debit (booking payment), convert_out/convert_in (currency exchange), refund.',
      'AML flags are automatic — a balance exceeding SAR 50,000 or >10 transactions in 24 hours triggers a review flag. Always investigate before clearing.',
    ],
  },

  {
    id: 'ch-20-inventory',
    num: 20,
    title: 'Inventory Management',
    route: '/admin/inventory',
    purpose:
      'Inventory Management controls which hotels, flights, and car rentals are visible and bookable on the platform. You can enable or disable individual listings, apply bulk changes, and monitor AI-flagged inventory gaps — particularly critical for Makkah and Madinah during Hajj season.',
    tabs: [
      { name: 'Hotels', shows: 'All hotel listings with city, stars, supplier, availability status', actions: 'Toggle availability; filter by city/supplier; bulk enable/disable' },
      { name: 'Flights', shows: 'Flight route inventory with airline, route, and availability', actions: 'Toggle routes; filter by airline or origin/destination' },
      { name: 'Cars', shows: 'Car rental inventory by supplier and city', actions: 'Toggle car categories; filter by supplier' },
    ],
    tasks: [
      {
        title: 'Toggle a hotel\'s availability',
        steps: [
          'Go to Hotels tab and find the property (use city or name search).',
          'Click the availability toggle — it switches immediately (no draft state).',
          'Disabled hotels will show as "sold out" or be hidden from search results.',
        ],
      },
      {
        title: 'Apply bulk enable/disable',
        steps: [
          'Filter hotels by city or supplier.',
          'Use the checkbox column to select multiple properties.',
          'Click "Bulk Enable" or "Bulk Disable" from the actions menu.',
          'Confirm the action — changes are applied immediately.',
        ],
      },
      {
        title: 'Run an AI inventory health check',
        steps: [
          'Click the AI Inventory Advisor panel (collapsible).',
          'Click "Analyze" — the AI scans all three inventory categories.',
          'Review the health badge and critical gap list.',
          'Act on priority = "critical" gaps first (e.g. zero 5-star hotels available in Makkah during Hajj).',
        ],
      },
    ],
    aiFeature:
      'The AI Inventory Advisor returns an inventory_health badge and a prioritised gap list. Critical gaps (e.g. fewer than 5 active 5-star hotels within 300m of the Haram in Makkah) are escalated to the CEO automatically. The advisor also checks flight route coverage for key Hajj origin markets (PK, ID, MY, TR) and car availability in all Tier 1 cities.',
    tips: [
      'Makkah minimum coverage: at least 5 active hotels per star tier (3★, 4★, 5★) at all times during Hajj season.',
      'Hotel toggle is immediate and live — coordinate with Revenue Agent before disabling a high-demand property.',
      'Page size is 50 — use the city or supplier filter rather than scrolling for large markets.',
    ],
  },

  {
    id: 'ch-21-products-dev',
    num: 21,
    title: 'Products & Development',
    route: '/admin/products + /admin/dev',
    purpose:
      'Two linked departments: Products manages the roadmap, feature flags, and release changelog; Development manages sprint planning, the kanban task board, and deployment logs. Together they form the product delivery pipeline from idea to production release.',
    tabs: [
      { name: 'Roadmap', shows: 'Feature roadmap items with status, priority, and owner', actions: 'Add / edit roadmap items; advance status; link to sprint tasks' },
      { name: 'Feature Flags', shows: 'All feature flags with rollout percentage, environment, and toggle state', actions: 'Enable / disable flags; adjust rollout %; scope to environment (dev / staging / production)' },
      { name: 'Changelog', shows: 'Release changelog entries with version and date', actions: 'Add release notes; publish changelog to users' },
      { name: 'Sprint Board', shows: 'Active sprint kanban board with tasks in To Do / In Progress / Done columns', actions: 'Move tasks; assign; add blockers; view sprint progress' },
      { name: 'Dev Tasks', shows: 'All development tasks with priority, assignee, and status', actions: 'Create / edit tasks; set due dates; link to roadmap items' },
      { name: 'Deployments', shows: 'Deployment log with environment, version, status, and deployer', actions: 'Log deployments; track rollback events' },
    ],
    tasks: [
      {
        title: 'Add a roadmap item',
        steps: [
          'Go to Products → Roadmap tab and click "Add Item".',
          'Set: Title, Description, Priority (critical / high / medium / low), Status (idea / planned / in_progress / launched / cancelled), and Owner.',
          'Link to a sprint task if development has started.',
          'Status "launched" updates the Changelog automatically.',
        ],
      },
      {
        title: 'Enable a feature flag',
        steps: [
          'Go to Products → Feature Flags tab.',
          'Find the flag and click "Edit".',
          'Set Environment to "staging" first — test thoroughly before enabling on "production".',
          'Adjust Rollout % (e.g. 10% for a canary release, 100% for full release).',
          'Toggle Active = on.',
        ],
      },
      {
        title: 'Plan a sprint',
        steps: [
          'Go to Dev → Sprint Board and click "New Sprint".',
          'Set sprint dates and goal.',
          'Drag tasks from the backlog into the sprint.',
          'Run AI Sprint Health Analysis to estimate completion probability.',
        ],
      },
      {
        title: 'Log a production deployment',
        steps: [
          'Go to Dev → Deployments tab and click "Log Deployment".',
          'Set: Version, Environment (production), Status (success / failed / rolled_back), and Notes.',
          'Failed deployments should link to the incident record created in Ops.',
        ],
      },
    ],
    aiFeature:
      'Two AI tools: AI Roadmap Advisor (Products) analyses the roadmap for bottlenecks, priority conflicts, and dependency risks; AI Sprint Health Analysis (Dev) estimates sprint completion probability based on current velocity, number of tasks, and historical completion rate. Both tools generate actionable recommendations rather than just scores.',
    tips: [
      'Roadmap statuses: idea → planned → in_progress → launched → cancelled. Never jump from idea to launched.',
      'Feature flags are environment-scoped — always test on staging before production.',
      'Failed deployments must create an ops incident — use the Deployments log to link them.',
    ],
  },

  {
    id: 'ch-22-workflows-tasks',
    num: 22,
    title: 'Workflow Engine & Tasks',
    route: '/admin/workflows + /admin/tasks',
    purpose:
      'The Workflow Engine automates multi-step business processes that cross department boundaries — approval flows, compliance checks, fraud escalations, and onboarding sequences. My Tasks is the unified inbox where every approval waiting for your action lands, regardless of which department triggered it.',
    tabs: [
      { name: 'My Tasks', shows: 'All pending task approvals assigned to you across all workflows', actions: 'Approve / reject tasks; add notes; view context from the triggering department' },
      { name: 'Definitions', shows: 'Workflow definition library (templates) with trigger, steps, and SLA configuration', actions: 'Create / edit / delete workflow definitions; activate / deactivate' },
      { name: 'Instances', shows: 'All running workflow instances with current step, status, and age', actions: 'Monitor progress; cancel instances; force-advance a stuck step' },
      { name: 'Dashboard', shows: 'SLA health overview across all active workflows', actions: 'Spot overdue instances; identify workflow bottlenecks' },
      { name: 'Analytics', shows: 'Workflow completion rates, average duration, and SLA attainment', actions: 'Read-only performance metrics; use for workflow optimisation' },
    ],
    tasks: [
      {
        title: 'Approve a task in My Task Inbox',
        steps: [
          'Go to /admin/tasks — your pending tasks are listed with context and due date.',
          'Open a task and read the context (which workflow triggered it and why).',
          'Click Approve or Reject — add a mandatory note for rejections.',
        ],
      },
      {
        title: 'Create a workflow definition',
        steps: [
          'Go to Workflows → Definitions tab and click "New Workflow".',
          'Enter: Name, Trigger Event (e.g. fraud_case_escalated, refund_requested), and SLA (hours).',
          'Add steps: each step has a name, assignee role, timeout, and escalation path.',
          'Click "Get AI Recommendation" for the AI to suggest an optimised step sequence.',
          'Activate the workflow when ready.',
        ],
      },
      {
        title: 'Monitor a running workflow instance',
        steps: [
          'Go to Workflows → Instances tab.',
          'Filter by status = "active" or "overdue".',
          'Open an instance to see which step it is on, how long it has been there, and who the current assignee is.',
        ],
      },
      {
        title: 'Cancel a stuck workflow instance',
        steps: [
          'Open the instance from the Instances tab.',
          'Click "Cancel Instance" — add a reason.',
          'Note: cancelled instances cannot be restarted. Create a new instance if the process needs to continue.',
        ],
      },
    ],
    aiFeature:
      'Two AI tools: AI Workflow Recommendation (on Definitions tab) analyses the trigger and business context to suggest the optimal step sequence for a new workflow definition; AI Workflow Builder Draft generates a complete WfStepDef array from a plain-language description — paste in "Customer refund over SAR 5,000 needs Finance and CEO approval" and get a ready-to-use step definition.',
    tips: [
      'SLA health colours: green = on track, amber = due within 2 hours, red = overdue.',
      'The header task badge shows your pending task count — aim to clear it daily.',
      'Cancelled instances cannot be restarted — if you cancel by mistake, trigger the workflow again from the source department.',
    ],
  },

  {
    id: 'ch-23-infrastructure',
    num: 23,
    title: 'Infrastructure & Settings',
    route: '/admin/infrastructure + /admin/tenants + /admin/settings',
    purpose:
      'Infrastructure covers three areas: the Health Monitor for real-time multi-region infrastructure status, the White-Label Tenant manager for sub-platform configurations, and Platform Settings for system-wide configuration like pricing multipliers, maintenance mode, and feature defaults. Infrastructure changes can affect all users instantly.',
    tabs: [
      { name: 'Health Monitor', shows: 'Live status of all 8 AWS regions: API, DB, Redis, search, payment gateway, and CDN per region', actions: 'Read-only; auto-refreshes every 30 seconds; link through to CloudWatch for deep diagnostics' },
      { name: 'White-Label Tenants', shows: 'Tenant list with status, market scope, custom domain, and feature flags', actions: 'Create / edit / deactivate tenants; configure per-tenant settings; view tenant usage' },
      { name: 'Settings', shows: 'Platform-wide operational settings: Hajj surge multiplier, maintenance mode, default currency, email sender config', actions: 'Edit settings; save; settings take effect immediately (no deploy required)' },
    ],
    tasks: [
      {
        title: 'Check infrastructure health by region',
        steps: [
          'Go to /admin/infrastructure.',
          'The dashboard shows all 8 regions (me-south-1, me-central-1, eu-central-1, eu-west-2, us-east-1, sa-east-1, ap-southeast-1, ap-south-1).',
          'Green = healthy. Amber = degraded. Red = outage. If any region shows red: escalate to EMG-002 immediately.',
        ],
      },
      {
        title: 'Adjust the Hajj surge pricing multiplier',
        steps: [
          'Go to /admin/settings.',
          'Find the "Hajj Surge Multiplier" field (default: 1.35 = +35%).',
          'Edit and save — the new multiplier applies to all Hajj pricing rules within seconds.',
          'Verify the change is reflected in /admin/revenue → Pricing Rules.',
        ],
      },
      {
        title: 'Enable maintenance mode',
        steps: [
          'Go to /admin/settings.',
          'Toggle "Maintenance Mode" to on.',
          'All public-facing pages show a maintenance banner immediately.',
          'Disable maintenance mode as soon as work is complete — do not leave it on.',
        ],
      },
      {
        title: 'View a white-label tenant',
        steps: [
          'Go to /admin/tenants.',
          'Find the tenant by name or custom domain.',
          'Open the record to see their market scope, feature flag overrides, and API usage.',
        ],
      },
    ],
    tips: [
      'Infrastructure health auto-refreshes every 30 seconds — no manual refresh needed during incidents.',
      'Settings changes are instant and global — test any multiplier or config change in a non-peak hour.',
      'UK data (eu-west-2 London) and EU data (eu-central-1 Frankfurt) cannot be mixed — this is a GDPR hard requirement enforced at the database layer.',
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabsTable({ tabs }: { tabs: TabRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
      <div className="border-b border-utu-border-default px-5 py-3">
        <h3 className="text-sm font-semibold text-utu-text-primary">Tabs at a Glance</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-utu-bg-subtle">
          <tr>
            <th className="w-36 px-4 py-2 text-left text-xs font-medium text-utu-text-muted">Tab</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-utu-text-muted">What it shows</th>
            <th className="w-56 px-4 py-2 text-left text-xs font-medium text-utu-text-muted">Key actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-utu-border-default">
          {tabs.map(tab => (
            <tr key={tab.name} className="hover:bg-utu-bg-muted">
              <td className="px-4 py-2.5 font-medium text-utu-blue">{tab.name}</td>
              <td className="px-4 py-2.5 text-utu-text-secondary">{tab.shows}</td>
              <td className="px-4 py-2.5 text-utu-text-muted">{tab.actions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-utu-text-primary">Common Tasks</h3>
      <ol className="space-y-4">
        {tasks.map((task, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-utu-blue-pale text-xs font-bold text-utu-blue">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-utu-text-primary">{task.title}</p>
              <ol className="mt-1 list-decimal list-inside space-y-0.5">
                {task.steps.map((step, j) => (
                  <li key={j} className="text-sm text-utu-text-secondary">{step}</li>
                ))}
              </ol>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TipsBox({ tips }: { tips: string[] }) {
  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-blue-pale p-5">
      <h3 className="mb-3 text-sm font-semibold text-utu-navy">Tips</h3>
      <ul className="space-y-1.5">
        {tips.map((tip, i) => (
          <li key={i} className="flex gap-2 text-sm text-utu-text-secondary">
            <span className="shrink-0 text-utu-blue">•</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AiFeatureBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-5">
      <h3 className="mb-2 text-sm font-semibold text-violet-800">AI Feature</h3>
      <p className="text-sm leading-relaxed text-violet-700">{text}</p>
    </div>
  );
}

function ChapterSection({ chapter }: { chapter: ChapterDef }) {
  return (
    <section id={chapter.id} className="scroll-mt-8">
      {/* Chapter header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-utu-blue text-sm font-bold text-white">
          {chapter.num}
        </span>
        <h2 className="text-xl font-bold text-utu-text-primary">{chapter.title}</h2>
        <span className="rounded-full bg-utu-bg-subtle px-3 py-0.5 text-xs font-medium text-utu-blue">
          {chapter.route}
        </span>
      </div>

      <div className="space-y-4">
        {/* Purpose */}
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-utu-text-primary">Purpose</h3>
          <p className="text-sm leading-relaxed text-utu-text-secondary">{chapter.purpose}</p>
        </div>

        {/* Tabs at a Glance */}
        <TabsTable tabs={chapter.tabs} />

        {/* Common Tasks */}
        <TaskList tasks={chapter.tasks} />

        {/* AI Feature (conditional) */}
        {chapter.aiFeature && <AiFeatureBox text={chapter.aiFeature} />}

        {/* Tips */}
        <TipsBox tips={chapter.tips} />
      </div>
    </section>
  );
}

interface TocSidebarProps {
  chapters: ChapterDef[];
  activeId: string;
  search: string;
  onSearch: (v: string) => void;
}

function TocSidebar({ chapters, activeId, search, onSearch }: TocSidebarProps) {
  const filtered = search.trim()
    ? chapters.filter(
        c =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.route.toLowerCase().includes(search.toLowerCase()),
      )
    : chapters;

  return (
    <aside className="w-56 shrink-0 print:hidden">
      <div className="sticky top-8 space-y-3">
        <input
          type="search"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search chapters…"
          className="w-full rounded-lg border border-utu-border-default bg-utu-bg-card px-3 py-2 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue"
        />
        <nav>
          <ul className="space-y-0.5 text-sm">
            {filtered.map(ch => (
              <li key={ch.id}>
                <a
                  href={`#${ch.id}`}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                    activeId === ch.id
                      ? 'bg-utu-blue-light font-medium text-utu-blue'
                      : 'text-utu-text-secondary hover:bg-utu-bg-muted'
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-utu-bg-subtle text-xs font-bold text-utu-text-muted">
                    {ch.num}
                  </span>
                  <span className="truncate">{ch.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [activeChapter, setActiveChapter] = useState(CHAPTERS[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveChapter(visible[0].target.id);
      },
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 },
    );
    document.querySelectorAll('section[id^="ch-"]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-utu-text-primary">User Manual</h1>
        <p className="mt-1 text-sm text-utu-text-muted">
          Complete reference for the UTUBooking Admin Portal — 23 chapters across all departments.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-utu-bg-subtle px-3 py-1 text-xs font-medium text-utu-text-secondary">
            23 Chapters
          </span>
          <span className="rounded-full bg-utu-bg-subtle px-3 py-1 text-xs font-medium text-utu-text-secondary">
            Last updated: April 2026
          </span>
          <button
            onClick={() => window.print()}
            className="rounded-full border border-utu-border-default bg-utu-bg-card px-3 py-1 text-xs font-medium text-utu-text-secondary transition-colors hover:bg-utu-bg-muted"
          >
            Print / Export PDF
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex items-start gap-8">
        <TocSidebar
          chapters={CHAPTERS}
          activeId={activeChapter}
          search={searchQuery}
          onSearch={setSearchQuery}
        />

        {/* Chapter content */}
        <div className="min-w-0 flex-1 space-y-12">
          {CHAPTERS.map(ch => (
            <ChapterSection key={ch.id} chapter={ch} />
          ))}
        </div>
      </div>
    </div>
  );
}
