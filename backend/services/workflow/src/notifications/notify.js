'use strict';

/**
 * Notification client — calls the notification service (port 3002)
 * to send email + in-app notifications for workflow events.
 *
 * All calls are fire-and-forget; callers should .catch() errors themselves.
 *
 * Notification types:
 *  stepAssigned     — a step has been assigned to an approver
 *  stepEscalated    — a step has been escalated to a higher role
 *  slaReminder      — 50% of SLA elapsed; act now
 *  slaBreached      — SLA passed; step is overdue and has been escalated
 *  instanceClosed   — workflow is fully approved or rejected (notify initiator)
 */

const http = require('http');

const NOTIFICATION_HOST = process.env.NOTIFICATION_SERVICE_HOST || 'notification-service';
const NOTIFICATION_PORT = parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3002', 10);
const ADMIN_SECRET      = process.env.ADMIN_SECRET || '';

// ── Base HTTP call ────────────────────────────────────────────────────────────

function _post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: NOTIFICATION_HOST,
      port:     NOTIFICATION_PORT,
      path,
      method:   'POST',
      headers: {
        'Content-Type':    'application/json',
        'Content-Length':  Buffer.byteLength(payload),
        'x-admin-secret':  ADMIN_SECRET,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`Notification service returned ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('Notification service request timed out'));
    });
    req.write(payload);
    req.end();
  });
}

// ── Notification senders ──────────────────────────────────────────────────────

/**
 * Step assigned — sent to the approver when a step activates.
 */
async function stepAssigned({ toEmail, toName, workflowName, stepName, instanceId, stepLogId, slaHours, context }) {
  const approvalUrl = `${process.env.ADMIN_BASE_URL || 'https://admin.utubooking.com'}/admin/workflows/instances/${instanceId}`;

  return _post('/api/notifications/send', {
    type:       'workflow_step_assigned',
    recipient:  { email: toEmail, name: toName },
    data: {
      workflow_name: workflowName,
      step_name:     stepName,
      instance_id:   instanceId,
      step_log_id:   stepLogId,
      sla_hours:     slaHours || null,
      approval_url:  approvalUrl,
      context_summary: _contextSummary(context),
    },
    subject_en: `Action Required: ${stepName} — ${workflowName}`,
    subject_ar: `إجراء مطلوب: ${stepName} — ${workflowName}`,
    priority:   'high',
  });
}

/**
 * Step escalated — sent to the escalation target.
 */
async function stepEscalated({ toEmail, toName, workflowName, stepName, instanceId, stepLogId, escalatedBy }) {
  const approvalUrl = `${process.env.ADMIN_BASE_URL || 'https://admin.utubooking.com'}/admin/workflows/instances/${instanceId}`;

  return _post('/api/notifications/send', {
    type:       'workflow_step_escalated',
    recipient:  { email: toEmail, name: toName },
    data: {
      workflow_name: workflowName,
      step_name:     stepName,
      instance_id:   instanceId,
      step_log_id:   stepLogId,
      escalated_by:  escalatedBy,
      approval_url:  approvalUrl,
    },
    subject_en: `ESCALATED to You: ${stepName} — ${workflowName}`,
    subject_ar: `تصعيد إليك: ${stepName} — ${workflowName}`,
    priority:   'urgent',
  });
}

/**
 * SLA reminder — 50% elapsed, action needed soon.
 */
async function slaReminder({ toEmail, stepName, instanceId, stepLogId, slaDeadline, hoursLeft }) {
  const approvalUrl = `${process.env.ADMIN_BASE_URL || 'https://admin.utubooking.com'}/admin/workflows/instances/${instanceId}`;

  return _post('/api/notifications/send', {
    type:      'workflow_sla_reminder',
    recipient: { email: toEmail },
    data: {
      step_name:    stepName,
      instance_id:  instanceId,
      step_log_id:  stepLogId,
      sla_deadline: slaDeadline,
      hours_left:   hoursLeft,
      approval_url: approvalUrl,
    },
    subject_en: `Reminder: ${stepName} due in ${hoursLeft}h`,
    subject_ar: `تذكير: ${stepName} — متبقي ${hoursLeft} ساعة`,
    priority:   'normal',
  });
}

/**
 * SLA breached — step is overdue and has been auto-escalated.
 */
async function slaBreached({ toEmail, stepName, instanceId, stepLogId, deadline, escalatedTo }) {
  const approvalUrl = `${process.env.ADMIN_BASE_URL || 'https://admin.utubooking.com'}/admin/workflows/instances/${instanceId}`;

  return _post('/api/notifications/send', {
    type:      'workflow_sla_breached',
    recipient: { email: toEmail },
    data: {
      step_name:    stepName,
      instance_id:  instanceId,
      step_log_id:  stepLogId,
      deadline,
      escalated_to: escalatedTo,
      approval_url: approvalUrl,
    },
    subject_en: `OVERDUE: ${stepName} has breached SLA and been escalated`,
    subject_ar: `تجاوز الوقت المحدد: ${stepName} تم تصعيده`,
    priority:   'urgent',
  });
}

/**
 * Instance closed — workflow fully approved or rejected; notify initiator.
 */
async function instanceClosed({ toEmail, workflowName, outcome, instanceId, note }) {
  const instanceUrl = `${process.env.ADMIN_BASE_URL || 'https://admin.utubooking.com'}/admin/workflows/instances/${instanceId}`;
  const outcomeLabel = outcome === 'approved' ? 'Approved' : outcome === 'rejected' ? 'Rejected' : 'Cancelled';

  return _post('/api/notifications/send', {
    type:      'workflow_instance_closed',
    recipient: { email: toEmail },
    data: {
      workflow_name: workflowName,
      outcome,
      outcome_label: outcomeLabel,
      instance_id:   instanceId,
      note:          note || null,
      instance_url:  instanceUrl,
    },
    subject_en: `Workflow ${outcomeLabel}: ${workflowName}`,
    subject_ar: `سير العمل ${outcomeLabel === 'Approved' ? 'موافق عليه' : 'مرفوض'}: ${workflowName}`,
    priority:   outcome === 'rejected' ? 'high' : 'normal',
  });
}

// ── Helper ────────────────────────────────────────────────────────────────────

function _contextSummary(context) {
  if (!context || typeof context !== 'object') return '';
  // Return a readable summary of key context fields
  const keys = ['amount', 'currency', 'requester', 'description', 'department', 'type'];
  return keys
    .filter(k => context[k] !== undefined)
    .map(k => `${k}: ${context[k]}`)
    .join(', ');
}

module.exports = {
  stepAssigned,
  stepEscalated,
  slaReminder,
  slaBreached,
  instanceClosed,
};
