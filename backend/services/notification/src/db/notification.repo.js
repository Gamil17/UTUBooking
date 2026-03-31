'use strict';

const { pool, readPool } = require('./pg');

// ── Recovery email queries ────────────────────────────────────────────────────

/**
 * Returns pending bookings created between 1 and 8 days ago with user details.
 * Used by the abandoned booking recovery scanner.
 */
async function getPendingBookingsForRecovery() {
  const { rows } = await readPool.query(`
    SELECT
      b.id            AS booking_id,
      b.reference_no,
      b.product_type,
      b.total_price,
      b.currency,
      b.check_in,
      b.check_out,
      b.meta,
      b.created_at,
      u.id            AS user_id,
      u.email,
      u.name_en,
      u.name_ar,
      u.preferred_lang,
      u.preferred_currency
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    WHERE b.status = 'pending'
      AND b.created_at >= NOW() - INTERVAL '8 days'
      AND b.created_at <  NOW() - INTERVAL '1 day'
      AND u.is_active = TRUE
    ORDER BY b.created_at ASC
  `);
  return rows;
}

/**
 * Returns confirmed bookings whose check_in falls within the next 24–25 hours.
 * Scan runs every 15 minutes to ensure we catch the 1-hour window reliably.
 */
async function getBookingsFor24hReminder() {
  const { rows } = await readPool.query(`
    SELECT
      b.id            AS booking_id,
      b.reference_no,
      b.product_type,
      b.total_price,
      b.currency,
      b.check_in,
      b.check_out,
      b.meta,
      u.id            AS user_id,
      u.email,
      u.name_en,
      u.name_ar,
      u.preferred_lang
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    WHERE b.status = 'confirmed'
      AND b.check_in::timestamptz >= NOW() + INTERVAL '24 hours'
      AND b.check_in::timestamptz <  NOW() + INTERVAL '25 hours'
      AND u.is_active = TRUE
  `);
  return rows;
}

/**
 * Returns confirmed bookings with check_in within the next 2 days.
 * The processor compares stored booking price vs current offer price.
 */
async function getUpcomingConfirmedBookings() {
  const { rows } = await readPool.query(`
    SELECT
      b.id            AS booking_id,
      b.reference_no,
      b.product_type,
      b.offer_id,
      b.total_price   AS booked_price,
      b.currency,
      b.check_in,
      b.check_out,
      b.meta,
      u.id            AS user_id,
      u.email,
      u.name_en,
      u.name_ar,
      u.preferred_lang
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    WHERE b.status = 'confirmed'
      AND b.check_in::timestamptz >= NOW()
      AND b.check_in::timestamptz <  NOW() + INTERVAL '2 days'
      AND u.is_active = TRUE
  `);
  return rows;
}

// ── Suppression checks ────────────────────────────────────────────────────────

/**
 * Returns true if this booking or user has an active suppression record.
 */
async function isBookingSuppressed(bookingId, userId) {
  const { rows } = await readPool.query(`
    SELECT id FROM email_suppressions
    WHERE (booking_id = $1 OR (booking_id IS NULL AND user_id = $2))
      AND lifted_at IS NULL
    LIMIT 1
  `, [bookingId, userId]);
  return rows.length > 0;
}

// ── Email log queries ─────────────────────────────────────────────────────────

/**
 * Count how many recovery emails have been sent for a booking.
 */
async function getRecoveryEmailCount(bookingId) {
  const { rows } = await readPool.query(`
    SELECT COUNT(*)::int AS cnt
    FROM email_log
    WHERE booking_id = $1
      AND email_type = 'abandoned_booking_recovery'
  `, [bookingId]);
  return rows[0]?.cnt ?? 0;
}

/**
 * Get timestamp of the last recovery email sent for a booking.
 */
async function getLastRecoveryEmailTime(bookingId) {
  const { rows } = await readPool.query(`
    SELECT MAX(sent_at) AS last_sent
    FROM email_log
    WHERE booking_id = $1
      AND email_type = 'abandoned_booking_recovery'
  `, [bookingId]);
  return rows[0]?.last_sent ?? null;
}

