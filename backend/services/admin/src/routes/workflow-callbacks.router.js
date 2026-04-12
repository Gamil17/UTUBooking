'use strict';

/**
 * Workflow Completion Callbacks — POST /internal/workflow/callback
 *
 * Called by the workflow engine (port 3014) when an instance closes
 * (outcome: 'approved' | 'rejected'). Updates the source record in the
 * originating department's table so business records stay in sync.
 *
 * Auth: x-admin-secret header (service-to-service only — never exposed to frontend).
 *
 * Payload:
 *   {
 *     trigger_event    : string   — e.g. 'expense_submitted'
 *     trigger_ref      : string   — UUID of the source record
 *     trigger_ref_type : string   — e.g. 'expense'
 *     outcome          : 'approved' | 'rejected'
 *     initiated_by     : string   — email of the person who triggered the workflow
 *     note             : string?  — optional decision note from the approver
 *   }
 */

const express = require('express');
const { Pool } = require('pg');
const { timingSafeEqual } = require('crypto');

const router = express.Router();
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Service-to-service auth ───────────────────────────────────────────────────

function requireAdminSecret(req, res, next) {
  const secret = process.env.ADMIN_SECRET ?? '';
  if (!secret) return res.status(500).json({ error: 'ADMIN_SECRET_NOT_SET' });

  const provided = req.headers['x-admin-secret'] ?? '';
  let ok = false;
  try {
    const a = Buffer.from(secret);
    const b = Buffer.alloc(a.length);
    Buffer.from(provided).copy(b);
    ok = timingSafeEqual(a, b);
  } catch { ok = false; }

  if (!ok) return res.status(401).json({ error: 'UNAUTHORIZED' });
  next();
}

// ── Callback dispatch table ───────────────────────────────────────────────────
//
// Maps trigger_event → { table, field, approvedValue, rejectedValue }
// null rejectedValue = skip update on rejection (leave record as-is).

const DISPATCH = {
  expense_submitted: {
    table: 'finance_expense_claims',
    field: 'status',
    approvedValue: 'approved',
    rejectedValue: 'rejected',
  },
  leave_requested: {
    table: 'hr_leave_requests',
    field: 'status',
    approvedValue: 'approved',
    rejectedValue: 'rejected',
  },
  supplier_onboard_requested: {
    table: 'procurement_suppliers',
    field: 'status',
    approvedValue: 'active',
    rejectedValue: 'rejected',
  },
  flag_activation: {
    table: 'products_feature_flags',
    field: 'enabled',
    approvedValue: true,
    rejectedValue: false,
  },
  affiliate_applied: {
    table: 'affiliate_applications',
    field: 'status',
    approvedValue: 'approved',
    rejectedValue: 'rejected',
  },
  advertising_enquiry_received: {
    table: 'advertising_enquiries',
    field: 'status',
    approvedValue: 'qualified',
    rejectedValue: 'rejected',
  },
  blog_post_ready: {
    table: 'content_calendar',
    field: 'status',
    approvedValue: 'approved',
    rejectedValue: 'review',   // send back to review queue on rejection
  },
  partner_onboard_requested: {
    table: 'bizdev_partners',
    field: 'status',
    approvedValue: 'live',
    rejectedValue: 'rejected',
  },
  pricing_rule_proposed: {
    table: 'revenue_rules',
    field: 'status',
    approvedValue: 'active',
    rejectedValue: 'inactive',
  },
  case_flagged: {
    table: 'fraud_cases',
    field: 'status',
    approvedValue: 'reviewing',  // escalated for full investigation
    rejectedValue: 'dismissed',
  },
  escalation_raised: {
    table: 'cs_escalations',
    field: 'status',
    approvedValue: 'resolved',
    rejectedValue: 'closed',
  },
  deal_stage_changed: {
    table: 'crm_deals',
    field: 'ceo_review_required',
    approvedValue: false,  // CEO has approved — clear the review flag
    rejectedValue: false,  // Rejected but flag cleared; note stored separately
  },

  // ── Phase 3 additions ───────────────────────────────────────────────────────
  invoice_received: {
    table: 'finance_invoices',
    field: 'status',
    approvedValue: 'approved',
    rejectedValue: 'disputed',
  },
  budget_requested: {
    table: 'finance_budgets',
    field: 'status',
    approvedValue: 'approved',
    rejectedValue: 'rejected',
  },
  rule_change_proposed: {
    table: 'fraud_rules',
    field: 'active',
    approvedValue: true,
    rejectedValue: false,
  },
  blackout_requested: {
    table: 'revenue_blackouts',
    field: 'status',
    approvedValue: 'active',
    rejectedValue: 'cancelled',
  },
  campaign_brief_submitted: {
    table: 'marketing_campaigns',
    field: 'status',
    approvedValue: 'scheduled',
    rejectedValue: 'rejected',
  },
};

