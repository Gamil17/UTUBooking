'use client';

import { useEffect, useState } from 'react';

interface Reward {
  id:           string;
  name_en:      string;
  name_ar:      string | null;
  points_cost:  number;
  type:         string;
  discount_sar: number;
  valid_until:  string | null;
}

interface RedemptionResult {
  rewardName:  string;
  discountSAR: number;
  token:       string;
  message:     string;
}

const TYPE_ICONS: Record<string, string> = {
  hotel_discount:  '🏨',
  flight_discount: '✈️',
  upgrade:         '⬆️',
  voucher:         '🎫',
  free_night:      '🌙',
  lounge_access:   '🛋️',
};

export default function LoyaltyRewardsSection() {
  const [token,       setToken]       = useState<string | null>(null);
  const [rewards,     setRewards]     = useState<Reward[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [redeeming,   setRedeeming]   = useState<string | null>(null);
  const [result,      setResult]      = useState<RedemptionResult | null>(null);
  const [error,       setError]       = useState('');
  const [userPoints,  setUserPoints]  = useState<number | null>(null);

  useEffect(() => {
    const jwt = typeof window !== 'undefined'
      ? sessionStorage.getItem('utu_access_token')
      : null;
    setToken(jwt);

    if (!jwt) { setLoading(false); return; }

    // Fetch rewards + account in parallel
    Promise.all([
      fetch('/api/loyalty/rewards', { headers: { Authorization: `Bearer ${jwt}` } })
        .then((r) => (r.ok ? r.json() : null)),
      fetch('/api/loyalty/status', { headers: { Authorization: `Bearer ${jwt}` } })
        .then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([rewardsData, accountData]) => {
        if (rewardsData?.results) setRewards(rewardsData.results);
        if (typeof accountData?.points === 'number') setUserPoints(accountData.points);
      })
      .catch(() => setError('Could not load rewards.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleRedeem(reward: Reward) {
    if (!token) return;
    if (!confirm(`Redeem "${reward.name_en}" for ${reward.points_cost.toLocaleString()} points?`)) return;

    setRedeeming(reward.id);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/loyalty/redeem', {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rewardId: reward.id }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult(data);
        // Update displayed points balance
        if (typeof userPoints === 'number') {
          setUserPoints((p) => (p !== null ? p - reward.points_cost : p));
        }
      } else {
        setError(data.message ?? data.error ?? 'Redemption failed.');
      }
    } catch {
      setError('Could not connect to loyalty service.');
    } finally {
      setRedeeming(null);
    }
  }

  // Not logged in
  if (!loading && !token) return null;

  return (
    <section id="rewards" className="max-w-5xl mx-auto px-4 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-utu-text-primary">Rewards Catalog</h2>
          <p className="text-sm text-utu-text-muted mt-1">
            Redeem your points for exclusive discounts and upgrades.
          </p>
        </div>
        {userPoints !== null && (
          <div className="rounded-xl bg-utu-bg-card border border-utu-border-default px-4 py-2 text-sm">
            <span className="text-utu-text-muted">Your balance: </span>
            <span className="font-bold text-utu-blue">{userPoints.toLocaleString()} pts</span>
          </div>
        )}
      </div>

      {/* Redemption success banner */}
      {result && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-800 mb-1">{result.rewardName} redeemed!</p>
          {result.discountSAR > 0 && (
            <p className="text-sm text-emerald-700">
              Discount: <span className="font-bold">SAR {result.discountSAR}</span>
            </p>
          )}
          <p className="text-sm text-emerald-700 mt-1">
            Voucher code:{' '}
            <span className="font-mono font-bold tracking-wider bg-white border border-emerald-200 rounded px-2 py-0.5">
              {result.token}
            </span>
          </p>
          <p className="text-xs text-emerald-600 mt-2">
            Use this code at checkout. Keep it safe — it cannot be recovered.
          </p>
          <button
            onClick={() => setResult(null)}
            className="mt-3 text-xs text-emerald-700 underline hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ms-3 underline hover:text-red-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-utu-bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Rewards grid */}
      {!loading && rewards.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rewards.map((r) => {
            const canAfford  = userPoints !== null && userPoints >= r.points_cost;
            const isRedeeming = redeeming === r.id;
            const icon       = TYPE_ICONS[r.type] ?? '🎁';

            return (
              <div
                key={r.id}
                className={`rounded-2xl border bg-utu-bg-card shadow-sm p-5 flex flex-col gap-3 transition-opacity ${
                  !canAfford ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-utu-text-primary leading-snug">{r.name_en}</p>
                    {r.name_ar && (
                      <p className="text-xs text-utu-text-muted font-arabic mt-0.5" dir="rtl">
                        {r.name_ar}
                      </p>
                    )}
                    <p className="text-xs text-utu-text-muted capitalize mt-1">
                      {r.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-utu-blue">
                    {r.points_cost.toLocaleString()} pts
                  </span>
                  {r.discount_sar > 0 && (
                    <span className="text-utu-text-secondary">SAR {r.discount_sar} off</span>
                  )}
                </div>

                {r.valid_until && (
                  <p className="text-[11px] text-utu-text-muted">
                    Expires {new Date(r.valid_until).toLocaleDateString('en-GB')}
                  </p>
                )}

                <button
                  onClick={() => handleRedeem(r)}
                  disabled={!canAfford || !!redeeming}
                  className="mt-auto rounded-xl bg-utu-navy hover:bg-utu-blue text-white text-sm font-medium py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isRedeeming
                    ? 'Redeeming…'
                    : canAfford
                    ? 'Redeem'
                    : `Need ${(r.points_cost - (userPoints ?? 0)).toLocaleString()} more pts`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!loading && rewards.length === 0 && (
        <div className="rounded-2xl border border-utu-border-default bg-utu-bg-card p-12 text-center text-sm text-utu-text-muted">
          No rewards available right now. Check back soon.
        </div>
      )}
    </section>
  );
}