/**
 * Check if a 24h reminder has already been sent for this booking.
 */
async function hasCheckinReminderBeenSent(bookingId) {
  const { rows } = await readPool.query(`
    SELECT id FROM email_log
    WHERE booking_id = $1 AND email_type = 'check_in_reminder'
    LIMIT 1
  `, [bookingId]);
  return rows.length > 0;
}

/**
 * Check if a price change alert was sent for this booking today.
 */
async function hasPriceAlertBeenSentToday(bookingId) {
  const { rows } = await readPool.query(`
    SELECT id FROM email_log
    WHERE booking_id = $1
      AND email_type = 'price_change_alert'
      AND sent_at >= CURRENT_DATE
    LIMIT 1
  `, [bookingId]);
  return rows.length > 0;
}

/**
 * Insert a new email_log record. Returns the created row id.
 */
async function logEmail({
  userId, recipientEmail, emailType, emailCategory,
  bookingId, bookingRef, campaignId,
  sendgridMessageId, locale, subject,
  deliveryStatus = 'sent', attemptNumber = 1, errorMessage = null,
}) {
  const { rows } = await pool.query(`
    INSERT INTO email_log
      (user_id, recipient_email, email_type, email_category,
       booking_id, booking_ref, campaign_id,
       sendgrid_message_id, locale, subject,
       delivery_status, attempt_number, error_message, sent_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
    RETURNING id
  `, [
    userId, recipientEmail, emailType, emailCategory,
    bookingId ?? null, bookingRef ?? null, campaignId ?? null,
    sendgridMessageId ?? null, locale, subject,
    deliveryStatus, attemptNumber, errorMessage,
  ]);
  return rows[0].id;
}

/**
 * Update delivery status from SendGrid webhook event.
 */
async function updateDeliveryStatus(sendgridMessageId, deliveryStatus, timestampField, ts) {
  await pool.query(`
    UPDATE email_log
    SET delivery_status = $1,
        ${timestampField} = $2
    WHERE sendgrid_message_id = $3
  `, [deliveryStatus, ts, sendgridMessageId]);
}

/**
 * Auto-create a bounce suppression when SendGrid reports a hard bounce.
 * Looks up user_id from email_log.
 */
async function createSuppressionForBounce(sendgridMessageId) {
  const { rows } = await readPool.query(`
    SELECT user_id, booking_id FROM email_log
    WHERE sendgrid_message_id = $1
    LIMIT 1
  `, [sendgridMessageId]);
  if (!rows.length || !rows[0].user_id) return;

  const { user_id, booking_id } = rows[0];
  await pool.query(`
    INSERT INTO email_suppressions
      (user_id, booking_id, suppression_type, suppressed_by, reason)
    VALUES ($1, $2, 'bounced', 'sendgrid-webhook', 'Hard bounce reported by SendGrid')
    ON CONFLICT DO NOTHING
  `, [user_id, booking_id]);
}

// ── Suppression management ────────────────────────────────────────────────────

async function createSuppression({ userId, bookingId, suppressionType, suppressedBy, reason }) {
  const { rows } = await pool.query(`
    INSERT INTO email_suppressions
      (user_id, booking_id, suppression_type, suppressed_by, reason)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING id
  `, [userId, bookingId ?? null, suppressionType ?? 'manual', suppressedBy ?? null, reason ?? null]);
  return rows[0].id;
}

async function liftSuppression(suppressionId) {
  const { rowCount } = await pool.query(`
    UPDATE email_suppressions
    SET lifted_at = NOW()
    WHERE id = $1 AND lifted_at IS NULL
  `, [suppressionId]);
  return rowCount > 0;
}

// ── Campaign management ───────────────────────────────────────────────────────

