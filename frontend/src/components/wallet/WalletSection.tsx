'use client';

import { useEffect, useState } from 'react';

interface WalletEntry {
  id:       string;
  currency: string;
  balance:  number;
}

interface ConvertResult {
  fromCurrency: string;
  toCurrency:   string;
  fromAmount:   number;
  toAmount:     number;
  rate:         number;
}

const SUPPORTED = ['SAR', 'AED', 'USD', 'EUR', 'GBP', 'MYR', 'IDR', 'TRY', 'PKR', 'BRL'];

const CURRENCY_FLAGS: Record<string, string> = {
  SAR: '🇸🇦', AED: '🇦🇪', USD: '🇺🇸', EUR: '🇪🇺',
  GBP: '🇬🇧', MYR: '🇲🇾', IDR: '🇮🇩', TRY: '🇹🇷',
  PKR: '🇵🇰', BRL: '🇧🇷',
};

export default function WalletSection({ token }: { token: string }) {
  const [wallets,   setWallets]   = useState<WalletEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [msg,       setMsg]       = useState('');

  // Topup form
  const [topupCur,    setTopupCur]    = useState('SAR');
  const [topupAmt,    setTopupAmt]    = useState('');
  const [toppingUp,   setToppingUp]   = useState(false);

  // Convert form
  const [fromCur,     setFromCur]     = useState('SAR');
  const [toCur,       setToCur]       = useState('USD');
  const [fromAmt,     setFromAmt]     = useState('');
  const [converting,  setConverting]  = useState(false);
  const [convertRes,  setConvertRes]  = useState<ConvertResult | null>(null);

  function authHeaders() {
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  async function loadBalance() {
    setLoading(true);
    try {
      const res = await fetch('/api/wallet/balance', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets ?? []);
      }
    } catch {
      setError('Could not load wallet.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBalance(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleTopup() {
    const amount = Number(topupAmt);
    if (!amount || amount <= 0) { setError('Enter a valid amount.'); return; }
    setToppingUp(true);
    setError('');
    setMsg('');
    try {
      const res  = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: authHeaders(),
        body:   JSON.stringify({ currency: topupCur, amount }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Topped up ${topupCur} ${data.newBalance.toLocaleString()}`);
        setTopupAmt('');
        await loadBalance();
      } else {
        setError(data.message ?? data.error ?? 'Top-up failed.');
      }
    } catch {
      setError('Service unavailable.');
    } finally {
      setToppingUp(false);
    }
  }

  async function handleConvert() {
    const amount = Number(fromAmt);
    if (!amount || amount <= 0) { setError('Enter a valid amount.'); return; }
    if (fromCur === toCur) { setError('Choose different currencies.'); return; }
    setConverting(true);
    setError('');
    setMsg('');
    setConvertRes(null);
    try {
      const res  = await fetch('/api/wallet/convert', {
        method: 'POST',
        headers: authHeaders(),
        body:   JSON.stringify({ fromCurrency: fromCur, toCurrency: toCur, fromAmount: amount }),
      });
      const data = await res.json();
      if (res.ok) {
        setConvertRes(data);
        setFromAmt('');
        await loadBalance();
      } else {
        setError(data.message ?? data.error ?? 'Conversion failed.');
      }
    } catch {
      setError('Service unavailable.');
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-utu-text-primary">My Wallet</h2>

      {/* Balances */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-utu-bg-muted animate-pulse" />
          ))}
        </div>
      ) : wallets.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {wallets.map((w) => (
            <div
              key={w.id}
              className="rounded-xl border border-utu-border-default bg-utu-bg-card p-3 shadow-sm"
            >
              <p className="text-xs text-utu-text-muted mb-0.5">
                {CURRENCY_FLAGS[w.currency] ?? ''} {w.currency}
              </p>
              <p className="font-bold text-utu-text-primary text-lg">
                {w.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-utu-text-muted">No wallet balances yet. Top up to get started.</p>
      )}

      {/* Feedback messages */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-xs underline ms-2">Dismiss</button>
        </div>
      )}
      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center justify-between">
          {msg}
          <button onClick={() => setMsg('')} className="text-xs underline ms-2">Dismiss</button>
        </div>
      )}

      {/* Convert result */}
      {convertRes && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">Conversion complete</p>
          <p>
            {convertRes.fromAmount.toLocaleString()} {convertRes.fromCurrency}
            {' → '}
            <span className="font-bold">{convertRes.toAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {convertRes.toCurrency}</span>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Rate: 1 {convertRes.fromCurrency} = {convertRes.rate.toFixed(4)} {convertRes.toCurrency}
          </p>
          <button onClick={() => setConvertRes(null)} className="mt-2 text-xs underline text-blue-700">Dismiss</button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        {/* Top-up form */}
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-utu-text-primary">Top Up</h3>
          <div className="flex gap-2">
            <select
              value={topupCur}
              onChange={(e) => setTopupCur(e.target.value)}
              className="rounded-lg border border-utu-border-default bg-utu-bg-muted px-2 py-2 text-sm focus:outline-none"
            >
              {SUPPORTED.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={topupAmt}
              onChange={(e) => setTopupAmt(e.target.value)}
              className="flex-1 rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>
          <button
            onClick={handleTopup}
            disabled={toppingUp}
            className="w-full rounded-xl bg-utu-navy hover:bg-utu-blue text-white text-sm font-medium py-2 transition-colors disabled:opacity-50"
          >
            {toppingUp ? 'Processing…' : 'Add Funds'}
          </button>
        </div>

        {/* Convert form */}
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-utu-text-primary">Convert Currency</h3>
          <div className="flex gap-2">
            <select
              value={fromCur}
              onChange={(e) => setFromCur(e.target.value)}
              className="rounded-lg border border-utu-border-default bg-utu-bg-muted px-2 py-2 text-sm focus:outline-none"
            >
              {SUPPORTED.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={fromAmt}
              onChange={(e) => setFromAmt(e.target.value)}
              className="flex-1 rounded-lg border border-utu-border-default bg-utu-bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-utu-text-muted">
            <span>To:</span>
            <select
              value={toCur}
              onChange={(e) => setToCur(e.target.value)}
              className="rounded-lg border border-utu-border-default bg-utu-bg-muted px-2 py-2 text-sm focus:outline-none"
            >
              {SUPPORTED.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button
            onClick={handleConvert}
            disabled={converting}
            className="w-full rounded-xl bg-utu-navy hover:bg-utu-blue text-white text-sm font-medium py-2 transition-colors disabled:opacity-50"
          >
            {converting ? 'Converting…' : 'Convert'}
          </button>
        </div>
      </div>
    </div>
  );
}
