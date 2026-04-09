export interface JobDescription {
  title: string;
  team: string;
  location: string;
  type: string;
  about: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
}

/**
 * Job descriptions keyed by the exact English title string used in the
 * careers page (matches locales/en.json job titles).
 */
export const JOB_DESCRIPTIONS: Record<string, JobDescription> = {
  'Senior Backend Engineer': {
    title: 'Senior Backend Engineer',
    team: 'Engineering',
    location: 'Riyadh, KSA (Remote-friendly)',
    type: 'Full-time',
    about:
      'You will design and scale the core booking engine that serves millions of Hajj and Umrah travelers across Saudi Arabia, UAE, and beyond. You will work on high-throughput APIs, real-time inventory systems, and payment integrations with regional gateways.',
    responsibilities: [
      'Architect and build Node.js microservices that power hotel, flight, and car booking flows',
      'Integrate with GDS providers (Amadeus, Sabre) and hotel aggregators (Hotelbeds, Booking.com)',
      'Optimize PostgreSQL schemas and Redis caching for peak Hajj season traffic',
      'Design and own API contracts consumed by the frontend and mobile clients',
      'Collaborate with the DevOps team on AWS deployments across Bahrain and Riyadh regions',
      'Mentor junior engineers and participate in architecture reviews',
    ],
    requirements: [
      '5+ years of backend engineering experience with Node.js',
      'Strong understanding of REST and GraphQL API design',
      'PostgreSQL and Redis experience at production scale',
      'Familiarity with microservices architecture and event-driven systems',
      'Experience with AWS (EC2, RDS, ElastiCache, SQS)',
      'Proficient in English; Arabic is a plus',
    ],
    niceToHave: [
      'Prior experience in travel technology (GDS, OTA, or hotel aggregator integrations)',
      'Knowledge of PCI-DSS compliance and payment gateway integration',
      'Experience with Hajj/Umrah booking workflows',
    ],
  },

  'Frontend Engineer (React / Next.js)': {
    title: 'Frontend Engineer (React / Next.js)',
    team: 'Engineering',
    location: 'Remote — Gulf region',
    type: 'Full-time',
    about:
      'Build beautiful, fast, and accessible travel booking experiences used by millions of Muslims planning their Hajj and Umrah journeys. You will work in a Next.js App Router codebase with bilingual (Arabic/English) RTL support and a custom Tailwind design system.',
    responsibilities: [
      'Build and maintain React/Next.js pages and reusable components following our design system',
      'Implement RTL (Arabic) and LTR (English) support across all UI components',
      'Integrate with backend APIs to build hotel search, flight booking, and checkout flows',
      'Optimize Core Web Vitals — LCP, CLS, and FID — for Gulf market connection speeds',
      'Collaborate with the product and design team to translate Figma designs into pixel-perfect UIs',
      'Write clean, typed TypeScript with strong attention to accessibility (WCAG 2.1)',
    ],
    requirements: [
      '3+ years of experience with React and Next.js',
      'Strong TypeScript skills',
      'Experience with Tailwind CSS and component-driven design',
      'Understanding of RTL layout and internationalization (i18n)',
      'Familiarity with Next.js App Router and server components',
      'Git-based collaborative workflow experience',
    ],
    niceToHave: [
      'Arabic language skills or experience building Arabic-language products',
      'Experience with next-intl or similar i18n frameworks',
      'Familiarity with travel booking UX patterns',
    ],
  },

  'Product Manager \u2014 Hajj & Umrah': {
    title: 'Product Manager \u2014 Hajj & Umrah',
    team: 'Product',
    location: 'Riyadh, KSA',
    type: 'Full-time',
    about:
      'Own the Hajj and Umrah product vertical — the heart of UTUBooking. You will define the roadmap, work directly with pilgrimage operators and Saudi Ministry partners, and ensure millions of pilgrims have a seamless, spiritually respectful booking experience.',
    responsibilities: [
      'Define and own the Hajj & Umrah product roadmap from discovery to launch',
      'Conduct user research with pilgrims, travel agents, and Mutawwif operators in KSA',
      'Translate regulatory requirements (Ministry of Hajj, Nusuk platform) into product specs',
      'Work cross-functionally with engineering, design, and compliance teams',
      'Track product KPIs: booking conversion, pilgrim satisfaction scores, and repeat rates',
      'Identify integration opportunities with Nusuk, Mawaqit, and official Saudi e-portals',
    ],
    requirements: [
      '4+ years of product management experience, ideally in travel or e-commerce',
      'Deep understanding of the Hajj and Umrah ecosystem and pilgrimage logistics',
      'Strong analytical skills — comfortable with SQL, Mixpanel, or similar tools',
      'Excellent communication in Arabic and English',
      'Experience working with engineering teams in an agile environment',
      'Based in or willing to relocate to Riyadh, KSA',
    ],
    niceToHave: [
      'Personal Hajj or Umrah experience',
      'Existing relationships with Saudi Ministry of Hajj stakeholders',
      'Experience with Islamic finance or halal-certified service requirements',
    ],
  },

  'Growth Marketing Manager': {
    title: 'Growth Marketing Manager',
    team: 'Marketing',
    location: 'Dubai, UAE (Remote-friendly)',
    type: 'Full-time',
    about:
      'Drive user acquisition and retention across Gulf markets. You will own performance marketing, SEO strategy, and CRM campaigns targeting Muslim travelers in Saudi Arabia, UAE, Egypt, and the wider diaspora — with a particular focus on Hajj and Umrah season peaks.',
    responsibilities: [
      'Plan and execute paid campaigns (Google Ads, Meta, TikTok) in Arabic and English',
      'Own the SEO roadmap — keyword strategy, content calendar, and technical SEO audits',
      'Run email and WhatsApp CRM campaigns tied to booking lifecycle events',
      'Analyze funnel performance with GA4, Mixpanel, and attribution tools',
      'Coordinate with the content team to produce high-quality Arabic travel content',
      'Report weekly growth metrics to the CMO and co-founders',
    ],
    requirements: [
      '4+ years of digital marketing or growth experience',
      'Hands-on experience with Google Ads and Meta Ads Manager',
      'Strong SEO knowledge — on-page, technical, and content strategy',
      'Experience marketing to Gulf / MENA audiences',
      'Data-driven mindset with strong Excel or SQL skills',
      'Fluency in Arabic and English',
    ],
    niceToHave: [
      'Experience with travel or OTA marketing during peak seasons',
      'Knowledge of Islamic calendar events and Hajj/Umrah demand patterns',
      'Experience with WhatsApp Business API and conversational marketing',
    ],
  },

  'Customer Support Specialist (Arabic)': {
    title: 'Customer Support Specialist (Arabic)',
    team: 'Support',
    location: 'Remote — Arabic-speaking',
    type: 'Full-time',
    about:
      'Be the voice of UTUBooking for our most important customers — pilgrims preparing for Hajj and Umrah. You will provide empathetic, knowledgeable support in Arabic, resolving booking issues, answering itinerary questions, and ensuring every traveler feels supported on their spiritual journey.',
    responsibilities: [
      'Handle inbound support tickets, live chat, and WhatsApp messages in Arabic and English',
      'Resolve hotel, flight, and car rental booking issues within SLA targets',
      'Coordinate with airline and hotel partners to manage cancellations and changes',
      'Escalate complex Hajj/Umrah regulatory issues to the compliance team',
      'Document recurring issues and contribute to the FAQ and help center',
      'Provide feedback to the product team on common pain points',
    ],
    requirements: [
      'Native or near-native Arabic speaker with excellent written Arabic',
      'Strong English communication skills',
      '2+ years of customer support experience, preferably in travel or e-commerce',
      'Empathy and patience when supporting customers through stressful travel situations',
      'Comfortable with support tools (Zendesk, Freshdesk, or similar)',
      'Availability to cover weekend shifts during Hajj and Umrah peak periods',
    ],
    niceToHave: [
      'Personal experience with Hajj or Umrah travel logistics',
      'Familiarity with GCC travel regulations and visa processes',
      'Experience supporting customers across multiple Gulf dialects',
    ],
  },
};

/** Returns the job description for a given role title, or null if not found. */
export function getJobDescription(roleTitle: string): JobDescription | null {
  return JOB_DESCRIPTIONS[roleTitle] ?? null;
}