async function createCampaign({ name, subjectEn, subjectAr, dealItems, scheduledFor, createdBy }) {
  const { rows } = await pool.query(`
    INSERT INTO email_campaigns
      (name, subject_en, subject_ar, deal_items, scheduled_for, created_by)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *
  `, [name, subjectEn, subjectAr ?? null, JSON.stringify(dealItems ?? []), scheduledFor ?? null, createdBy]);
  return rows[0];
}

async function updateCampaignStatus(campaignId, status, extra = {}) {
  const sets = ['status = $2', 'updated_at = NOW()'];
  const vals = [campaignId, status];
  if (extra.startedAt)   { sets.push(`started_at = $${vals.push(extra.startedAt)}`); }
  if (extra.completedAt) { sets.push(`completed_at = $${vals.push(extra.completedAt)}`); }
  if (extra.totalRecipients != null) { sets.push(`total_recipients = $${vals.push(extra.totalRecipients)}`); }
  await pool.query(`UPDATE email_campaigns SET ${sets.join(', ')} WHERE id = $1`, vals);
}

async function incrementCampaignCounters(campaignId, sentDelta, failedDelta) {
  await pool.query(`
    UPDATE email_campaigns
    SET sent_count   = sent_count   + $2,
        failed_count = failed_count + $3,
        updated_at   = NOW()
    WHERE id = $1
  `, [campaignId, sentDelta, failedDelta]);
}

async function getCampaignsToDispatch() {
  const { rows } = await readPool.query(`
    SELECT * FROM email_campaigns
    WHERE status = 'scheduled'
      AND (scheduled_for IS NULL OR scheduled_for <= NOW())
    ORDER BY scheduled_for ASC NULLS FIRST
    LIMIT 5
  `);
  return rows;
}

// ── Admin list queries ────────────────────────────────────────────────────────

async function listIncompleteBookings({ page = 1, limit = 50, search } = {}) {
  const offset = (page - 1) * limit;
  const params = [`%${search ?? ''}%`, limit, offset];

  const { rows } = await readPool.query(`
    SELECT
      b.id            AS booking_id,
      b.reference_no,
      b.product_type,
      b.total_price,
      b.currency,
      b.check_in,
      b.created_at,
      u.id            AS user_id,
      u.name_en       AS customer_name,
      u.email,
      COALESCE(el.recovery_count, 0)   AS recovery_emails_sent,
      el.last_sent_at,
      (CASE WHEN es.id IS NOT NULL THEN TRUE ELSE FALSE END) AS is_suppressed
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    LEFT JOIN (
      SELECT
        booking_id,
        COUNT(*)                        AS recovery_count,
        MAX(sent_at)                    AS last_sent_at
      FROM email_log
      WHERE email_type = 'abandoned_booking_recovery'
      GROUP BY booking_id
    ) el ON el.booking_id = b.id
    LEFT JOIN email_suppressions es
      ON (es.booking_id = b.id OR (es.booking_id IS NULL AND es.user_id = b.user_id))
     AND es.lifted_at IS NULL
    WHERE b.status = 'pending'
      AND b.created_at < NOW() - INTERVAL '1 day'
      AND (u.email ILIKE $1 OR b.reference_no ILIKE $1)
    ORDER BY b.created_at ASC
    LIMIT $2 OFFSET $3
  `, params);

  const { rows: countRows } = await readPool.query(`
    SELECT COUNT(*)::int AS total
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    WHERE b.status = 'pending'
      AND b.created_at < NOW() - INTERVAL '1 day'
      AND (u.email ILIKE $1 OR b.reference_no ILIKE $1)
  `, [`%${search ?? ''}%`]);

  return { total: countRows[0].total, results: rows };
}

