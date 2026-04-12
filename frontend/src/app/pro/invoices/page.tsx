'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getInvoiceMonths, getMonthlyInvoice,
  type InvoiceMonth, type MonthlyInvoice, type InvoiceLineItem,
} from '@/lib/portal-api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sarFmt(n: number) {
  return `SAR ${Math.round(n).toLocaleString()}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

const TYPE_ICON: Record<string, string> = {
  flight: '✈', hotel: '🏨', car: '🚗', package: '📦',
};

// ── CSV export (SAP/Oracle ERP format) ────────────────────────────────────────

function exportErpCsv(inv: MonthlyInvoice) {
  const HEADERS = [
    'Invoice Number','Period','Issue Date','Due Date',
    'Company','VAT Number','Country',
    'Employee','Department','Booking Type','Description',
    'Depart Date','Return Date','PO Reference','Cost Center',
    'Booking Ref','Amount (SAR)',
    'VAT Rate (%)','VAT Amount (SAR)','Total (SAR)',
  ];

  const vatPerLine = inv.vat_rate_pct / 100;

  const lines = inv.line_items.map(item => {
    const vat   = Math.round(item.amount_sar * vatPerLine);
    const total = item.amount_sar + vat;
    return [
      inv.invoice_number,
      inv.period,
      inv.issue_date,
      inv.due_date,
      inv.account.company_name,
      inv.account.vat_number ?? '',
      inv.account.vat_country,
      item.employee_name,
      item.employee_dept ?? '',
      item.booking_type,
      item.description,
      item.depart_date,
      item.return_date ?? '',
      item.po_reference ?? '',
      item.cost_center ?? '',
      item.booking_ref ?? '',
      item.amount_sar,
      inv.vat_rate_pct,
      vat,
      total,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv  = [HEADERS.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${inv.invoice_number}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Invoice print styles (injected into head, print-only) ────────────────────

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden; }
  #invoice-print, #invoice-print * { visibility: visible; }
  #invoice-print { position: absolute; top: 0; left: 0; width: 100%; }
  .no-print { display: none !important; }
}
`;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProInvoicesPage() {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const { data: monthsData, isLoading: monthsLoading } = useQuery({
    queryKey: ['portal-invoice-months'],
    queryFn:  getInvoiceMonths,
    staleTime: 300_000,
  });
  const months: InvoiceMonth[] = (monthsData as any)?.data ?? [];

  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ['portal-invoice', selectedMonth],
    queryFn:  () => getMonthlyInvoice(selectedMonth!),
    enabled:  !!selectedMonth,
    staleTime: 300_000,
  });
  const invoice: MonthlyInvoice | null = (invData as any)?.data ?? null;

  function handlePrint() {
    const style = document.createElement('style');
    style.textContent = PRINT_STYLES;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.head.removeChild(style), 500);
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-utu-text-primary">Invoices</h1>
        <p className="text-sm text-utu-text-muted mt-1">
          Monthly consolidated invoices with VAT for your travel programme.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Month list ── */}
        <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default overflow-hidden">
          <div className="px-4 py-3 border-b border-utu-border-default">
            <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider">Billing Periods</p>
          </div>

          {monthsLoading && (
            <div className="py-10 text-center text-sm text-utu-text-muted">Loading…</div>
          )}

          {!monthsLoading && months.length === 0 && (
            <div className="py-10 text-center px-4">
              <p className="text-sm font-medium text-utu-text-primary">No invoices yet</p>
              <p className="text-xs text-utu-text-muted mt-1">Invoices appear once bookings are placed.</p>
            </div>
          )}

          {months.map(m => (
            <button
              key={m.month}
              onClick={() => setSelectedMonth(m.month)}
              className={`w-full flex items-center justify-between px-4 py-3 border-b border-utu-border-default last:border-0 text-start transition-colors ${
                selectedMonth === m.month
                  ? 'bg-blue-50 border-s-2 border-s-utu-blue'
                  : 'hover:bg-utu-bg-subtle'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-utu-text-primary">{monthLabel(m.month)}</p>
                <p className="text-xs text-utu-text-muted mt-0.5">{m.booking_count} booking{m.booking_count !== 1 ? 's' : ''}</p>
              </div>
              <p className="text-sm font-semibold text-utu-text-primary">{sarFmt(m.subtotal_sar)}</p>
            </button>
          ))}
        </div>

        {/* ── Invoice detail ── */}
        <div className="lg:col-span-2">
          {!selectedMonth && (
            <div className="rounded-2xl border border-utu-border-default bg-utu-bg-card p-12 text-center">
              <p className="text-sm font-medium text-utu-text-primary">Select a billing period</p>
              <p className="text-xs text-utu-text-muted mt-1">Choose a month from the list to view its invoice.</p>
            </div>
          )}

          {selectedMonth && invLoading && (
            <div className="rounded-2xl border border-utu-border-default bg-utu-bg-card p-12 text-center">
              <p className="text-sm text-utu-text-muted">Generating invoice…</p>
            </div>
          )}

          {selectedMonth && !invLoading && invoice && (
            <div className="space-y-4">

              {/* Action bar */}
              <div className="no-print flex gap-3 justify-end flex-wrap">
                <button
                  onClick={() => exportErpCsv(invoice)}
                  className="rounded-xl border border-utu-border-default bg-utu-bg-card hover:bg-utu-bg-subtle text-utu-text-secondary font-medium px-4 py-2 text-sm transition-colors"
                >
                  Export CSV (ERP)
                </button>
                <button
                  onClick={handlePrint}
                  className="rounded-xl bg-utu-navy hover:bg-utu-blue text-white font-semibold px-4 py-2 text-sm transition-colors"
                >
                  Print / Save as PDF
                </button>
              </div>

              {/* Invoice document */}
              <div id="invoice-print" className="bg-white rounded-2xl border border-utu-border-default shadow-sm overflow-hidden">

                {/* Invoice header */}
                <div className="bg-utu-navy px-8 py-6 text-white">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-black text-xl tracking-tight">UTUBooking</p>
                      <p className="text-white/60 text-xs mt-0.5">for Business</p>
                    </div>
                    <div className="text-end">
                      <p className="text-xs text-white/60 uppercase tracking-wider">Tax Invoice</p>
                      <p className="text-lg font-bold mt-0.5">{invoice.invoice_number}</p>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-6 space-y-6">

                  {/* Billing parties */}
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider mb-2">Billed To</p>
                      <p className="font-semibold text-utu-text-primary">{invoice.account.company_name}</p>
                      {invoice.account.vat_number && (
                        <p className="text-sm text-utu-text-secondary mt-0.5">
                          VAT No. {invoice.account.vat_number}
                        </p>
                      )}
                      {invoice.account.billing_address && (
                        <p className="text-sm text-utu-text-secondary mt-0.5 whitespace-pre-line">
                          {invoice.account.billing_address}
                        </p>
                      )}
                      {invoice.account.billing_contact_name && (
                        <p className="text-sm text-utu-text-secondary mt-1">
                          Attn: {invoice.account.billing_contact_name}
                        </p>
                      )}
                    </div>
                    <div className="text-end">
                      <p className="text-xs font-semibold text-utu-text-muted uppercase tracking-wider mb-2">Invoice Details</p>
                      <div className="space-y-1 text-sm text-utu-text-secondary">
                        <p><span className="font-medium text-utu-text-primary">Period:</span> {invoice.period}</p>
                        <p><span className="font-medium text-utu-text-primary">Issue Date:</span> {fmtDate(invoice.issue_date)}</p>
                        <p><span className="font-medium text-utu-text-primary">Due Date:</span> {fmtDate(invoice.due_date)}</p>
                        <p><span className="font-medium text-utu-text-primary">VAT Rate:</span> {invoice.vat_rate_pct}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Line items table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-utu-bg-subtle">
                          <th className="text-start px-3 py-2 text-xs font-semibold text-utu-text-muted uppercase tracking-wider rounded-tl-lg">Employee</th>
                          <th className="text-start px-3 py-2 text-xs font-semibold text-utu-text-muted uppercase tracking-wider">Description</th>
                          <th className="text-start px-3 py-2 text-xs font-semibold text-utu-text-muted uppercase tracking-wider">Date</th>
                          <th className="text-start px-3 py-2 text-xs font-semibold text-utu-text-muted uppercase tracking-wider">PO / CC</th>
                          <th className="text-end px-3 py-2 text-xs font-semibold text-utu-text-muted uppercase tracking-wider rounded-tr-lg">Amount (SAR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.line_items.map((item, idx) => (
                          <LineRow key={item.id} item={item} shade={idx % 2 === 1} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <TotalRow label="Subtotal" value={sarFmt(invoice.subtotal_sar)} />
                      <TotalRow
                        label={`VAT (${invoice.vat_rate_pct}%)`}
                        value={sarFmt(invoice.vat_amount_sar)}
                      />
                      <div className="border-t border-utu-border-default pt-2">
                        <TotalRow label="Total Due" value={sarFmt(invoice.total_sar)} bold />
                      </div>
                    </div>
                  </div>

                  {/* Footer note */}
                  <div className="border-t border-utu-border-default pt-4 text-xs text-utu-text-muted space-y-1">
                    <p>All amounts are in Saudi Riyal (SAR). VAT applied at {invoice.vat_rate_pct}% per KSA VAT regulations.</p>
                    <p>AMEC Solutions — UTUBooking.com | business@utubooking.com | utubooking.com/business</p>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LineRow({ item, shade }: { item: InvoiceLineItem; shade: boolean }) {
  return (
    <tr className={shade ? 'bg-utu-bg-subtle/50' : ''}>
      <td className="px-3 py-2.5 align-top">
        <p className="font-medium text-utu-text-primary text-xs">{item.employee_name}</p>
        {item.employee_dept && (
          <p className="text-utu-text-muted text-[10px]">{item.employee_dept}</p>
        )}
      </td>
      <td className="px-3 py-2.5 align-top">
        <div className="flex items-start gap-1.5">
          <span className="text-sm shrink-0" aria-hidden="true">{TYPE_ICON[item.booking_type] ?? '•'}</span>
          <div>
            <p className="text-utu-text-secondary text-xs leading-relaxed">{item.description}</p>
            {item.return_date && (
              <p className="text-utu-text-muted text-[10px]">Return: {item.return_date}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 align-top text-xs text-utu-text-secondary whitespace-nowrap">
        {item.depart_date}
      </td>
      <td className="px-3 py-2.5 align-top">
        {item.po_reference && (
          <p className="text-xs text-utu-text-secondary font-mono">{item.po_reference}</p>
        )}
        {item.cost_center && (
          <p className="text-[10px] text-utu-text-muted">{item.cost_center}</p>
        )}
      </td>
      <td className="px-3 py-2.5 align-top text-end font-semibold text-utu-text-primary text-sm">
        {item.amount_sar.toLocaleString()}
      </td>
    </tr>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-bold text-utu-text-primary' : 'text-utu-text-secondary'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
