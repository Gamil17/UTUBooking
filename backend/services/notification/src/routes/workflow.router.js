'use strict';

/**
 * Workflow Notification Route — /api/notifications/send
 *
 * Receives fire-and-forget calls from the workflow engine (port 3014)
 * and sends transactional emails to workflow assignees and initiators.
 *
 * Auth: x-admin-secret header (service-to-service) or Bearer ADMIN_SECRET.
 *
 * Supported types:
 *   workflow_step_assigned   — notify assignee of new task
 *   workflow_step_escalated  — notify escalation target
 *   workflow_sla_reminder    — 50% SLA elapsed reminder
 *   workflow_sla_breached    — SLA breached + auto-escalation notice
 *   workflow_instance_closed — notify initiator of final outcome
 */

const express           = require('express');
const { timingSafeEqual } = require('crypto');
const sendgrid          = require('../lib/sendgrid');
const { pool }          = require('../db/pg');

const router = express.Router();

// ── Service-to-service auth ───────────────────────────────────────────────────
// Accepts x-admin-secret OR Bearer ADMIN_SECRET

function workflowAuth(req, res, next) {
  const secret = process.env.ADMIN_SECRET ?? '';
  if (!secret) return res.status(500).json({ error: 'ADMIN_SECRET_NOT_SET' });

  const fromHeader = req.headers['x-admin-secret'] ?? '';
  const fromBearer = (req.headers.authorization ?? '').replace(/^Bearer\s+/, '');
  const provided   = fromHeader || fromBearer;

  let ok = false;
  try { ok = timingSafeEqual(Buffer.from(provided), Buffer.from(secret)); } catch { ok = false; }

  if (!ok) return res.status(401).json({ error: 'UNAUTHORIZED' });
  next();
}

// ── HTML template builders ────────────────────────────────────────────────────

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #F1F5F9; margin: 0; padding: 0;
`;
const CARD_STYLE = `
  max-width: 600px; margin: 32px auto; background: #FFFFFF;
  border-radius: 12px; overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
`;
const HEADER_STYLE = `
  background: #1E3A5F; padding: 24px 32px;
`;
const BODY_STYLE = `padding: 32px;`;
const FOOTER_STYLE = `
  padding: 20px 32px; border-top: 1px solid #E2E8F0;
  font-size: 12px; color: #94A3B8; text-align: center;
`;

function _wrap(bodyHtml, accentColor = '#2563EB') {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_STYLE}">
      <span style="color:#FFFFFF;font-size:20px;font-weight:700">UTUBooking</span>
      <span style="color:#94C9FF;font-size:14px;margin-left:8px">Admin Workflows</span>
    </div>
    <div style="${BODY_STYLE}">${bodyHtml}</div>
    <div style="${FOOTER_STYLE}">
      UTUBooking.com &mdash; Automated workflow notification &mdash; Do not reply to this email.
      <br>&copy; ${new Date().getFullYear()} AMEC Solutions. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}

function _btn(label, url) {
  return `<a href="${url}" style="display:inline-block;background:#2563EB;color:#FFFFFF;
    padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;
    text-decoration:none;margin-top:20px">${label}</a>`;
}

function _badge(label, color = '#2563EB') {
  return `<span style="display:inline-block;background:${color};color:#fff;
    padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600">${label}</span>`;
}

function _slaBar(slaHours) {
  if (!slaHours) return '';
  return `<p style="color:#475569;font-size:14px;margin-top:16px">
    <strong>SLA:</strong> You have <strong>${slaHours} hour${slaHours !== 1 ? 's' : ''}</strong>
    to complete this task before it escalates automatically.
  </p>`;
}

// ── Template: step assigned ───────────────────────────────────────────────────

