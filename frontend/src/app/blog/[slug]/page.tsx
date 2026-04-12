import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

// ─── Inline markdown renderer ─────────────────────────────────────────────────
// Handles the subset of markdown used in the blog drafts:
//   [text](url)       → <a> with external link handling
//   **text**          → <strong>
//   `code`            → <code>
//   - item (line)     → bullet list item (collected into <ul>)
//   blank line        → paragraph break
// No npm dependency — keeps the bundle lean.

type Node =
  | { type: 'p';  children: InlineNode[] }
  | { type: 'ul'; items: InlineNode[][] }
  | { type: 'br' };

type InlineNode =
  | { type: 'text';   value: string }
  | { type: 'strong'; value: string }
  | { type: 'code';   value: string }
  | { type: 'a';      href: string; children: string };

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  // Combined regex: [text](url) | **bold** | `code`
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push({ type: 'text', value: text.slice(last, m.index) });
    }
    if (m[1] !== undefined) {
      nodes.push({ type: 'a', href: m[2], children: m[1] });
    } else if (m[3] !== undefined) {
      nodes.push({ type: 'strong', value: m[3] });
    } else if (m[4] !== undefined) {
      nodes.push({ type: 'code', value: m[4] });
    }
    last = re.lastIndex;
  }

  if (last < text.length) {
    nodes.push({ type: 'text', value: text.slice(last) });
  }

  return nodes;
}

function parseBodyNodes(raw: string): Node[] {
  const lines  = raw.split('\n');
  const nodes: Node[] = [];
  let   pLines: string[] = [];
  let   ulLines: string[] = [];

  function flushP() {
    const joined = pLines.join(' ').trim();
    if (joined) nodes.push({ type: 'p', children: parseInline(joined) });
    pLines = [];
  }
  function flushUl() {
    if (ulLines.length === 0) return;
    nodes.push({
      type:  'ul',
      items: ulLines.map(l => parseInline(l.replace(/^-\s+/, '').trim())),
    });
    ulLines = [];
  }

  for (const line of lines) {
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushP();
      ulLines.push(line);
    } else if (line.trim() === '') {
      flushUl();
      flushP();
    } else {
      flushUl();
      pLines.push(line.trim());
    }
  }

  flushUl();
  flushP();

  return nodes;
}

