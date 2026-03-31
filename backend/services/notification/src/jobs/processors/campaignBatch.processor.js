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

const BATCH_SIZE  = 100;
const BASE_URL    = process.env.APP_URL || 'https://utubooking.com';

/**
 * Fetch all opted-in active users for campaign sending.
 * Filters out hard-suppressed users.
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
      COALESCE(u.country_code, '') AS country_code
    FROM users u
    WHERE u.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM email_suppressions es
        WHERE es.user_id = u.id
          AND es.booking_id IS NULL
          AND es.lifted_at IS NULL
      )
    ORDER BY u.created_at ASC
  `);
  return rows;
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

            let html;
            try {
              html = render('monthly_deal_digest', locale, {
                user:     { name: userName },
                campaign: { name: campaign.name, subject },
                deals:    campaign.deal_items ?? [],
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

            await repo.logEmail({
              userId:            user.id,
              recipientEmail:    user.email,
              emailType:         'monthly_deal_digest',
              emailCategory:     'marketing',
              campaignId:        campaign.id,
              sendgridMessageId: messageId,
              locale,
              subject,
              deliveryStatus:    status,
              errorMessage:      errorMsg,
            });
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
