'use client';

interface AdminStatCardProps {
  label:   string;
  value:   string | number;
  sub?:    string;
  trend?:  'up' | 'down' | 'neutral';
}

export function AdminStatCard({ label, value, sub, trend }: AdminStatCardProps) {
  const trendColor =
    trend === 'up'   ? 'text-emerald-600' :
    trend === 'down' ? 'text-red-500'     :
    'text-gray-500';

  const trendIcon =
    trend === 'up'   ? '↑' :
    trend === 'down' ? '↓' :
    null;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#6B7280]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#111827]">{value}</p>
      {sub && (
        <p className={`mt-1 text-xs ${trendColor}`}>
          {trendIcon && <span className="me-1">{trendIcon}</span>}
          {sub}
        </p>
      )}
    </div>
  );
}