// Trigger events where we intentionally skip table updates (owned by other
// services, handled by their own approval flows, or no clean status mapping).
const SKIP_EVENTS = new Set([
  'hire_approved',              // employee record created before workflow fires
  'contract_drafted',           // legal matters managed by Legal dept manually
  'dsr_received',               // erasure_requests owned by auth/compliance service
  'incident_opened',            // resolution managed in Ops manually
  'deploy_requested',           // deployment result is about actuality not approval
  'kpi_threshold_breached',     // BI alerts are informational
  'corporate_enquiry_received', // has its own /approve endpoint with credential creation
  'breach_detected',              // compliance_breaches managed by DPO manually post-close
  'employee_offboarding',         // multi-step physical process; status managed by HR manually
  'performance_review_submitted', // status updated at each review step via PATCH
  'ticket_raised',                // ticket resolution managed by support agent manually
  'contract_expiry_90d',          // procurement contract status updated manually after signing
  'health_score_critical',        // health score updated by CS team via their own PATCH endpoint
  'release_created',              // release is published externally; changelog table is informational
]);

// ── POST /callback ────────────────────────────────────────────────────────────

router.post('/callback', requireAdminSecret, async (req, res) => {
  const {
    trigger_event,
    trigger_ref,
    trigger_ref_type,
    outcome,
    initiated_by,
    note,
  } = req.body ?? {};

  if (!trigger_event) return res.status(400).json({ error: 'TRIGGER_EVENT_REQUIRED' });
  if (!trigger_ref)   return res.status(400).json({ error: 'TRIGGER_REF_REQUIRED' });
  if (!outcome)       return res.status(400).json({ error: 'OUTCOME_REQUIRED' });

  if (outcome !== 'approved' && outcome !== 'rejected') {
    return res.status(400).json({ error: 'INVALID_OUTCOME', message: 'Must be approved or rejected' });
  }

  // Events we intentionally skip
  if (SKIP_EVENTS.has(trigger_event)) {
    console.log(`[wf-callback] skip trigger_event=${trigger_event} outcome=${outcome} ref=${trigger_ref}`);
    return res.json({ ok: true, action: 'skipped', reason: 'no_table_update_for_event' });
  }

  const dispatch = DISPATCH[trigger_event];
  if (!dispatch) {
    console.warn(`[wf-callback] unknown trigger_event=${trigger_event} — no dispatch rule`);
    return res.json({ ok: true, action: 'skipped', reason: 'unknown_trigger_event' });
  }

  const newValue = outcome === 'approved' ? dispatch.approvedValue : dispatch.rejectedValue;

  // null rejectedValue = skip update on rejection (leave record as-is)
  if (newValue === null || newValue === undefined) {
    console.log(`[wf-callback] skip update for trigger_event=${trigger_event} outcome=${outcome}`);
    return res.json({ ok: true, action: 'skipped', reason: 'no_rejected_update_configured' });
  }

  try {
    const result = await pool.query(
      `UPDATE ${dispatch.table}
          SET ${dispatch.field} = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id`,
      [newValue, trigger_ref],
    );

    if (result.rows.length === 0) {
      console.warn(`[wf-callback] no row updated: table=${dispatch.table} id=${trigger_ref}`);
      return res.status(404).json({ error: 'RECORD_NOT_FOUND', table: dispatch.table, id: trigger_ref });
    }

    console.log(
      `[wf-callback] updated table=${dispatch.table} id=${trigger_ref} ${dispatch.field}=${JSON.stringify(newValue)}` +
      ` outcome=${outcome} initiated_by=${initiated_by ?? 'unknown'}`,
    );

    return res.json({
      ok: true,
      action:   'updated',
      table:    dispatch.table,
      id:       trigger_ref,
      field:    dispatch.field,
      newValue,
    });
  } catch (err) {
    console.error(`[wf-callback] DB error table=${dispatch.table} id=${trigger_ref}:`, err.message);
    return res.status(500).json({ error: 'DB_ERROR', message: err.message });
  }
});

module.exports = router;
