'use strict';

const repo    = require('../../db/notification.repo');
const { send }   = require('../../lib/sendgrid');
const { render } = require('../../lib/templateRenderer');
const { getNotificationSettings } = require('../../lib/settings');
const axios   = require('axios');

const HOTEL_SERVICE  = process.env.INTERNAL_HOTEL_SERVICE_URL  ?? 'http://hotel-service:3003';
const FLIGHT_SERVICE = process.env.INTERNAL_FLIGHT_SERVICE_URL ?? 'http://flight-service:3004';
const CAR_SERVICE    = process.env.INTERNAL_CAR_SERVICE_URL    ?? 'http://car-service:3005';
const ADMIN_SECRET   = process.env.ADMIN_SECRET ?? '';

/**
 * Fetch the current price for an offer from the relevant service.
 * Returns null if the price cannot be determined (service down, offer expired).
 */
async function getCurrentPrice(productType, offerId) {
  const headers = { Authorization: `Bearer ${ADMIN_SECRET}` };
  try {
    let url;
    if (productType === 'hotel')  url = `${HOTEL_SERVICE}/api/v1/hotels/offers/${offerId}`;
    if (productType === 'flight') url = `${FLIGHT_SERVICE}/api/v1/flights/offers/${offerId}`;
    if (productType === 'car')    url = `${CAR_SERVICE}/api/v1/cars/offers/${offerId}`;
    if (!url) return null;

    const { data } = await axios.get(url, { headers, timeout: 5000 });
    return data?.price ?? data?.totalPrice ?? null;
  } catch {
    return null; // price unavailable — skip this booking
  }
}

function getProductName(booking) {
  const meta = booking.meta ?? {};
  if (booking.product_type === 'hotel')  return meta.name ?? 'Hotel Stay';
  if (booking.product_type === 'flight') return `${meta.from ?? '?'} → ${meta.to ?? '?'}`;
  if (booking.product_type === 'car')    return meta.name ?? 'Car Rental';
  return 'Booking';
}

async function processScanPriceChangeAlerts() {
  const cfg     = await getNotificationSettings();
  const alertPct = cfg.price_alert_threshold / 100; // convert percent → fraction

  const bookings = await repo.getUpcomingConfirmedBookings();
  let sent = 0, skipped = 0;
  const baseUrl = process.env.APP_URL || 'https://utubooking.com';

  for (const booking of bookings) {
    // Post-travel guard
    if (booking.check_in && new Date(booking.check_in) < new Date()) {
      skipped++;
      continue;
    }

    // Only one price alert per booking per day
    const alreadySentToday = await repo.hasPriceAlertBeenSentToday(booking.booking_id);
    if (alreadySentToday) { skipped++; continue; }

    // Get current offer price
    const currentPrice = await getCurrentPrice(booking.product_type, booking.offer_id);
    if (currentPrice == null) { skipped++; continue; }

    const bookedPrice = parseFloat(booking.booked_price);
    const priceDiff   = Math.abs(currentPrice - bookedPrice);
    const threshold   = bookedPrice * alertPct; // configurable via admin settings

    if (priceDiff < threshold) { skipped++; continue; }

    const locale      = booking.preferred_lang ?? 'en';
    const userName    = (locale.startsWith('ar') ? booking.name_ar : booking.name_en) || booking.email.split('@')[0];
    const productName = getProductName(booking);
    const decreased   = currentPrice < bookedPrice;

    const subject = locale.startsWith('ar')
      ? `تحديث سعر حجزك — ${productName}`
      : `Price update on your booking — ${productName}`;

    const html = render('price_change_alert', locale, {
      user:    { name: userName },
      booking: {
        reference_no: booking.reference_no,
        product_type: booking.product_type,
        product_name: productName,
        currency:     booking.currency,
        check_in:     booking.check_in,
        check_out:    booking.check_out,
      },
      old_price:       bookedPrice.toFixed(2),
      new_price:       currentPrice.toFixed(2),
      price_diff:      priceDiff.toFixed(2),
      price_decreased: decreased,
      view_booking_url: `${baseUrl}/account`,
    });

    let messageId = null;
    let status    = 'sent';
    let errorMsg  = null;

    try {
      const result = await send({ to: booking.email, subject, html, categories: ['price_change_alert'] });
      messageId = result.messageId;
    } catch (err) {
      status   = 'failed';
      errorMsg = err.message;
      console.error(`[priceChangeAlert] send failed for booking ${booking.reference_no}:`, err.message);
    }

    await repo.logEmail({
      userId:            booking.user_id,
      recipientEmail:    booking.email,
      emailType:         'price_change_alert',
      emailCategory:     'transactional',
      bookingId:         booking.booking_id,
      bookingRef:        booking.reference_no,
      sendgridMessageId: messageId,
      locale,
      subject,
      deliveryStatus:    status,
      errorMessage:      errorMsg,
    });

    if (status === 'sent') sent++;
    else skipped++;
  }

  console.log(`[priceChangeAlert] scan complete — sent: ${sent}, skipped: ${skipped}`);
  return { sent, skipped };
}

module.exports = { processScanPriceChangeAlerts };
