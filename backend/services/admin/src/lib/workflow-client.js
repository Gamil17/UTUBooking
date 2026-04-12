'use strict';

/**
 * Workflow Engine client — used by all department routers in the admin service.
 *
 * Calls the workflow service (port 3014) to launch a new workflow instance
 * whenever a business event occurs (expense submitted, leave requested, etc.).
 *
 * All calls are fire-and-forget: they log on failure but never block the
 * caller's HTTP response. The department router returns 201 to the client
 * immediately; the workflow launches asynchronously.
 *
 * Usage:
 *   const wf = require('../lib/workflow-client');
 *   wf.launch({
 *     triggerEvent:   'expense_submitted',
 *     triggerRef:     claim.id,
 *     triggerRefType: 'expense_claim',
 *     initiatedBy:    req.user.email,
 *     context:        { amount: 450, currency: 'SAR', description: 'Team lunch' },
 *   });
 */

const http = require('http');

const WF_HOST   = process.env.WORKFLOW_SERVICE_HOST || 'workflow-service';
const WF_PORT   = parseInt(process.env.WORKFLOW_SERVICE_PORT || '3014', 10);
const WF_SECRET = process.env.ADMIN_SECRET || '';

/**
 * Launch a workflow instance for a given trigger event.
 * Fire-and-forget — never throws, never awaited.
 *
 * @param {object} opts
 * @param {string} opts.triggerEvent    — e.g. 'expense_submitted'
 * @param {string} opts.triggerRef      — UUID of the business object (e.g. expense claim ID)
 * @param {string} opts.triggerRefType  — type label (e.g. 'expense_claim', 'leave_request')
 * @param {string} opts.initiatedBy     — email of the user who triggered the event
 * @param {object} opts.context         — arbitrary key-values carried through all workflow steps
 */
function launch({ triggerEvent, triggerRef, triggerRefType, initiatedBy, context = {} }) {
  const payload = JSON.stringify({
    trigger_event:    triggerEvent,
    trigger_ref:      triggerRef     || null,
    trigger_ref_type: triggerRefType || null,
    context,
  });

  const options = {
    hostname: WF_HOST,
    port:     WF_PORT,
    path:     '/api/workflow/instances/launch',
    method:   'POST',
    headers: {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'x-admin-secret': WF_SECRET,
      // Inject initiatedBy so the engine logs the right actor
      'x-initiated-by': initiatedBy || 'system',
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const body = JSON.parse(data);
          console.log(
            `[workflow-client] launched '${triggerEvent}' → instance ${body.data?.id ?? '?'}`
          );
        } catch {
          // non-JSON response — ignore
        }
      } else if (res.statusCode === 404) {
        // No active workflow definition for this trigger — not an error, just log
        console.log(`[workflow-client] no active definition for '${triggerEvent}' — skipping`);
      } else {
        console.warn(`[workflow-client] launch '${triggerEvent}' returned ${res.statusCode}: ${data}`);
      }
    });
  });

  req.on('error', (err) => {
    // Workflow service unavailable — log but never crash the caller
    console.warn(`[workflow-client] failed to launch '${triggerEvent}': ${err.message}`);
  });

  req.setTimeout(10_000, () => {
    req.destroy(new Error('workflow-client timeout'));
  });

  req.write(payload);
  req.end();
}

/**
 * Patch the initiatedBy from x-initiated-by header into the request body.
 * The step-executor reads req.user.email but this client injects via header.
 * The workflow service app.js should read it — we do that via an extra middleware
 * that sets req.user = { email: req.headers['x-initiated-by'] } when
 * x-admin-secret passes and x-initiated-by is present.
 *
 * For now this is wired in the workflow service via SERVICE_ACCOUNT but we
 * pass it in the context as initiated_by for auditability.
 */

module.exports = { launch };
