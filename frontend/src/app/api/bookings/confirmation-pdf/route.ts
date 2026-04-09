/**
 * GET /api/bookings/confirmation-pdf?ref=BOOK123&locale=ur
 *
 * Generates a booking confirmation PDF and streams it to the client.
 * Supports all 9 UTUBooking locales with native scripts:
 *   en, ar, fr, tr, id, ms, ur (Nastaliq), hi (Devanagari), fa (Vazirmatn)
 *
 * Query params:
 *   ref       — booking reference (required)
 *   locale    — BCP-47 locale code, defaults to 'en'
 *
 * In production, replace the mock booking lookup with a real DB/service call.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateBookingPDF, type BookingConfirmationData } from '@/components/checkout/BookingConfirmationPDF';
import { LOCALES, LOCALE_CURRENCY } from '@/i18n/config';
import type { Locale } from '@/i18n/config';

const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL ?? 'http://localhost:3006';
const ADMIN_SECRET    = process.env.ADMIN_SECRET        ?? '';

// ── Extract userId from JWT (parse without verify — ownership check below) ────
function userIdFromAuthHeader(authHeader: string): string | null {
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
    );
    const id = payload.sub ?? payload.id ?? payload.userId ?? null;
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

// ── Booking lookup via booking service ────────────────────────────────────────
async function fetchBooking(
  ref: string,
  locale: Locale,
): Promise<{ data: BookingConfirmationData; ownerId: string | null } | null> {
  if (ADMIN_SECRET) {
    try {
      const res = await fetch(
        `${BOOKING_SERVICE}/api/v1/bookings/by-ref/${encodeURIComponent(ref)}`,
        { headers: { Authorization: `Bearer ${ADMIN_SECRET}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) },
      );
      if (res.ok) {
        const b    = await res.json();
        const meta = (b.meta ?? {}) as Record<string, unknown>;
        const cur  = (b.currency as string | undefined) ?? LOCALE_CURRENCY[locale];
        const total = b.total_price != null
          ? `${cur} ${Number(b.total_price).toLocaleString()}`
          : `${cur} –`;
        return {
          ownerId: (b.user_id as string | undefined) ?? null,
          data: {
            bookingRef:  b.reference_no ?? ref,
            guestName:   `${meta.firstName ?? ''} ${meta.lastName ?? ''}`.trim() || 'Guest',
            hotelName:   (meta.name      as string | undefined)
                      ?? (meta.from ? `${meta.from} → ${meta.to}` : 'Booking'),
            checkIn:     (meta.checkIn    as string | undefined)
                      ?? (meta.pickupDate as string | undefined)
                      ?? (meta.depart     as string | undefined) ?? '',
            checkOut:    (meta.checkOut    as string | undefined)
                      ?? (meta.dropoffDate as string | undefined)
                      ?? (meta.return      as string | undefined) ?? '',
            nights:      Number(meta.nights ?? meta.days ?? 1),
            totalAmount: total,
            locale,
          },
        };
      }
    } catch { /* fall through to fallback */ }
  }

  // Fallback for local dev / booking service unavailable
  const currency = LOCALE_CURRENCY[locale];
  return {
    ownerId: null,
    data: {
      bookingRef:  ref,
      guestName:   'Guest',
      hotelName:   'UTUBooking',
      checkIn:     '',
      checkOut:    '',
      nights:      1,
      totalAmount: `${currency} –`,
      locale,
    },
  };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const requestingUserId = userIdFromAuthHeader(authHeader);

  // Require authentication — PDF contains PII (guest name, amounts, hotel details)
  if (!requestingUserId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const ref    = searchParams.get('ref')?.trim();
  const rawLocale = searchParams.get('locale') ?? 'en';

  if (!ref) {
    return NextResponse.json({ error: 'Missing required param: ref' }, { status: 400 });
  }

  // Validate ref format — prevents path traversal and unexpected input
  if (!/^[A-Z0-9_-]{3,40}$/.test(ref)) {
    return NextResponse.json({ error: 'Invalid booking reference format' }, { status: 400 });
  }

  // Validate locale — fall back to 'en' for unknown values
  const locale: Locale = (LOCALES as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : 'en';

  const result = await fetchBooking(ref, locale);
  if (!result) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const { data: booking, ownerId } = result;

  // Ownership check — if the booking service returned an owner, verify it matches
  if (ownerId && ownerId !== requestingUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateBookingPDF(booking);
  } catch (err) {
    console.error('[confirmation-pdf] PDF generation failed:', err);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }

  // Buffer.concat() returns a plain ArrayBuffer-backed Buffer at runtime.
  // TypeScript types Buffer as Buffer<ArrayBufferLike> (includes SharedArrayBuffer)
  // which breaks the BlobPart constraint — cast is safe here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = new Blob([pdfBuffer as any], { type: 'application/pdf' });

  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Disposition': `attachment; filename="booking-${ref}.pdf"`,
      'Cache-Control':       'private, no-store',
    },
  });
}
