'use client';

/**
 * /admin/workflows/instances/[id] — Instance Detail + Audit Trail
 *
 * Sections:
 *   Header         — workflow name, status, context summary, cancel button
 *   Step Progress  — visual timeline of all steps with SLA health
 *   Active Step    — decide (approve/reject/escalate) if this user is the assignee
 *   Audit Trail    — immutable event log
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, XCircle, ArrowUpRight, Clock,
  AlertTriangle, User, Activity, ChevronDown, ChevronRight,
} from 'lucide-react';
import {
  getWfInstance, getWfInstanceEvents, cancelWfInstance, wfDecide,
  type WfInstance, type WfStepLog, type WfEvent,
  type WfInstanceStatus, type WfStepStatus,
} from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const INSTANCE_STATUS_COLORS: Record<WfInstanceStatus, string> = {
  pending:     'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  approved:    'bg-green-100 text-green-700',
  rejected:    'bg-red-100 text-red-700',
  cancelled:   'bg-slate-100 text-slate-500',
  overdue:     'bg-orange-100 text-orange-700',
};

const STEP_STATUS_COLORS: Record<WfStepStatus, string> = {
  pending:   'border-slate-200 bg-slate-50',
  in_progress: 'border-blue-300 bg-blue-50',
  approved:  'border-green-300 bg-green-50',
  rejected:  'border-red-300 bg-red-50',
  escalated: 'border-orange-300 bg-orange-50',
  skipped:   'border-slate-200 bg-slate-50 opacity-60',
  overdue:   'border-red-400 bg-red-50',
};

const STEP_STATUS_ICON: Record<WfStepStatus, React.ReactNode> = {
  pending:    <div className="h-3 w-3 rounded-full border-2 border-slate-300" />,
  in_progress: <div className="h-3 w-3 rounded-full border-2 border-blue-500 bg-blue-200 animate-pulse" />,
  approved:   <CheckCircle2 size={14} className="text-green-600" />,
  rejected:   <XCircle size={14} className="text-red-600" />,
  escalated:  <ArrowUpRight size={14} className="text-orange-500" />,
  skipped:    <div className="h-3 w-3 rounded-full border-2 border-slate-300 bg-slate-100" />,
  overdue:    <AlertTriangle size={14} className="text-red-500" />,
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  instance_started:   <Activity size={14} className="text-utu-blue" />,
  step_activated:     <ChevronRight size={14} className="text-blue-500" />,
  step_approved:      <CheckCircle2 size={14} className="text-green-600" />,
  step_rejected:      <XCircle size={14} className="text-red-600" />,
  step_escalated:     <ArrowUpRight size={14} className="text-orange-500" />,
  auto_approved:      <CheckCircle2 size={14} className="text-teal-600" />,
  sla_reminder:       <Clock size={14} className="text-yellow-500" />,
  sla_breached:       <AlertTriangle size={14} className="text-red-500" />,
  instance_approved:  <CheckCircle2 size={14} className="text-green-700" />,
  instance_rejected:  <XCircle size={14} className="text-red-700" />,
  instance_cancelled: <XCircle size={14} className="text-slate-500" />,
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fmtDeadline(iso: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'Overdue';
  const h = Math.floor(diff / 1000 / 3600);
  const m = Math.floor((diff / 1000 / 60) % 60);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

// ─── Step Progress Timeline ───────────────────────────────────────────────────

function StepTimeline({ steps, currentIndex }: { steps: WfStepLog[]; currentIndex: number }) {
  return (
    <div className="space-y-0">
      {steps.map((step, idx) => (
        <div key={step.id}>
          <div className={`rounded-lg border p-4 ${STEP_STATUS_COLORS[step.status]}`}>
            <div className="flex items-start gap-3">
              {/* Status icon */}
              <div className="mt-0.5 shrink-0">
                {STEP_STATUS_ICON[step.status]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-utu-text-primary">{step.step_name}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    step.status === 'approved' ? 'bg-green-100 text-green-700' :
                    step.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    step.status === 'overdue' || step.status === 'escalated' ? 'bg-orange-100 text-orange-700' :
                    step.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {step.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-utu-text-muted">{step.step_type}</span>
                </div>

                {/* Assignee */}
                {step.assignee_email && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-utu-text-muted">
                    <User size={11} />
                    {step.assignee_email}
                    {step.assignee_role && <span className="ms-1 text-utu-text-muted">({step.assignee_role})</span>}
                  </p>
                )}

                {/* SLA */}
                {step.sla_deadline && (
                  <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                    step.status === 'in_progress' && new Date(step.sla_deadline) < new Date()
                      ? 'text-red-600'
                      : step.status === 'in_progress'
                      ? 'text-yellow-600'
                      : 'text-utu-text-muted'
                  }`}>
                    <Clock size={11} />
                    SLA: {fmtDate(step.sla_deadline)}
                    {step.status === 'in_progress' && (
                      <span className="ms-1">({fmtDeadline(step.sla_deadline)})</span>
                    )}
                  </p>
                )}

                {/* Decision */}
                {step.decision && (
                  <p className="mt-1 text-xs text-utu-text-muted">
                    Decision: <span className="font-medium text-utu-text-primary">{step.decision}</span>
                    {step.decision_by && <span> by {step.decision_by}</span>}
                    {step.decision_at && <span> at {fmtDate(step.decision_at)}</span>}
                  </p>
                )}
                {step.comments && (
                  <p className="mt-1 text-xs text-utu-text-muted italic">
                    "{step.comments}"
                  </p>
                )}
                {step.escalated_to && (
                  <p className="mt-1 text-xs text-orange-600">
                    Escalated to: {step.escalated_to}
                  </p>
                )}
              </div>

              {/* Step number badge */}
              <span className="shrink-0 text-xs font-medium text-utu-text-muted">{idx + 1}</span>
            </div>
          </div>

          {/* Connector arrow */}
          {idx < steps.length - 1 && (
            <div className="flex items-center justify-center py-1">
              <div className="h-4 w-px bg-utu-border-default" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Audit Trail ─────────────────────────────────────────────────────────────

function AuditTrail({ events }: { events: WfEvent[] }) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute start-5 top-0 bottom-0 w-px bg-utu-border-default" />

      <div className="space-y-1">
        {events.map(ev => (
          <div key={ev.id} className="flex items-start gap-3 ps-12 relative">
            {/* Icon bubble */}
            <div className="absolute start-3 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-utu-bg-card border border-utu-border-default z-10">
              {EVENT_ICONS[ev.event_type] ?? <Activity size={12} className="text-utu-text-muted" />}
            </div>

            <div className="flex-1 py-2">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-medium text-utu-text-primary">
                  {ev.event_type.replace(/_/g, ' ')}
                </span>
                {ev.step_name && (
                  <span className="text-xs text-utu-text-muted">— {ev.step_name}</span>
                )}
                <span className="ms-auto text-xs text-utu-text-muted shrink-0">{fmtDate(ev.created_at)}</span>
              </div>
              <p className="text-xs text-utu-text-muted">
                by <span className="font-medium">{ev.actor}</span>
              </p>
              {ev.meta && Object.keys(ev.meta).length > 0 && (
                <div className="mt-1 rounded bg-utu-bg-muted px-2 py-1">
                  <p className="text-xs text-utu-text-muted font-mono break-all">
                    {Object.entries(ev.meta)
                      .filter(([, v]) => v !== null && v !== undefined)
                      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                      .join(' · ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkflowInstancePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: instance, isLoading } = useQuery({
    queryKey: ['wf-instance', id],
    queryFn:  () => getWfInstance(id),
    refetchInterval: 15_000,
  });

  const { data: events } = useQuery({
    queryKey: ['wf-events', id],
    queryFn:  () => getWfInstanceEvents(id),
    refetchInterval: 15_000,
  });

  const [comments, setComments] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [actionError, setActionError] = useState('');

  const cancel = useMutation({
    mutationFn: (reason: string) => cancelWfInstance(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wf-instance', id] }),
  });

  const decide = useMutation({
    mutationFn: wfDecide,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wf-instance', id] });
      qc.invalidateQueries({ queryKey: ['wf-events', id] });
      setComments('');
    },
    onError: (err: Error) => setActionError(err.message),
  });

  async function handleDecide(stepLog: WfStepLog, decision: 'approve' | 'reject' | 'escalate') {
    setDeciding(true); setActionError('');
    try {
      await decide.mutateAsync({ instance_id: id, step_log_id: stepLog.id, decision, comments });
    } finally {
      setDeciding(false);
    }
  }

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-utu-text-muted">Loading instance...</div>;
  }

  if (!instance) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-utu-text-muted">Instance not found.</p>
        <Link href="/admin/workflows" className="mt-3 inline-block text-sm text-utu-blue hover:underline">
          Back to Workflows
        </Link>
      </div>
    );
  }

  const activeStep = instance.step_logs?.find(
    s => s.status === 'in_progress' || s.status === 'overdue' || s.status === 'escalated'
  );
  const isComplete = ['approved','rejected','cancelled'].includes(instance.status);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/workflows" className="mt-1 text-utu-text-muted hover:text-utu-text-primary shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-utu-text-primary truncate">
              {instance.workflow_name ?? 'Workflow Instance'}
            </h1>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${INSTANCE_STATUS_COLORS[instance.status]}`}>
              {instance.status.replace('_', ' ')}
            </span>
          </div>
          <p className="mt-1 text-xs text-utu-text-muted">
            {instance.department} &middot; trigger: <code className="bg-utu-bg-muted px-1 rounded">{instance.trigger_event}</code>
            {instance.trigger_ref && <span> / {instance.trigger_ref_type}: {instance.trigger_ref}</span>}
            &middot; by {instance.initiated_by} &middot; started {fmtDate(instance.started_at)}
          </p>
        </div>

        {/* Cancel button */}
        {!isComplete && (
          <button
            onClick={() => { const r = prompt('Reason for cancellation?'); if (r !== null) cancel.mutate(r); }}
            className="shrink-0 rounded border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Cancel Workflow
          </button>
        )}
      </div>

      {/* Context */}
      {instance.context && Object.keys(instance.context).length > 0 && (
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-utu-text-muted">Context</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {Object.entries(instance.context).map(([k, v]) => (
              <div key={k}>
                <span className="text-xs text-utu-text-muted">{k}: </span>
                <span className="text-xs font-medium text-utu-text-primary">{String(v)}</span>
              </div>
            ))}
          </div>
          {instance.outcome_note && (
            <p className="mt-2 text-sm text-utu-text-secondary italic">
              Outcome note: "{instance.outcome_note}"
            </p>
          )}
        </div>
      )}

      {/* Active step: decision panel */}
      {activeStep && (
        <div className={`rounded-utu-card border-2 p-5 ${
          activeStep.status === 'overdue' ? 'border-red-400 bg-red-50' : 'border-utu-blue bg-blue-50'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-utu-text-muted mb-1">
                {activeStep.status === 'overdue' ? 'OVERDUE — Action Required' : 'Awaiting Your Decision'}
              </p>
              <h3 className="text-base font-semibold text-utu-text-primary">{activeStep.step_name}</h3>
              <p className="mt-0.5 text-xs text-utu-text-muted">
                Assigned to: {activeStep.assignee_email ?? activeStep.assignee_role ?? 'unassigned'}
                {activeStep.sla_deadline && (
                  <span className="ms-2 font-medium text-yellow-700">
                    <Clock size={11} className="inline me-0.5" />
                    {fmtDeadline(activeStep.sla_deadline)}
                  </span>
                )}
              </p>
            </div>
          </div>

          {actionError && (
            <p className="mt-3 rounded bg-red-100 px-3 py-2 text-xs text-red-700">{actionError}</p>
          )}

          <div className="mt-4">
            <label className="text-xs font-medium text-utu-text-muted">Comments (optional)</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded border border-utu-border-default bg-white px-3 py-2 text-sm text-utu-text-primary focus:outline-none focus:ring-1 focus:ring-utu-blue resize-none"
              value={comments} onChange={e => setComments(e.target.value)}
              placeholder="Add context for your decision..."
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => handleDecide(activeStep, 'approve')} disabled={deciding}
              className="flex items-center gap-1.5 rounded bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 size={13} /> Approve
            </button>
            <button
              onClick={() => handleDecide(activeStep, 'reject')} disabled={deciding}
              className="flex items-center gap-1.5 rounded bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle size={13} /> Reject
            </button>
            <button
              onClick={() => handleDecide(activeStep, 'escalate')} disabled={deciding}
              className="flex items-center gap-1.5 rounded bg-orange-500 px-4 py-2 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              <ArrowUpRight size={13} /> Escalate
            </button>
          </div>
        </div>
      )}

      {/* Completion note */}
      {isComplete && (
        <div className={`rounded-utu-card border p-4 ${
          instance.status === 'approved' ? 'border-green-300 bg-green-50' :
          instance.status === 'rejected' ? 'border-red-300 bg-red-50' :
          'border-slate-300 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2">
            {instance.status === 'approved' && <CheckCircle2 size={16} className="text-green-600" />}
            {instance.status === 'rejected' && <XCircle size={16} className="text-red-600" />}
            <p className="text-sm font-medium text-utu-text-primary capitalize">
              Workflow {instance.status}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-utu-text-muted">
            Completed {fmtDate(instance.completed_at)}
            {instance.outcome_note && <span> &middot; "{instance.outcome_note}"</span>}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Step timeline */}
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-utu-text-primary">
            Step Progress
            <span className="ms-2 text-xs font-normal text-utu-text-muted">
              Step {instance.current_step_index + 1} of {instance.step_logs?.length ?? '?'}
            </span>
          </h2>
          {instance.step_logs?.length ? (
            <StepTimeline steps={instance.step_logs} currentIndex={instance.current_step_index} />
          ) : (
            <p className="text-sm text-utu-text-muted">No steps recorded yet.</p>
          )}
        </div>

        {/* Audit trail */}
        <div className="rounded-utu-card border border-utu-border-default bg-utu-bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-utu-text-primary">
            Audit Trail
            {events && <span className="ms-2 text-xs font-normal text-utu-text-muted">({events.length} events)</span>}
          </h2>
          {events?.length ? (
            <AuditTrail events={events} />
          ) : (
            <p className="text-sm text-utu-text-muted">No events yet.</p>
          )}
        </div>
      </div>

      {/* Definition link */}
      <div className="text-right">
        <Link
          href={`/admin/workflows/${instance.definition_id}`}
          className="text-xs text-utu-blue hover:underline"
        >
          View workflow definition (v{instance.definition_version})
        </Link>
      </div>
    </div>
  );
}
