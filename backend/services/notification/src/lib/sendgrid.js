'use strict';

const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? '');

/**
 * send({ to, subject, html, replyTo, categories })
 *
 * Sends a single email via SendGrid.
 * Returns { messageId } on success. Throws on 4xx/5xx.
 */
async function send({ to, subject, html, replyTo, categories = [] }) {
  const msg = {
    to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@utubooking.com',
      name:  process.env.SENDGRID_FROM_NAME  || 'UTUBooking',
    },
    replyTo: replyTo || process.env.SENDGRID_REPLY_TO || 'support@utubooking.com',
    subject,
    html,
    categories,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking:  { enable: true },
    },
  };

  const [response] = await sgMail.send(msg);
  const messageId  = response.headers['x-message-id'] ?? null;
  return { messageId };
}

/**
 * processWebhookEvents(events, repo)
 *
 * Handles the SendGrid Event Webhook payload.
 * Updates email_log.delivery_status for: delivered, bounce, open.
 * Auto-creates suppression on hard bounce.
 *
 * @param {object[]} events  — array of SendGrid event objects
 * @param {object}   repo    — notification.repo instance
 */
async function processWebhookEvents(events, repo) {
  if (!Array.isArray(events)) return;

  for (const event of events) {
    const rawId    = event.sg_message_id ?? '';
    const eventType = event.event;
    const ts       = event.timestamp ? new Date(event.timestamp * 1000) : new Date();

    if (!rawId || !eventType) continue;

    // SendGrid appends ".filterXXXX" — strip it
    const cleanId = rawId.split('.')[0];

    switch (eventType) {
      case 'delivered':
        await repo.updateDeliveryStatus(cleanId, 'delivered', 'delivered_at', ts);
        break;

      case 'bounce':
        await repo.updateDeliveryStatus(cleanId, 'bounced', 'bounced_at', ts);
        // Auto-suppress on hard bounce to prevent further sends
        await repo.createSuppressionForBounce(cleanId);
        break;

      case 'open':
        await repo.updateDeliveryStatus(cleanId, 'opened', 'opened_at', ts);
        // Increment campaign opened_count if this email belongs to a campaign
        // The campaign_id lookup is handled separately in repo if needed
        break;

      default:
        // spamreport, unsubscribe, click — not tracked in email_log currently
        break;
    }
  }
}

module.exports = { send, processWebhookEvents };
