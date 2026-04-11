'use strict';

const repo                         = require('../../db/notification.repo');
const { bulkFilterForCampaign }    = require('../../lib/compliance');
const { send }                     = require('../../lib/sendgrid');
const { render }                   = require('../../lib/templateRenderer');
const { pool }                     = require('../../db/pg');
const Redis                        = require('ioredis');

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

const BATCH_SIZE   = 100;
const BASE_URL     = process.env.APP_URL || 'https://utubooking.com';
const NOTIFY_URL   = process.env.NOTIFICATION_PUBLIC_URL || 'http://localhost:3002';

/**
 * Fetch all opted-in active users for campaign sending.
 * Includes loyalty tier and last booking date for segment filtering.
 */
async function getAllOptedInUsers() {
  const { rows } = await pool.query(`
    SELECT
      u.id,
      u.email,
      u.name_en,
      u.name_ar,
      u.preferred_lang,
      u.preferred_currency,
      COALESCE(u.country_code, '') AS country_code,
      la.tier                       AS loyalty_tier,
      MAX(b.created_at)             AS last_booking_date
    FROM users u
    LEFT JOIN loyalty_accounts la ON la.user_id = u.id
    LEFT JOIN bookings b ON b.user_id = u.id
    WHERE u.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM email_suppressions es
        WHERE es.user_id = u.id
          AND es.booking_id IS NULL
          AND es.lifted_at IS NULL
      )
    GROUP BY u.id, u.email, u.name_en, u.name_ar,
             u.preferred_lang, u.preferred_currency, u.country_code, la.tier
    ORDER BY u.created_at ASC
  `);
  return rows;
}

/**
 * Filter users to a target segment. Returns original array if segment is null.
 */
function applySegmentFilter(users, segment) {
  if (!segment) return users;
  let filtered = users;
  if (segment.countries?.length)
    filtered = filtered.filter(u => segment.countries.includes(u.country_code));
  if (segment.loyalty_tiers?.length)
    filtered = filtered.filter(u => segment.loyalty_tiers.includes(u.loyalty_tier));
  if (segment.min_days_since_booking != null || segment.max_days_since_booking != null) {
    filtered = filtered.filter(u => {
      const days = u.last_booking_date
        ? Math.floor((Date.now() - new Date(u.last_booking_date)) / 86400000)
        : Infinity;
      const min = segment.min_days_since_booking ?? 0;
      const max = segment.max_days_since_booking ?? Infinity;
      return days >= min && days <= max;
    });
  }
  return filtered;
}

/**
 * Wrap a deal CTA URL with the click-tracking redirect.
 */
function trackedUrl(emailLogId, rawUrl) {
  return `${NOTIFY_URL}/track/click?lid=${emailLogId}&url=${encodeURIComponent(rawUrl)}`;
}

/**
 * processCampaignDispatch() — processes all due campaigns.
 */
async function processCampaignDispatch() {
  const campaigns = await repo.getCampaignsToDispatch();
  if (!campaigns.length) return { processed: 0 };

  const redis = getRedis();
  let totalSent = 0;

  for (const campaign of campaigns) {
    await repo.updateCampaignStatus(campaign.id, 'sending', { startedAt: new Date() });

    try {
      let users = await getAllOptedInUsers();

      // Audience segment filter (country, loyalty tier, recency)
      users = applySegmentFilter(users, campaign.target_segment ?? null);

      // Compliance filter — CCPA + GDPR per shard
      users = await bulkFilterForCampaign(users, redis);

      await repo.updateCampaignStatus(campaign.id, 'sending', { totalRecipients: users.length });

      let batchSent = 0, batchFailed = 0;

      // Process in batches
      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);

        await Promise.allSettled(
          batch.map(async (user) => {
            const locale    = user.preferred_lang ?? 'en';
            const userName  = (locale.startsWith('ar') ? user.name_ar : user.name_en) || user.email.split('@')[0];

            const subject = locale.startsWith('ar')
              ? (campaign.subject_ar || campaign.subject_en)
              : campaign.subject_en;

            // Log first to get emailLogId for click-tracked URLs
            const emailLogId = await repo.logEmail({
              userId:            user.id,
              recipientEmail:    user.email,
              emailType:         'monthly_deal_digest',
              emailCategory:     'marketing',
              campaignId:        campaign.id,
              sendgridMessageId: null,
              locale,
              subject,
              deliveryStatus:    'queued',
              errorMessage:      null,
            });

            // Build deals with click-tracked CTA URLs
            const dealsTracked = (campaign.deal_items ?? []).map(d => ({
              ...d,
              cta_url: emailLogId ? trackedUrl(emailLogId, d.cta_url) : d.cta_url,
            }));

            let html;
            try {
              html = render('monthly_deal_digest', locale, {
                user:     { name: userName },
                campaign: { name: campaign.name, subject },
                deals:    dealsTracked,
                unsubscribe_url: `${BASE_URL}/unsubscribe?userId=${user.id}`,
              });
            } catch (renderErr) {
              console.error(`[campaign] render failed for user ${user.id}:`, renderErr.message);
              batchFailed++;
              return;
            }

            let messageId = null;
            let status    = 'sent';
            let errorMsg  = null;

            try {
              const result = await send({
                to:         user.email,
                subject,
                html,
                categories: ['monthly_deal_digest'],
              });
              messageId = result.messageId;
              batchSent++;
            } catch (sendErr) {
              status   = 'failed';
              errorMsg = sendErr.message;
              batchFailed++;
            }

            // Update the pre-logged row with actual messageId + final status
            if (emailLogId) {
              await pool.query(
                `UPDATE email_log SET sendgrid_message_id = $1, delivery_status = $2, error_message = $3 WHERE id = $4`,
                [messageId, status, errorMsg, emailLogId],
              );
            }
          }),
        );

        // Flush counters after each batch
        await repo.incrementCampaignCounters(campaign.id, batchSent, batchFailed);
        totalSent  += batchSent;
        batchSent   = 0;
        batchFailed = 0;
      }

      await repo.updateCampaignStatus(campaign.id, 'sent', { completedAt: new Date() });
      console.log(`[campaign] "${campaign.name}" sent to ${users.length} recipients`);

    } catch (err) {
      console.error(`[campaign] "${campaign.name}" failed:`, err.message);
      await repo.updateCampaignStatus(campaign.id, 'draft'); // revert to draft for retry
    }
  }

  return { processed: campaigns.length, sent: totalSent };
}

module.exports = { processCampaignDispatch };