function renderStepAssigned({ recipient, data }) {
  const body = `
    <h2 style="color:#1E3A5F;margin:0 0 8px">Action Required</h2>
    <p style="color:#64748B;margin:0 0 24px;font-size:15px">
      You have been assigned a workflow step that requires your decision.
    </p>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:20px;margin-bottom:20px">
      <p style="margin:0 0 8px;font-size:13px;color:#64748B;text-transform:uppercase;letter-spacing:.05em">Workflow</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#1E3A5F">${data.workflow_name}</p>
    </div>

    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:20px;margin-bottom:20px">
      <p style="margin:0 0 6px;font-size:13px;color:#3B82F6;text-transform:uppercase;letter-spacing:.05em">Your Step</p>
      <p style="margin:0;font-size:16px;font-weight:600;color:#1E3073">${data.step_name}</p>
      ${data.context_summary ? `<p style="margin:8px 0 0;font-size:13px;color:#475569">${data.context_summary}</p>` : ''}
    </div>

    ${_slaBar(data.sla_hours)}

    <p style="margin-top:8px">
      Hi ${recipient.name || recipient.email}, please review the details and take action:
    </p>

    ${_btn('Review & Decide', data.approval_url)}
  `;
  return _wrap(body);
}

// ── Template: step escalated ──────────────────────────────────────────────────

function renderStepEscalated({ recipient, data }) {
  const body = `
    <h2 style="color:#DC2626;margin:0 0 8px">${_badge('ESCALATED', '#DC2626')} Escalation Notice</h2>
    <p style="color:#64748B;margin:8px 0 24px;font-size:15px">
      A workflow step has been escalated to you because it exceeded its SLA or was manually escalated.
    </p>

    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:20px;margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:13px;color:#DC2626;text-transform:uppercase">Escalated Step</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#7F1D1D">${data.step_name}</p>
      <p style="margin:6px 0 0;font-size:14px;color:#475569">Workflow: <strong>${data.workflow_name}</strong></p>
      ${data.escalated_by ? `<p style="margin:4px 0 0;font-size:13px;color:#64748B">Escalated by: ${data.escalated_by}</p>` : ''}
    </div>

    <p>Hi ${recipient.name || recipient.email}, this task now requires your immediate attention.
    You have 4 hours before further escalation.</p>

    ${_btn('Handle Escalation', data.approval_url)}
  `;
  return _wrap(body, '#DC2626');
}

// ── Template: SLA reminder ────────────────────────────────────────────────────

function renderSlaReminder({ recipient, data }) {
  const body = `
    <h2 style="color:#D97706;margin:0 0 8px">${_badge('REMINDER', '#D97706')} SLA Deadline Approaching</h2>
    <p style="color:#64748B;margin:8px 0 24px;font-size:15px">
      You have used 50% of your SLA window for the step below. Please act soon.
    </p>

    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:20px;margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:13px;color:#D97706;text-transform:uppercase">Pending Step</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#78350F">${data.step_name}</p>
      ${data.hours_left != null
        ? `<p style="margin:8px 0 0;font-size:15px;color:#92400E">
             <strong>${data.hours_left} hour${data.hours_left !== 1 ? 's' : ''}</strong> remaining before auto-escalation
           </p>`
        : ''}
    </div>

    ${_btn('Act Now', data.approval_url)}
  `;
  return _wrap(body, '#D97706');
}

// ── Template: SLA breached ────────────────────────────────────────────────────

function renderSlaBreached({ recipient, data }) {
  const body = `
    <h2 style="color:#DC2626;margin:0 0 8px">${_badge('OVERDUE', '#DC2626')} SLA Breached</h2>
    <p style="color:#64748B;margin:8px 0 24px;font-size:15px">
      The step below has exceeded its SLA deadline and has been automatically escalated.
    </p>

    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:20px;margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:13px;color:#DC2626;text-transform:uppercase">Overdue Step</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#7F1D1D">${data.step_name}</p>
      ${data.escalated_to
        ? `<p style="margin:8px 0 0;font-size:14px;color:#475569">
             Re-assigned to: <strong>${data.escalated_to}</strong> with a fresh 4-hour SLA.
           </p>`
        : ''}
    </div>

    <p>This is an automated notice. The task has been re-assigned. No further action is required from you
    unless you are the new assignee.</p>

    ${_btn('View Workflow', data.approval_url)}
  `;
  return _wrap(body, '#DC2626');
}

