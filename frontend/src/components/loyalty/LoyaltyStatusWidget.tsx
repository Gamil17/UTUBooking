'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LoyaltyAccount {
  tier:           string;
  points:         number;
  lifetimePoints: number;
  nextTierAt:     number | null;
  nextTierName:   string | null;
}

const TIER_STYLES: Record<string, { badge: string; icon: string }> = {
  silver:   { badge: 'bg-slate-100 text-slate-700',  icon: '🥈' },
  gold:     { badge: 'bg-amber-100 text-amber-700',  icon: '🥇' },
  platinum: { badge: 'bg-blue-100 text-blue-700',    icon: '💎' },
  elite:    { badge: 'bg-utu-bg-subtle text-utu-navy', icon: '🕋' },
};

function tierStyle(tier: string) {
  return TIER_STYLES[tier.toLowerCase()] ?? { badge: 'bg-slate-100 text-slate-700', icon: '⭐' };
}

export default function LoyaltyStatusWidget({
  joinLabel,
  signInLabel,
}: {
  joinLabel:   string;
  signInLabel: string;
}) {
  const [account,  setAccount]  = useState<LoyaltyAccount | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? sessionStorage.getItem('utu_access_token')
      : null;

    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/loyalty/status', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.points === 'number') setAccount(data);
      })
      .catch(() => {/* service unavailable — show guest UI */})
      .finally(() => setLoading(false));
  }, []);

  // Loading pulse
  if (loading) {
    return (
      <div className="flex justify-center gap-3 mt-8">
        <div className="h-10 w-32 rounded-xl bg-white/20 animate-pulse" />
        <div className="h-10 w-28 rounded-xl bg-white/10 animate-pulse" />
      </div>
    );
  }

  // Logged-in: show live tier + points
  if (account) {
    const style     = tierStyle(account.tier);
    const progress  = account.nextTierAt
      ? Math.min(100, Math.round((account.lifetimePoints / account.nextTierAt) * 100))
      : 100;

    return (
      <div className="mt-8 inline-flex flex-col items-center gap-4 bg-white/10 rounded-2xl px-8 py-6 border border-white/20 min-w-[280px]">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{style.icon}</span>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${style.badge}`}>
            {account.tier}
          </span>
        </div>

        <div className="text-center">
          <p className="text-3xl font-bold text-white">
            {account.points.toLocaleString()}
          </p>
          <p className="text-white/70 text-sm mt-0.5">available points</p>
        </div>

        {account.nextTierAt && account.nextTierName && (
          <div className="w-full">
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>{account.lifetimePoints.toLocaleString()} pts</span>
              <span>{account.nextTierAt.toLocaleString()} for {account.nextTierName}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-amber-400 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Link
          href="/loyalty#rewards"
          className="mt-1 text-sm text-amber-300 hover:text-amber-200 underline underline-offset-2"
        >
          View &amp; redeem rewards
        </Link>
      </div>
    );
  }

  // Guest: show join / sign-in CTAs
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
      <Link
        href="/register"
        className="inline-block bg-amber-400 hover:bg-amber-300 text-utu-navy font-bold px-8 py-3 rounded-xl transition-colors text-sm"
      >
        {joinLabel}
      </Link>
      <Link
        href="/login"
        className="inline-block border border-utu-blue hover:bg-utu-navy text-white/80 font-medium px-8 py-3 rounded-xl transition-colors text-sm"
      >
        {signInLabel}
      </Link>
    </div>
  );
}
