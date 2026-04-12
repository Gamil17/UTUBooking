'use client';

/**
 * WorkflowTaskBadge — shown in the admin header.
 *
 * Fetches the current user's pending+overdue workflow task count from the
 * workflow engine and renders a clickable badge linking to /admin/workflows.
 *
 * - Polls every 60 seconds (silent background refresh).
 * - Shows nothing while loading or when count is 0.
 * - Red badge when overdue tasks exist, amber when only pending.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { getWfTaskStats } from '@/lib/api';
import type { WfTaskStats } from '@/lib/api';

export default function WorkflowTaskBadge() {
  const [stats, setStats]   = useState<WfTaskStats | null>(null);
  const [error, setError]   = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getWfTaskStats();
      setStats(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  // Initial load + poll every 60 s
  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  // Don't render anything until data loaded, or on error, or nothing pending
  if (error || !stats) return null;

  const actionable = (stats.pending ?? 0) + (stats.overdue ?? 0) + (stats.escalated ?? 0);
  if (actionable === 0) return null;

  const hasOverdue   = (stats.overdue ?? 0) > 0 || (stats.escalated ?? 0) > 0;
  const badgeColor   = hasOverdue
    ? 'bg-red-500 text-white'
    : 'bg-amber-400 text-amber-900';
  const ringColor    = hasOverdue ? 'ring-red-200'    : 'ring-amber-200';
  const iconColor    = hasOverdue ? 'text-red-600'    : 'text-amber-600';
  const tooltipLabel = hasOverdue
    ? `${stats.overdue + (stats.escalated ?? 0)} overdue task${stats.overdue + (stats.escalated ?? 0) !== 1 ? 's' : ''}`
    : `${actionable} pending task${actionable !== 1 ? 's' : ''}`;

  return (
    <Link
      href="/admin/workflows"
      title={tooltipLabel}
      className={`relative inline-flex items-center gap-1.5 rounded-utu-card border border-utu-border-default bg-utu-bg-card px-3 py-1.5 text-sm font-medium text-utu-text-primary shadow-sm ring-2 ${ringColor} transition hover:bg-utu-bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-utu-blue`}
    >
      <ClipboardList size={15} className={iconColor} />
      <span>My Tasks</span>
      <span
        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold ${badgeColor}`}
      >
        {actionable > 99 ? '99+' : actionable}
      </span>
    </Link>
  );
}