// ── Template: instance closed ─────────────────────────────────────────────────

function renderInstanceClosed({ recipient, data }) {
  const isApproved = data.outcome === 'approved';
  const isRejected = data.outcome === 'rejected';
  const accentColor = isApproved ? '#16A34A' : isRejected ? '#DC2626' : '#64748B';
  const outcomeLabel = data.outcome_label || (isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Closed');
  const badgeColor  = isApproved ? '#16A34A' : isRejected ? '#DC2626' : '#64748B';

  const body = `
    <h2 style="color:${accentColor};margin:0 0 8px">
      ${_badge(outcomeLabel.toUpperCase(), badgeColor)} Workflow Complete
    </h2>
    <p style="color:#64748B;margin:8px 0 24px;font-size:15px">
      The workflow you initiated has reached its final state.
    </p>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:20px;margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:13px;color:#64748B;text-transform:uppercase">Workflow</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1E3A5F">${data.workflow_name}</p>
      <p style="margin:8px 0 0;font-size:15px">
        Outcome: <strong style="color:${accentColor}">${outcomeLabel}</strong>
      </p>
      ${data.note ? `<p style="margin:8px 0 0;font-size:14px;color:#475569;font-style:italic">"${data.note}"</p>` : ''}
    </div>

    ${_btn('View Details', data.instance_url)}
  `;
  return _wrap(body, accentColor);
}

// ── Type → renderer map ───────────────────────────────────────────────────────

const RENDERERS = {
  workflow_step_assigned:  renderStepAssigned,
  workflow_step_escalated: renderStepEscalated,
  workflow_sla_reminder:   renderSlaReminder,
  workflow_sla_breached:   renderSlaBreached,
  workflow_instance_closed: renderInstanceClosed,
};

// ── POST /api/notifications/send ──────────────────────────────────────────────

router.post('/send', workflowAuth, async (req, res) => {
  const { type, recipient, data = {}, subject_en, priority = 'normal' } = req.body ?? {};

  if (!type)               return res.status(400).json({ error: 'TYPE_REQUIRED' });
  if (!recipient?.email)   return res.status(400).json({ error: 'RECIPIENT_EMAIL_REQUIRED' });

  const renderer = RENDERERS[type];
  if (!renderer) {
    return res.status(400).json({ error: 'UNKNOWN_TYPE', message: `Unsupported notification type: ${type}` });
  }

  const subject = subject_en || `UTUBooking Workflow Notification`;
  let html;
  try {
    html = renderer({ recipient, data });
  } catch (err) {
    console.error(`[workflow-notify] render error for type=${type}:`, err.message);
    return res.status(500).json({ error: 'RENDER_ERROR' });
  }

  try {
    const { messageId } = await sendgrid.send({
      to:         recipient.email,
      subject,
      html,
      categories: ['workflow', type, priority],
    });

    // Log to email_log for auditability
    await pool.query(
      `INSERT INTO email_log
         (recipient_email, email_type, subject, delivery_status, message_id, created_at)
       VALUES ($1, $2, $3, 'sent', $4, NOW())`,
      [recipient.email.toLowerCase(), type, subject, messageId ?? null],
    ).catch(err => console.error('[workflow-notify] email_log insert failed:', err.message));

    console.log(`[workflow-notify] sent type=${type} to=${recipient.email} msgId=${messageId}`);
    return res.json({ ok: true, messageId: messageId ?? null });
  } catch (err) {
    console.error(`[workflow-notify] sendgrid error type=${type}:`, err.message);
    return res.status(502).json({ error: 'SEND_FAILED', message: err.message });
  }
});

module.exports = router;