function renderInlineNodes(nodes: InlineNode[]) {
  return nodes.map((n, i) => {
    if (n.type === 'text')   return <span key={i}>{n.value}</span>;
    if (n.type === 'strong') return <strong key={i}>{n.value}</strong>;
    if (n.type === 'code')   return <code key={i} className="bg-utu-bg-muted rounded px-1 text-sm font-mono">{n.value}</code>;
    if (n.type === 'a') {
      const isExternal = n.href.startsWith('http');
      return (
        <a
          key={i}
          href={n.href}
          className="text-utu-blue hover:underline"
          {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {n.children}
        </a>
      );
    }
    return null;
  });
}

function RichBody({ markdown }: { markdown: string }) {
  const nodes = parseBodyNodes(markdown);
  return (
    <>
      {nodes.map((node, i) => {
        if (node.type === 'p') {
          return (
            <p key={i} className="text-utu-text-secondary leading-relaxed text-base mb-3 last:mb-0">
              {renderInlineNodes(node.children)}
            </p>
          );
        }
        if (node.type === 'ul') {
          return (
            <ul key={i} className="list-disc list-outside ps-5 space-y-1 mb-3">
              {node.items.map((item, j) => (
                <li key={j} className="text-utu-text-secondary text-base leading-relaxed">
                  {renderInlineNodes(item)}
                </li>
              ))}
            </ul>
          );
        }
        return null;
      })}
    </>
  );
}

// ─── Slug → translation key index ─────────────────────────────────────────────
// Maps each post slug to the numeric suffix used in blog.* translation keys.
// e.g. 'hajj-2026-guide' → 1 → t('post1Title'), t('post1Category'), etc.

const SLUG_INDEX: Record<string, number> = {
  'hajj-2026-guide':              1,
  'umrah-hotels-makkah':          2,
  'madinah-travel-tips':          3,
  'muslim-travel-southeast-asia': 4,
};

// ─── Static post data (article content — not localised) ───────────────────────

const POSTS: Record<string, {
  sections: { heading: string; body: string }[];
}> = {
  'hajj-2026-guide': {
    sections: [
      {
        heading: 'Before You Travel',
        body: 'Securing your Hajj visa requires coordination with your country\'s official Hajj mission. Apply early — most national quotas open 6 to 9 months before the season. Ensure your passport has at least 6 months validity and that all required vaccinations (meningitis, flu) are up to date.',
      },
      {
        heading: 'Accommodation Near Masjid al-Haram',
        body: 'Hotels within the Abraj Al-Bait complex and the surrounding Ajyad and Misfalah neighborhoods offer the shortest walking distance to the Grand Mosque. Book 3 to 6 months in advance as availability drops quickly once Hajj permits are issued. Always verify the SAR price — rates surge significantly during the Dhul Hijjah peak.',
      },
      {
        heading: 'Transport During Hajj',
        body: 'The Haramain High Speed Railway connects Makkah, Madinah, and Jeddah in under 2 hours. Within Makkah, the Mashair Metro runs a dedicated Hajj-season route between the holy sites: Mina, Arafat, and Muzdalifah. Rideshare apps operate in Makkah but expect surge pricing during peak movement days (8th to 13th Dhul Hijjah).',
      },
      {
        heading: 'Essential Packing List',
        body: 'Ihram garments (2 sets for men), comfortable walking shoes with firm soles, unscented toiletries, portable power bank, blister plasters, oral rehydration sachets, and a printed copy of your accommodation and flight details. Avoid perfumed items entirely once you enter the state of ihram.',
      },
      {
        heading: 'Health & Safety',
        body: 'Heatstroke is the most common risk during Hajj. Stay hydrated (minimum 3 litres of water daily), carry a personal misting fan, and take rest during midday hours. The Saudi Ministry of Health operates free medical tents throughout all holy sites. Keep your emergency contact number and hotel address written on paper, not only on your phone.',
      },
    ],
  },

  'umrah-hotels-makkah': {
    sections: [
      {
        heading: 'Why Location Matters',
        body: 'During Umrah you will walk between the hotel and Masjid al-Haram multiple times daily for prayers. Every 200 metres of additional distance adds roughly 5 minutes per trip. Over a 7-day stay with 5 prayers daily, a hotel 800 metres further away means more than 4 additional hours of walking.',
      },
      {
        heading: 'Zone 1 — Inside Abraj Al-Bait (0 to 200m)',
        body: 'Fairmont Makkah Clock Royal Tower and Conrad Makkah sit directly above the mosque complex. These are the closest possible options with direct lobby access to the Haram gates. Rates during Ramadan peak at SAR 3,000 to 8,000 per night. Booking 4 to 5 months in advance is essential.',
      },
      {
        heading: 'Zone 2 — Ajyad & Misfalah (200m to 800m)',
        body: 'A wide range of 4-star and 3-star properties in the Ajyad and Misfalah areas offer good value at SAR 400 to 1,200 per night. Look for hotels on King Abdul Aziz Road or Al-Hujun Street for the easiest pedestrian access. Many include free breakfast and shuttle buses to the mosque.',
      },
      {
        heading: 'Zone 3 — Aziziyyah & Sharai (1km to 3km)',
        body: 'More affordable options are available in Aziziyyah, with rates from SAR 150 to 400 per night. Free shuttle buses from major hotels to the Haram run every 15 to 30 minutes. Best suited for pilgrims on a tighter budget or for the non-Umrah days of an extended trip.',
      },
      {
        heading: 'Booking Tips',
        body: 'Always confirm that the SAR price shown is the total room rate including VAT (15% in Saudi Arabia). Check cancellation policies carefully — fully refundable rates during peak Umrah season are rare. Use UTUBooking to compare real-time SAR pricing across all zones with verified distance-to-Haram data.',
      },
    ],
  },

  'madinah-travel-tips': {
    sections: [
      {
        heading: 'Visiting Masjid al-Nabawi',
        body: 'The Prophet\'s Mosque is open 24 hours but is at its most crowded during Fajr and Isha prayers. The Rawdah al-Sharifah (the area between the Prophet\'s tomb and his pulpit) has timed entry slots managed by the mosque administration. Arrive early or obtain a permit through the Nusuk app for a less congested visit.',
      },
      {
        heading: 'Hotels Near the Prophet\'s Mosque',
        body: 'The central zone around King Abdul Aziz Road and Prince Abdul Majeed Road has the highest concentration of hotels within walking distance. Anwar Al Madinah Mövenpick, Hilton Madinah, and Sheraton Madinah are the closest 5-star options. Budget properties in the Al-Hara Al-Gharbiyyah neighbourhood start from SAR 120 per night.',
      },
      {
        heading: 'Historic Sites Beyond the Mosque',
        body: 'The Quba Mosque, the first mosque built in Islamic history, is 3.5km from Masjid al-Nabawi and accessible by taxi or the Haramain Railway shuttle. Masjid al-Qiblatayn, the mosque of two qiblahs, is a short drive north. The Al-Baqi cemetery, adjacent to the Prophet\'s Mosque, is open to male visitors at specific times.',
      },
      {
        heading: 'Food & Local Restaurants',
        body: 'Madinah\'s Al-Anbariyyah and Al-Manarah districts have dozens of Saudi and Yemeni restaurants. Mandi (slow-cooked lamb rice), kabsa, and mutabbaq (stuffed pancake) are staples. Most restaurants near the mosque do not require reservations and serve well past midnight during peak pilgrimage seasons.',
      },
      {
        heading: 'Getting Around Madinah',
        body: 'The city centre is compact and walkable for most pilgrimage activities. Uber and Careem are active. Taxis from the Prophet\'s Mosque to Quba Mosque cost roughly SAR 15 to 25. The Haramain High Speed Railway station (King Abdullah Station) connects Madinah to Makkah and Jeddah in under 2 hours.',
      },
    ],
  },

  'muslim-travel-southeast-asia': {
    sections: [
      {
        heading: 'Why Southeast Asia for Muslim Travelers',
        body: 'Indonesia has the world\'s largest Muslim population, and Malaysia is widely considered the most developed Muslim-friendly tourism destination globally. Across both countries, halal food, prayer facilities, and modest accommodation are standard, not exceptions. Thailand, Philippines, and Singapore also have well-established Muslim communities with accessible infrastructure for travelers.',
      },
      {
        heading: 'Indonesia — Bali, Jakarta & Beyond',
        body: 'While Bali is a Hindu-majority island, halal restaurants and prayer facilities are easily found in tourist areas. Java offers Islamic heritage sites including the Demak Mosque (one of the oldest in Indonesia) and the pilgrimage sites of Wali Songo. Lombok, known as the "Island of a Thousand Mosques", is an increasingly popular alternative to Bali with a predominantly Muslim population.',
      },
      {
        heading: 'Malaysia — Kuala Lumpur & Langkawi',
        body: 'Kuala Lumpur is a top destination for halal food tourism. The city\'s Brickfields, Bukit Bintang, and Chow Kit areas have diverse halal dining. Langkawi is alcohol-free (tax-free island) and has excellent resorts suitable for Muslim families. Malaysia requires halal certification for restaurants, making food verification straightforward.',
      },
      {
        heading: 'Prayer Facilities & Qibla',
        body: 'Major airports in Kuala Lumpur, Jakarta, Singapore, and Bangkok all have dedicated prayer rooms. Shopping malls in Malaysia and Indonesia typically include surau (small prayer rooms) on multiple floors. The Muslim Pro app is widely used across the region for prayer times, qibla direction, and nearby mosque locations.',
      },
      {
        heading: 'Booking Tips for the Region',
        body: 'UTUBooking covers hotels across Indonesia and Malaysia with halal certification filters and local currency pricing in IDR and MYR. Ramadan travel in Malaysia offers a unique experience with Bazaar Ramadan markets throughout the country. Book domestic flights between islands early — Garuda Indonesia, AirAsia, and Batik Air fill quickly during school holidays and Eid.',
      },
    ],
  },
};

// ─── DB fetch ─────────────────────────────────────────────────────────────────

interface DbPost {
  slug:           string;
  category:       string;
  title:          string;
  excerpt:        string;
  published_date: string;
  read_time:      string;
  sections:       { heading: string; body: string }[];
}

async function fetchDbPost(slug: string): Promise<DbPost | null> {
  try {
    const res = await fetch(
      `${process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001'}/api/blog/${encodeURIComponent(slug)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(5_000) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const dbPost = await fetchDbPost(slug);
  if (dbPost) {
    const desc = dbPost.excerpt.slice(0, 155);
    return {
      title:       `${dbPost.title} — UTUBooking Blog`,
      description: desc,
      alternates:  { canonical: `https://utubooking.com/blog/${slug}` },
      openGraph: {
        type:        'article',
        url:         `https://utubooking.com/blog/${slug}`,
        title:       dbPost.title,
        description: desc,
        publishedTime: dbPost.published_date,
        siteName:    'UTUBooking',
      },
      twitter: {
        card:        'summary_large_image',
        title:       dbPost.title,
        description: desc,
      },
    };
  }
  if (!POSTS[slug]) return { title: 'Article Not Found — UTUBooking' };
  const t = await getTranslations('blog');
  const idx   = SLUG_INDEX[slug];
  const title = idx ? t(`post${idx}Title` as Parameters<typeof t>[0]) : slug;
  const desc  = POSTS[slug].sections[0]?.body.slice(0, 155) ?? '';
  return {
    title:       `${title} — UTUBooking Blog`,
    description: desc,
    alternates:  { canonical: `https://utubooking.com/blog/${slug}` },
    openGraph: {
      type:        'article',
      url:         `https://utubooking.com/blog/${slug}`,
      title,
      description: desc,
      siteName:    'UTUBooking',
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description: desc,
    },
  };
}

export function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogPostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Try DB first; fall back to hardcoded POSTS; 404 if neither
  const dbPost = await fetchDbPost(slug);

  let title:    string;
  let category: string;
  let date:     string;
  let readTime: string;
  let sections: { heading: string; body: string }[];

  // Load translations for UI strings (back link, CTA, etc.) + i18n post metadata
  const t = await getTranslations('blog');

  if (dbPost) {
    title    = dbPost.title;
    category = dbPost.category;
    date     = dbPost.published_date;
    readTime = dbPost.read_time;
    sections = dbPost.sections;
  } else {
    const post = POSTS[slug];
    if (!post) notFound();

    const idx = SLUG_INDEX[slug];
    title    = idx ? t(`post${idx}Title`    as Parameters<typeof t>[0]) : slug;
    category = idx ? t(`post${idx}Category` as Parameters<typeof t>[0]) : '';
    date     = idx ? t(`post${idx}Date`     as Parameters<typeof t>[0]) : '';
    readTime = idx ? t(`post${idx}ReadTime` as Parameters<typeof t>[0]) : '';
    sections = post.sections;
  }

  // ── Article JSON-LD — boosts eligibility for Google's Article rich result ──
  const jsonLd = {
    '@context':         'https://schema.org',
    '@type':            'Article',
    headline:           title,
    description:        sections[0]?.body.slice(0, 155) ?? '',
    datePublished:      dbPost?.published_date ?? date,
    dateModified:       dbPost?.published_date ?? date,
    author: {
      '@type': 'Organization',
      name:    'UTUBooking Editorial Team',
      url:     'https://utubooking.com/about',
    },
    publisher: {
      '@type': 'Organization',
      name:    'UTUBooking',
      url:     'https://utubooking.com',
      logo: {
        '@type': 'ImageObject',
        url:     'https://utubooking.com/icons/icon-512x512.png',
      },
    },
    mainEntityOfPage: {
      '@type': '@id',
      '@id':   `https://utubooking.com/blog/${slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-utu-bg-page">

      {/* Article structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-utu-navy py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm font-medium mb-6 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToBlog')}
          </Link>
          <span className="inline-block bg-amber-400 text-utu-navy text-xs font-semibold px-2.5 py-1 rounded-full mb-4">
            {category}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-snug">{title}</h1>
          <div className="flex items-center gap-3 text-white/60 text-sm">
            <span>{date}</span>
            <span className="w-1 h-1 rounded-full bg-utu-bg-subtle0" />
            <span>{readTime}</span>
          </div>
        </div>
      </section>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-bold text-utu-text-primary mb-3">{section.heading}</h2>
              <RichBody markdown={section.body} />
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 bg-utu-navy rounded-2xl p-8 text-center">
          <p className="text-white/80 text-sm font-semibold uppercase tracking-widest mb-2">{t('readyToTravel')}</p>
          <h3 className="text-xl font-bold text-white mb-4">{t('bookNextJourney')}</h3>
          <Link
            href="/hotels/search"
            className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-semibold text-sm px-6 py-2.5 rounded-full transition-colors"
          >
            {t('searchHotelsFlights')}
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link href="/blog" className="text-sm text-utu-blue hover:underline font-medium">
            {t('readMoreGuides')}
          </Link>
        </div>
      </article>

    </div>
  );
}
