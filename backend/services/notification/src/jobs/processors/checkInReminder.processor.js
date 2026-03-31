'use strict';

const repo    = require('../../db/notification.repo');
const { send }   = require('../../lib/sendgrid');
const { render } = require('../../lib/templateRenderer');

function getProductName(booking) {
  const meta = booking.meta ?? {};
  if (booking.product_type === 'hotel')  return meta.name ?? 'Hotel Stay';
  if (booking.product_type === 'flight') return `${meta.from ?? '?'} → ${meta.to ?? '?'}`;
  if (booking.product_type === 'car')    return meta.name ?? 'Car Rental';
  return 'Booking';
}

async function processScanCheckInReminders() {
  const bookings = await repo.getBookingsFor24hReminder();
  let sent = 0, skipped = 0;
  const baseUrl = process.env.APP_URL || 'https://utubooking.com';

  for (const booking of bookings) {
    // Post-travel guard (redundant here but defensive)
    if (booking.check_in && new Date(booking.check_in) < new Date()) {
      skipped++;
      continue;
    }

    // Idempotency — only send once per booking
    const alreadySent = await repo.hasCheckinReminderBeenSent(booking.booking_id);
    if (alreadySent) { skipped++; continue; }

    const locale      = booking.preferred_lang ?? 'en';
    const userName    = (locale.startsWith('ar') ? booking.name_ar : booking.name_en) || booking.email.split('@')[0];
    const productName = getProductName(booking);
    const meta        = booking.meta ?? {};

    const subject = locale.startsWith('ar')
      ? `تذكير: رحلتك تبدأ خلال 24 ساعة — ${productName}`
      : `Your trip starts in 24 hours — ${productName}`;

    const html = render('check_in_reminder', locale, {
      user:    { name: userName },
      booking: {
        reference_no:  booking.reference_no,
        product_type:  booking.product_type,
        product_name:  productName,
        total_price:   booking.total_price,
        currency:      booking.currency,
        check_in:      booking.check_in,
        check_out:     booking.check_out,
        address:       meta.address ?? null,
        is_hajj_umrah: !!meta.isHajjUmrah,
      },
      view_booking_url: `${baseUrl}/account`,
      support_url:      `${baseUrl}/support`,
    });

    let messageId = null;
    let status    = 'sent';
    let errorMsg  = null;

    try {
      const result = await send({ to: booking.email, subject, html, categories: ['check_in_reminder'] });
      messageId = result.messageId;
    } catch (err) {
      status   = 'failed';
      errorMsg = err.message;
      console.error(`[checkInReminder] send failed for booking ${booking.reference_no}:`, err.message);
    }

    await repo.logEmail({
      userId:            booking.user_id,
      recipientEmail:    booking.email,
      emailType:         'check_in_reminder',
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

  console.log(`[checkInReminder] scan complete — sent: ${sent}, skipped: ${skipped}`);
  return { sent, skipped };
}

module.exports = { processScanCheckInReminders };