async function listEmailLog({ page = 1, limit = 50, emailType, deliveryStatus, bookingRef } = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params     = [];

  if (emailType)      { params.push(emailType);      conditions.push(`email_type = $${params.length}`); }
  if (deliveryStatus) { params.push(deliveryStatus); conditions.push(`delivery_status = $${params.length}`); }
  if (bookingRef)     { params.push(`%${bookingRef}%`); conditions.push(`booking_ref ILIKE $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await readPool.query(`
    SELECT id, recipient_email, email_type, email_category,
           booking_id, booking_ref, campaign_id,
           delivery_status, sent_at, subject, locale, attempt_number, error_message
    FROM email_log
    ${where}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  const countParams = conditions.length ? params.slice(0, -2) : [];
  const { rows: cRows } = await readPool.query(
    `SELECT COUNT(*)::int AS total FROM email_log ${where}`,
    countParams,
  );

  return { total: cRows[0].total, results: rows };
}

async function listCampaigns({ page = 1, limit = 20, status } = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  const where  = status ? `WHERE status = $${params.push(status)}` : '';
  params.push(limit, offset);

  const { rows } = await readPool.query(`
    SELECT *, CASE WHEN sent_count > 0 THEN ROUND(opened_count::numeric / sent_count * 100, 1) ELSE 0 END AS open_rate
    FROM email_campaigns
    ${where}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  const countParams = status ? [status] : [];
  const { rows: cRows } = await readPool.query(
    `SELECT COUNT(*)::int AS total FROM email_campaigns ${where}`,
    countParams,
  );
  return { total: cRows[0].total, results: rows };
}

async function getCampaignById(campaignId) {
  const { rows } = await readPool.query(
    'SELECT * FROM email_campaigns WHERE id = $1',
    [campaignId],
  );
  return rows[0] ?? null;
}

async function cancelCampaign(campaignId) {
  const { rowCount } = await pool.query(`
    UPDATE email_campaigns
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = $1 AND status IN ('draft', 'scheduled')
  `, [campaignId]);
  return rowCount > 0;
}

async function incrementOpenedCount(campaignId) {
  await pool.query(`
    UPDATE email_campaigns SET opened_count = opened_count + 1, updated_at = NOW()
    WHERE id = $1
  `, [campaignId]);
}

async function getIncompleteBookingStats() {
  const { rows } = await readPool.query(`
    SELECT
      COUNT(*) FILTER (WHERE b.status = 'pending' AND b.created_at < NOW() - INTERVAL '1 day')
        AS total_pending,
      COUNT(*) FILTER (
        WHERE b.status = 'pending'
          AND b.created_at < NOW() - INTERVAL '1 day'
          AND es.id IS NULL
      ) AS recovery_active,
      COUNT(*) FILTER (
        WHERE b.status = 'pending'
          AND b.created_at < NOW() - INTERVAL '1 day'
          AND es.id IS NOT NULL
      ) AS suppressed,
      COUNT(*) FILTER (
        WHERE b.status = 'confirmed'
          AND b.updated_at >= CURRENT_DATE
          AND el.recovery_count > 0
      ) AS recovered_today
    FROM bookings b
    LEFT JOIN email_suppressions es
      ON (es.booking_id = b.id OR (es.booking_id IS NULL AND es.user_id = b.user_id))
     AND es.lifted_at IS NULL
    LEFT JOIN (
      SELECT booking_id, COUNT(*) AS recovery_count
      FROM email_log WHERE email_type = 'abandoned_booking_recovery'
      GROUP BY booking_id
    ) el ON el.booking_id = b.id
  `);
  return rows[0];
}

module.exports = {
  // Recovery
  getPendingBookingsForRecovery,
  getBookingsFor24hReminder,
  getUpcomingConfirmedBookings,
  // Suppression
  isBookingSuppressed,
  createSuppression,
  liftSuppression,
  // Email log
  getRecoveryEmailCount,
  getLastRecoveryEmailTime,
  hasCheckinReminderBeenSent,
  hasPriceAlertBeenSentToday,
  logEmail,
  updateDeliveryStatus,
  createSuppressionForBounce,
  // Campaigns
  createCampaign,
  updateCampaignStatus,
  incrementCampaignCounters,
  incrementOpenedCount,
  getCampaignsToDispatch,
  getCampaignById,
  cancelCampaign,
  // Admin lists
  listIncompleteBookings,
  listEmailLog,
  listCampaigns,
  getIncompleteBookingStats,
};
