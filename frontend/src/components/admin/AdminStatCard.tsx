'use client';

interface AdminStatCardProps {
  label:   string;
  value:   string | number;
  sub?:    string;
  trend?:  'up' | 'down' | 'neutral';
}

export function AdminStatCard({ label, value, sub, trend }: AdminStatCardProps) {
  const trendColor =
    trend === 'up'   ? 'text-utu-blue' :
    trend === 'down' ? 'text-red-500'     :
    'text-utu-text-muted';

  const trendIcon =
    trend === 'up'   ? '↑' :
    trend === 'down' ? '↓' :
    null;

  return (
    <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-utu-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-utu-text-primary">{value}</p>
      {sub && (
        <p className={`mt-1 text-xs ${trendColor}`}>
          {trendIcon && <span className="me-1">{trendIcon}</span>}
          {sub}
        </p>
      )}
    </div>
  );
}
