'use strict';

/**
 * Lambda function — Iran Isolation Verification Cron
 *
 * ⚠️  GATE: Only deploy after written OFAC legal clearance is confirmed.
 *     See legal/iran/feasibility-brief.md.
 *
 * Triggered every Monday at 06:00 UTC by EventBridge ScheduledRule.
 * (See infra/cloudformation/15-iran-isolation-cron.yml)
 *
 * Calls GET /api/admin/infrastructure/iran-isolation on the admin service,
 * which runs all 5 isolation checks and returns the JSON report.
 * This Lambda then emails the report via the admin service's SES integration.
 *
 * If the admin service is unreachable, the Lambda logs the failure and
 * sends a FAIL alert directly to the configured SNS topic.
 *
 * Environment variables (set via Lambda env config / SSM):
 *   ADMIN_SERVICE_URL   — e.g. http://admin-service.utu.internal:3012
 *   ADMIN_SECRET        — Bearer token for admin service auth
 *   ALERT_SNS_TOPIC_ARN — SNS topic for P1 alerts (same as utu-global-alerts)
 *   AWS_REGION          — for SNS client (auto-set by Lambda runtime)
 */

const https  = require('https');
const http   = require('http');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const TIMEOUT_MS = 120_000; // 2 min — DB queries can be slow on cold start

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers, timeout: TIMEOUT_MS }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

async function sendSnsAlert(topicArn, subject, message) {
  if (!topicArn) return;
  const sns = new SNSClient({ region: process.env.AWS_REGION ?? 'me-south-1' });
  try {
    await sns.send(new PublishCommand({
      TopicArn: topicArn,
      Subject:  subject,
      Message:  message,
    }));
    console.info('[iran-isolation-cron] SNS alert sent');
  } catch (err) {
    console.error('[iran-isolation-cron] SNS send failed:', err.message);
  }
}

exports.handler = async (event) => {
  const adminUrl    = process.env.ADMIN_SERVICE_URL;
  const adminSecret = process.env.ADMIN_SECRET;
  const snsTopicArn = process.env.ALERT_SNS_TOPIC_ARN;

  if (!adminUrl || !adminSecret) {
    const msg = '[iran-isolation-cron] Missing ADMIN_SERVICE_URL or ADMIN_SECRET';
    console.error(msg);
    await sendSnsAlert(snsTopicArn, '[ERROR] Iran Isolation Cron — Config missing', msg);
    return { statusCode: 500, body: JSON.stringify({ error: msg }) };
  }

  const endpoint = `${adminUrl}/api/admin/infrastructure/iran-isolation`;
  console.info(`[iran-isolation-cron] Calling ${endpoint}`);

  let response;
  try {
    response = await httpGet(endpoint, {
      'Authorization': `Bearer ${adminSecret}`,
      'Accept':        'application/json',
    });
  } catch (err) {
    const msg = `[iran-isolation-cron] Admin service unreachable: ${err.message}`;
    console.error(msg);
    await sendSnsAlert(
      snsTopicArn,
      '[FAIL] Iran Isolation Check — Admin service unreachable',
      `${msg}\n\nEndpoint: ${endpoint}\nThis is an OFAC compliance check failure — investigate immediately.`
    );
    return { statusCode: 503, body: JSON.stringify({ error: msg }) };
  }

  const report = response.body;

  console.info(`[iran-isolation-cron] Check complete — status: ${report?.overallStatus}`);
  console.info(`[iran-isolation-cron] Passed: ${report?.passedChecks}/${report?.totalChecks}`);

  // If any check failed, send immediate P1 SNS alert
  if (report?.overallStatus === 'FAIL') {
    const failedChecks = (report?.checks ?? [])
      .filter((c) => c.status === 'FAIL')
      .map((c) => `  • Check ${c.id} — ${c.name}: ${c.message}`)
      .join('\n');

    const alertMessage = [
      '⚠️  OFAC COMPLIANCE ALERT — Iran Isolation Check FAILED',
      '',
      `Run at: ${report.runAt}`,
      `Failed checks: ${report.totalChecks - report.passedChecks} of ${report.totalChecks}`,
      '',
      'Failed checks:',
      failedChecks,
      '',
      'Action required:',
      '1. Escalate to AMEC Legal Agent immediately',
      '2. Notify OFAC counsel within 24 hours',
      '3. Halt any Iran-related processing until isolation is restored',
      '4. See legal/iran/feasibility-brief.md — Section 10 for disclosure guidance',
      '',
      `Full report: ${adminUrl}/api/admin/infrastructure/iran-isolation`,
    ].join('\n');

    await sendSnsAlert(
      snsTopicArn,
      '[P1 OFAC] Iran Isolation Check FAILED — Immediate Action Required',
      alertMessage
    );
  }

  return {
    statusCode: response.status,
    body:       JSON.stringify({
      overallStatus: report?.overallStatus,
      passedChecks:  report?.passedChecks,
      totalChecks:   report?.totalChecks,
      runAt:         report?.runAt,
    }),
  };
};
