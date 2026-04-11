'use strict';

const repo               = require('../../db/notification.repo');
const { checkEmailAllowed } = require('../../lib/compliance');
const { send }           = require('../../lib/sendgrid');
const { render }         = require('../../lib/templateRenderer');
const { getNotificationSettings } = require('../../lib/settings');
const Redis              = require('ioredis');

let redisClient;
function getRedis() {
  if (!redisClient) {
    redisClient = new Redis({
      host:     process.env.REDIS_HOST     || 'redis',
      port:     parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_AUTH_TOKEN || undefined,
      lazyConnect: true,
    });
  }
  return redisClient;
}

/**
 * Build the product display name from booking meta.
 */
function getProductName(booking) {
  const meta = booking.meta ?? {};
  if (booking.product_type === 'hotel')  return meta.name ?? 'Hotel Stay';
  if (booking.product_type === 'flight') return `${meta.from ?? '?'} → ${meta.to ?? '?'}`;
  if (booking.product_type === 'car')    return meta.name ?? 'Car Rental';
  return 'Booking';
}

/**
 * processAbandonedBookingEmail({ bookingId }) — single booking send
 * Called both by the scanner and by the manual trigger endpoint.
 */
async function processAbandonedBookingEmail({ bookingId, booking: bookingData }) {
  // Load configurable settings (cached 60s)
  const cfg = await getNotificationSettings();
  const maxEmails       = cfg.max_recovery_attempts;
  const minIntervalMs   = Math.max(1, cfg.recovery_delay_hours) * 60 * 60 * 1000;

  // If called from scanner, bookingData is already fetched; if from trigger, reload
  let booking = bookingData;
  if (!booking) {
    const all = await repo.getPendingBookingsForRecovery();
    booking = all.find((b) => b.booking_id === bookingId);
    if (!booking) return { skipped: true, reason: 'not_found' };
  }

  // Post-travel guard — never email after check_in date
  if (booking.check_in && new Date(booking.check_in) < new Date()) {
    return { skipped: true, reason: 'past_checkin' };
  }

  const count = await repo.getRecoveryEmailCount(booking.booking_id);
  if (count >= maxEmails) {
    return { skipped: true, reason: 'max_emails_reached' };
  }

  // Rate limit — at least recovery_delay_hours between sends (unless triggered manually)
  if (!bookingData) { // only check timer for scanner, not manual trigger
    const lastSent = await repo.getLastRecoveryEmailTime(booking.booking_id);
    if (lastSent && Date.now() - new Date(lastSent).getTime() < minIntervalMs) {
      return { skipped: true, reason: 'too_soon' };
    }
  }

  // Suppression check
  const suppressed = await repo.isBookingSuppressed(booking.booking_id, booking.user_id);
  if (suppressed) return { skipped: true, reason: 'suppressed' };

  // Compliance: day 1 = transactional, day 2+ = marketing
  const emailType  = count === 0 ? 'transactional' : 'marketing';
  const redis      = getRedis();
  const compliance = await checkEmailAllowed(booking.user_id, emailType, booking.country_code, redis);
  if (!compliance.allowed) return { skipped: true, reason: compliance.reason };

  const locale      = booking.preferred_lang ?? 'en';
  const userName    = (locale.startsWith('ar') ? booking.name_ar : booking.name_en) || booking.email.split('@')[0];
  const productName = getProductName(booking);
  const baseUrl     = process.env.APP_URL || 'https://utubooking.com';

  const subject = locale.startsWith('ar')
    ? `تذكير: أكمل حجزك — ${productName}`
    : `Reminder: Complete your booking — ${productName}`;

  const html = render('abandoned_booking', locale, {
    user:                 { name: userName },
    booking: {
      reference_no:  booking.reference_no,
      product_type:  booking.product_type,
      product_name:  productName,
      total_price:   booking.total_price,
      currency:      booking.currency,
      check_in:      booking.check_in,
      check_out:     booking.check_out,
    },
    attempt_number:       count + 1,
    complete_booking_url: `${baseUrl}/checkout/${booking.product_type}s?ref=${booking.reference_no}`,
    unsubscribe_url:      `${baseUrl}/unsubscribe?userId=${booking.user_id}`,
  });

  let messageId = null;
  let status    = 'sent';
  let errorMsg  = null;

  try {
    const result = await send({ to: booking.email, subject, html, categories: ['abandoned_booking_recovery'] });
    messageId = result.messageId;
  } catch (err) {
    status   = 'failed';
    errorMsg = err.message;
    console.error(`[abandonedBooking] send failed for booking ${booking.reference_no}:`, err.message);
  }

  await repo.logEmail({
    userId:             booking.user_id,
    recipientEmail:     booking.email,
    emailType:          'abandoned_booking_recovery',
    emailCategory:      emailType,
    bookingId:          booking.booking_id,
    bookingRef:         booking.reference_no,
    sendgridMessageId:  messageId,
    locale,
    subject,
    deliveryStatus:     status,
    attemptNumber:      count + 1,
    errorMessage:       errorMsg,
  });

  return { sent: status === 'sent', email: booking.email, attempt: count + 1 };
}

/**
 * processScanAbandonedBookings() — called by Bull cron job
 */
async function processScanAbandonedBookings() {
  const bookings = await repo.getPendingBookingsForRecovery();
  let sent = 0, skipped = 0;

  for (const booking of bookings) {
    const result = await processAbandonedBookingEmail({ bookingId: booking.booking_id, booking });
    if (result.sent)    sent++;
    if (result.skipped) skipped++;
  }

  console.log(`[abandonedBooking] scan complete — sent: ${sent}, skipped: ${skipped}`);
  return { sent, skipped };
}

module.exports = { processScanAbandonedBookings, processAbandonedBookingEmail };
