'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAccountSettings, updateAccountSettings, changePortalPassword,
  type AccountSettings, type FlightClass,
} from '@/lib/portal-api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sarFmt(n: number) {
  return `SAR ${Math.round(n).toLocaleString()}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const FLIGHT_CLASS_OPTIONS: { value: FlightClass; label: string }[] = [
  { value: 'economy',         label: 'Economy' },
  { value: 'premium_economy', label: 'Premium Economy' },
  { value: 'business',        label: 'Business Class' },
  { value: 'first',           label: 'First Class' },
];

const TIER_LABELS: Record<string, string> = {
  enterprise: 'Enterprise',
  premium:    'Premium',
  standard:   'Standard',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProSettingsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['portal-account-settings'],
    queryFn:  getAccountSettings,
    staleTime: 120_000,
  });
  const account: AccountSettings | null = (data as any)?.data ?? null;

  // Form state — mirrors the travel policy fields that portal users can edit
  const [maxFlightClass,       setMaxFlightClass]       = useState<FlightClass>('economy');
  const [maxHotelStars,        setMaxHotelStars]        = useState(4);
  const [perDiem,              setPerDiem]              = useState('');
  const [advanceBooking,       setAdvanceBooking]       = useState('');
  const [airlines,             setAirlines]             = useState('');
  // VAT / billing
  const [vatNumber,            setVatNumber]            = useState('');
  const [vatCountry,           setVatCountry]           = useState<'SA' | 'AE' | 'OTHER'>('SA');
  const [billingAddress,       setBillingAddress]       = useState('');
  const [billingContactName,   setBillingContactName]   = useState('');
  const [billingContactEmail,  setBillingContactEmail]  = useState('');
  const [saved,                setSaved]                = useState(false);
  const [saveError,            setSaveError]            = useState('');
  // Change password form
  const [currentPwd,           setCurrentPwd]           = useState('');
  const [newPwd,               setNewPwd]               = useState('');
  const [confirmPwd,           setConfirmPwd]           = useState('');
  const [pwdError,             setPwdError]             = useState('');
  const [pwdSaved,             setPwdSaved]             = useState(false);

  // Sync form when account loads
  useEffect(() => {
    if (!account) return;
    setMaxFlightClass(account.max_flight_class);
    setMaxHotelStars(account.max_hotel_stars);
    setPerDiem(String(Math.round(account.per_diem_sar)));
    setAdvanceBooking(String(account.advance_booking_days));
    setAirlines((account.preferred_airlines ?? []).join(', '));
    setVatNumber(account.vat_number ?? '');
    setVatCountry((account.vat_country as 'SA' | 'AE' | 'OTHER') ?? 'SA');
    setBillingAddress(account.billing_address ?? '');
    setBillingContactName(account.billing_contact_name ?? '');
    setBillingContactEmail(account.billing_contact_email ?? '');
  }, [account]);

  const saveMut = useMutation({
    mutationFn: updateAccountSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-account-settings'] });
      setSaved(true);
      setSaveError('');
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e: any) => setSaveError(e?.message || 'Save failed. Please try again.'),
  });

  const changePwdMut = useMutation({
    mutationFn: changePortalPassword,
    onSuccess: () => {
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdError('');
      setPwdSaved(true);
      setTimeout(() => setPwdSaved(false), 4000);
    },
    onError: (e: any) => {
      const code = e?.error;
      if (code === 'WRONG_CURRENT_PASSWORD') {
        setPwdError('Current password is incorrect.');
      } else if (code === 'SAME_PASSWORD') {
        setPwdError('New password must be different from your current password.');
      } else {
        setPwdError(e?.message || 'Password change failed. Please try again.');
      }
    },
  });

  function handleChangePassword() {
    setPwdError('');
    if (!currentPwd)  { setPwdError('Enter your current password.'); return; }
    if (newPwd.length < 8) { setPwdError('New password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(newPwd)) { setPwdError('New password must contain at least one uppercase letter.'); return; }
    if (!/[a-z]/.test(newPwd)) { setPwdError('New password must contain at least one lowercase letter.'); return; }
    if (!/[0-9]/.test(newPwd)) { setPwdError('New password must contain at least one number.'); return; }
    if (newPwd !== confirmPwd) { setPwdError('New passwords do not match.'); return; }
    changePwdMut.mutate({ current_password: currentPwd, new_password: newPwd });
  }

  function handleSave() {
    const airlinesArr = airlines.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    saveMut.mutate({
      max_flight_class:       maxFlightClass,
      max_hotel_stars:        maxHotelStars,
      per_diem_sar:           perDiem       ? parseFloat(perDiem)      : 0,
      advance_booking_days:   advanceBooking ? parseInt(advanceBooking) : 14,
      preferred_airlines:     airlinesArr.length > 0 ? airlinesArr : null,
      vat_number:             vatNumber.trim() || undefined,
      vat_country:            vatCountry,
      billing_address:        billingAddress.trim() || undefined,
      billing_contact_name:   billingContactName.trim() || undefined,
      billing_contact_email:  billingContactEmail.trim() || undefined,
    });
  }

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-utu-text-muted">Loading…</div>;
  }

  if (!account) {
    return (
      <div className="py-20 text-center text-sm text-utu-text-muted">
        Unable to load account settings. Please refresh the page.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Settings</h1>
        <p className="text-sm text-utu-text-muted mt-1">
          Manage your travel policy and account information.
        </p>
      </div>

      {/* ── Account overview (read-only) ── */}
      <section className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6 space-y-5">
        <h2 className="text-sm font-semibold text-utu-text-primary">Account Overview</h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoRow label="Company">{account.company_name}</InfoRow>
          <InfoRow label="Plan">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
              account.tier === 'enterprise' ? 'bg-amber-50 border-amber-200 text-amber-700'
              : account.tier === 'premium'  ? 'bg-blue-50 border-blue-200 text-utu-blue'
                                            : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}>
              {TIER_LABELS[account.tier] ?? account.tier}
            </span>
          </InfoRow>
          <InfoRow label="Industry"><span className="capitalize">{account.industry.replace(/_/g, ' ')}</span></InfoRow>
          {account.country && <InfoRow label="Country">{account.country}</InfoRow>}
          <InfoRow label="Annual Travel Budget">{sarFmt(account.annual_travel_budget_sar)}</InfoRow>
          <InfoRow label="Corporate Discount">{account.discount_pct}%</InfoRow>
          <InfoRow label="Total Bookings">{account.total_bookings.toLocaleString()}</InfoRow>
          <InfoRow label="Total Spend">{sarFmt(account.total_spend_sar)}</InfoRow>
          {account.contract_start && <InfoRow label="Contract Start">{fmtDate(account.contract_start)}</InfoRow>}
          {account.contract_end   && <InfoRow label="Contract Expiry">{fmtDate(account.contract_end)}</InfoRow>}
          <InfoRow label="Portal Activated">{fmtDate(account.activated_at)}</InfoRow>
        </div>

        <p className="text-xs text-utu-text-muted border-t border-utu-border-default pt-4">
          To update your company details, annual budget, or contract terms, contact your UTUBooking account manager.
        </p>
      </section>

      {/* ── Travel Policy (editable) ── */}
      <section className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-utu-text-primary">Travel Policy</h2>
          <p className="text-xs text-utu-text-muted">Applied to all bookings in this account</p>
        </div>

        {/* Max flight class */}
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-2">
            Maximum Cabin Class
          </label>
          <p className="text-xs text-utu-text-muted mb-2">
            Bookings above this class will be flagged and require approval.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FLIGHT_CLASS_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setMaxFlightClass(o.value)}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  maxFlightClass === o.value
                    ? 'border-utu-blue bg-blue-50 text-utu-blue'
                    : 'border-utu-border-default text-utu-text-secondary hover:bg-utu-bg-subtle'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Max hotel stars */}
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-2">
            Maximum Hotel Rating
          </label>
          <div className="flex gap-2">
            {[3, 4, 5].map(s => (
              <button
                key={s}
                onClick={() => setMaxHotelStars(s)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  maxHotelStars === s
                    ? 'border-utu-blue bg-blue-50 text-utu-blue'
                    : 'border-utu-border-default text-utu-text-secondary hover:bg-utu-bg-subtle'
                }`}
              >
                {'★'.repeat(s)}
              </button>
            ))}
          </div>
        </div>

        {/* Per diem */}
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1">
            Daily Per Diem Limit (SAR)
          </label>
          <p className="text-xs text-utu-text-muted mb-1.5">
            Hotel bookings above this daily rate will require approval.
          </p>
          <input
            type="number"
            value={perDiem}
            onChange={e => setPerDiem(e.target.value)}
            placeholder="e.g. 800"
            className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
          />
        </div>

        {/* Advance booking */}
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1">
            Minimum Advance Booking (days)
          </label>
          <p className="text-xs text-utu-text-muted mb-1.5">
            Bookings with less notice will be flagged in reporting.
          </p>
          <input
            type="number"
            value={advanceBooking}
            onChange={e => setAdvanceBooking(e.target.value)}
            placeholder="e.g. 14"
            min="0"
            className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
          />
        </div>

        {/* Preferred airlines */}
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1">
            Preferred Airlines (IATA codes)
          </label>
          <p className="text-xs text-utu-text-muted mb-1.5">
            Comma-separated IATA codes, e.g. SV, EK, QR, MS. Shown first in flight results.
          </p>
          <input
            value={airlines}
            onChange={e => setAirlines(e.target.value)}
            placeholder="SV, EK, QR, MS…"
            className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
          />
        </div>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <div className="flex items-center justify-between gap-3 pt-2">
          {saved ? (
            <p className="text-sm text-green-600 font-medium">Policy saved successfully.</p>
          ) : (
            <p className="text-xs text-utu-text-muted">Changes take effect on new bookings immediately.</p>
          )}
          <button
            disabled={saveMut.isPending}
            onClick={handleSave}
            className="rounded-xl bg-utu-navy hover:bg-utu-blue disabled:opacity-60 text-white font-semibold px-6 py-2.5 text-sm transition-colors"
          >
            {saveMut.isPending ? 'Saving…' : 'Save Policy'}
          </button>
        </div>
      </section>

      {/* ── VAT & Billing ── */}
      <section className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-utu-text-primary">VAT & Billing</h2>
          <p className="text-xs text-utu-text-muted">Appears on consolidated monthly invoices</p>
        </div>

        {/* VAT country */}
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1.5">Billing Country (VAT)</label>
          <div className="flex gap-2">
            {([
              { value: 'SA',    label: 'Saudi Arabia (15%)' },
              { value: 'AE',    label: 'UAE (5%)' },
              { value: 'OTHER', label: 'Other (0%)' },
            ] as { value: 'SA' | 'AE' | 'OTHER'; label: string }[]).map(o => (
              <button
                key={o.value}
                onClick={() => setVatCountry(o.value)}
                className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  vatCountry === o.value
                    ? 'border-utu-blue bg-blue-50 text-utu-blue'
                    : 'border-utu-border-default text-utu-text-secondary hover:bg-utu-bg-subtle'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* VAT number */}
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1">VAT Registration Number</label>
          <input
            value={vatNumber}
            onChange={e => setVatNumber(e.target.value)}
            placeholder="e.g. 300000000000003"
            className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue font-mono"
          />
        </div>

        {/* Billing address */}
        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1">Billing Address</label>
          <textarea
            rows={3}
            value={billingAddress}
            onChange={e => setBillingAddress(e.target.value)}
            placeholder="Street, City, Country…"
            className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue resize-none"
          />
        </div>

        {/* Billing contact */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">Billing Contact Name</label>
            <input
              value={billingContactName}
              onChange={e => setBillingContactName(e.target.value)}
              placeholder="Finance Manager"
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">Billing Contact Email</label>
            <input
              type="email"
              value={billingContactEmail}
              onChange={e => setBillingContactEmail(e.target.value)}
              placeholder="finance@company.com"
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>
        </div>

        <p className="text-xs text-utu-text-muted">
          These details appear on your monthly consolidated invoice. Changes take effect on the next invoice.
        </p>
      </section>

      {/* ── Change Password ── */}
      <section className="bg-utu-bg-card rounded-2xl border border-utu-border-default p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-utu-text-primary">Change Password</h2>
          <p className="text-xs text-utu-text-muted mt-1">
            If you were assigned a temporary password when your account was created, change it here.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-utu-text-muted mb-1">Current Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPwd}
            onChange={e => setCurrentPwd(e.target.value)}
            className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
            placeholder="Enter your current password"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-utu-text-muted mb-1">Confirm New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
              placeholder="Repeat new password"
            />
          </div>
        </div>

        <p className="text-xs text-utu-text-muted">
          Must be 8+ characters with at least one uppercase letter, one lowercase letter, and one number.
        </p>

        {pwdError && <p className="text-sm text-red-600">{pwdError}</p>}

        <div className="flex items-center justify-between gap-3 pt-1">
          {pwdSaved ? (
            <p className="text-sm text-green-600 font-medium">Password changed successfully.</p>
          ) : (
            <span />
          )}
          <button
            disabled={changePwdMut.isPending}
            onClick={handleChangePassword}
            className="rounded-xl bg-utu-navy hover:bg-utu-blue disabled:opacity-60 text-white font-semibold px-6 py-2.5 text-sm transition-colors"
          >
            {changePwdMut.isPending ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </section>

      {/* ── Support ── */}
      <section className="rounded-xl border border-utu-border-default bg-utu-bg-card px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-utu-text-primary">Need help?</p>
          <p className="text-xs text-utu-text-muted mt-0.5">
            Our business travel team is available 24/7 for enterprise accounts.
          </p>
        </div>
        <a
          href="/contact"
          className="rounded-xl border border-utu-border-default bg-white hover:bg-utu-bg-subtle text-utu-text-secondary font-medium px-4 py-2 text-sm transition-colors whitespace-nowrap"
        >
          Contact Support
        </a>
      </section>

    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-utu-text-muted">{label}</p>
      <p className="font-medium text-utu-text-primary mt-0.5">{children}</p>
    </div>
  );
}
