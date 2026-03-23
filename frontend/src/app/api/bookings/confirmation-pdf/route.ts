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

// ── Mock booking lookup — replace with real service call ──────────────────────
async function fetchBooking(ref: string, locale: Locale): Promise<BookingConfirmationData | null> {
  // TODO: replace with actual booking service lookup
  // e.g. const res = await fetch(`${process.env.INTERNAL_BOOKING_SERVICE_URL}/bookings/${ref}`)
  const currency = LOCALE_CURRENCY[locale];
  return {
    bookingRef:  ref,
    guestName:   'Test Guest',
    hotelName:   'Swissôtel Makkah',
    checkIn:     '2026-05-26',
    checkOut:    '2026-06-02',
    nights:      7,
    totalAmount: `${currency} 8,400`,
    locale,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ref    = searchParams.get('ref')?.trim();
  const rawLocale = searchParams.get('locale') ?? 'en';

  if (!ref) {
    return NextResponse.json({ error: 'Missing required param: ref' }, { status: 400 });
  }

  // Validate locale — fall back to 'en' for unknown values
  const locale: Locale = (LOCALES as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : 'en';

  const booking = await fetchBooking(ref, locale);
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
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
