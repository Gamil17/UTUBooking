'use client';

/**
 * BrazilPaymentSelector
 *
 * Three payment methods for Brazilian users (Phase 12):
 *   1. Pix (primary)   — instant QR code; user scans with any Brazilian bank app
 *   2. Boleto          — bank slip; 3-day expiry; for unbanked users (~15%)
 *   3. Card (Stripe)   — Visa/Mastercard/Elo/Hipercard fallback
 *
 * Pix flow: POST /api/payments/pix/initiate → show QR code → poll /status every 3s
 * Boleto flow: POST /api/payments/boleto/initiate → show boleto URL + countdown
 *
 * All strings in Brazilian Portuguese (pt-BR).
 * Colors: Pix green #32BCAD (Banco Central do Brasil Pix brand color)
 */

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

type Method = 'pix' | 'boleto' | 'card';
type Phase  = 'idle' | 'loading' | 'qr_shown' | 'pending_boleto' | 'success' | 'error';

interface Props {
  bookingId:     string;
  amountBRL:     number;
  customerEmail: string;
  customerName:  string;
  onSuccess:     (paymentId: string) => void;
  onCancel:      () => void;
}

const PIX_COLOR = '#32BCAD';

function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(amount);
}

function secondsLeft(expiresAt: string): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function BrazilPaymentSelector({
  bookingId,
  amountBRL,
  customerEmail,
  customerName,
  onSuccess,
  onCancel,
}: Props) {
  const [method,  setMethod]  = useState<Method>('pix');
  const [phase,   setPhase]   = useState<Phase>('idle');
  const [error,   setError]   = useState('');

  // Pix state
  const [qrImageUrl,   setQrImageUrl]   = useState('');
  const [pixCopyCola,  setPixCopiaCola] = useState('');
  const [pixPaymentId, setPixPaymentId] = useState('');
  const [stripeIntent, setStripeIntent] = useState('');
  const [expiresAt,    setExpiresAt]    = useState('');
  const [countdown,    setCountdown]    = useState(0);
  const [copied,       setCopied]       = useState(false);

  // Boleto state
  const [boletoUrl,    setBoletoUrl]    = useState('');
  const [boletoExp,    setBoletoExp]    = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer for Pix QR
  useEffect(() => {
    if (!expiresAt || phase !== 'qr_shown') return;
    const interval = setInterval(() => {
      const secs = secondsLeft(expiresAt);
      setCountdown(secs);
      if (secs <= 0) clearInterval(interval);
    }, 1000);
    setCountdown(secondsLeft(expiresAt));
    return () => clearInterval(interval);
  }, [expiresAt, phase]);

  // Poll Pix payment status every 3 seconds
  useEffect(() => {
    if (phase !== 'qr_shown' || !stripeIntent) return;

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/payments/pix/status/${stripeIntent}`);
        const data = await res.json();
        if (data.status === 'completed') {
          clearInterval(pollRef.current!);
          setPhase('success');
          onSuccess(pixPaymentId);
        } else if (data.status === 'failed' || data.status === 'expired') {
          clearInterval(pollRef.current!);
          setError('Pagamento Pix expirado ou falhou. Tente novamente.');
          setPhase('error');
        }
      } catch { /* keep polling */ }
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stripeIntent]);

  async function handlePixStart() {
    setPhase('loading');
    setError('');
    try {
      const res  = await fetch('/api/payments/pix/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bookingId, amountBRL, customerEmail, customerName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? data.error ?? 'Erro ao iniciar Pix'); setPhase('error'); return; }

      setQrImageUrl(data.qrCodeImageUrl);
      setPixCopiaCola(data.pixCopiaCola);
      setPixPaymentId(data.paymentId);
      setStripeIntent(data.stripeIntentId);
      setExpiresAt(data.expiresAt);
      setPhase('qr_shown');
    } catch (err) {
      setError((err as Error).message ?? 'Erro de rede');
      setPhase('error');
    }
  }

  async function handleBoletoStart() {
    setPhase('loading');
    setError('');
    // For demo: CPF collected separately. In production: add CPF field to form.
    try {
      const res  = await fetch('/api/payments/boleto/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bookingId, amountBRL, customerEmail, customerName, cpfOrCnpj: '00000000000' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? data.error ?? 'Erro ao gerar boleto'); setPhase('error'); return; }
      setBoletoUrl(data.boletoUrl);
      setBoletoExp(data.expiresAt);
      setPhase('pending_boleto');
    } catch (err) {
      setError((err as Error).message ?? 'Erro de rede');
      setPhase('error');
    }
  }

  function handleCopyPix() {
    navigator.clipboard.writeText(pixCopyCola).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function switchMethod(m: Method) {
    if (pollRef.current) clearInterval(pollRef.current);
    setMethod(m);
    setPhase('idle');
    setError('');
    if (m === 'card') {
      window.dispatchEvent(new CustomEvent('utu:switch-to-stripe', {
        detail: { bookingId, amount: amountBRL, currency: 'BRL', countryCode: 'BR' },
      }));
    }
  }

  const tabCls = (active: boolean) =>
    ['flex-1 py-2.5 text-xs font-semibold rounded-xl transition-colors min-h-[44px]',
     active ? 'text-white shadow-sm' : 'text-utu-text-secondary hover:bg-utu-bg-muted'].join(' ');

  return (
    <div className="w-full max-w-md mx-auto space-y-4">

      {/* Amount */}
      <div className="text-center rounded-2xl py-4 px-6 border" style={{ background: '#f0fdfb', borderColor: '#b2f0ea' }}>
        <p className="text-xs mb-1" style={{ color: '#0e8f86' }}>Total a pagar</p>
        <p className="text-2xl font-bold" style={{ color: '#065e58' }}>{formatBRL(amountBRL)}</p>
        <p className="text-xs mt-0.5" style={{ color: '#32BCAD' }}>BRL</p>
      </div>

      {/* Method tabs */}
      <div className="bg-utu-bg-muted rounded-2xl p-1 flex gap-1">
        {(['pix', 'boleto', 'card'] as Method[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMethod(m)}
            aria-pressed={method === m}
            style={method === m ? { backgroundColor: PIX_COLOR } : undefined}
            className={tabCls(method === m)}
          >
            {m === 'pix' ? 'Pix' : m === 'boleto' ? 'Boleto' : 'Cartão'}
          </button>
        ))}
      </div>

      {/* ── PIX ─────────────────────────────────────────────────────────── */}
      {method === 'pix' && phase === 'idle' && (
        <div className="space-y-3">
          <div className="rounded-xl px-4 py-4 border space-y-2" style={{ background: '#f0fdfb', borderColor: '#b2f0ea' }}>
            <div className="flex items-center gap-2">
              <span className="font-black text-base tracking-tight" style={{ color: PIX_COLOR }}>Pix</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Instantâneo</span>
            </div>
            <p className="text-sm font-semibold text-utu-text-primary">Pague com Pix — qualquer banco</p>
            <p className="text-xs text-utu-text-secondary">Escaneie o QR code com o app do seu banco. O pagamento é confirmado em segundos.</p>
          </div>
          <button
            type="button"
            onClick={handlePixStart}
            className="w-full text-white rounded-xl py-3.5 text-sm font-bold min-h-[44px] transition-colors"
            style={{ backgroundColor: PIX_COLOR }}
          >
            Gerar QR Code Pix
          </button>
        </div>
      )}

      {method === 'pix' && phase === 'loading' && (
        <div className="flex items-center justify-center py-8 gap-3 text-utu-text-muted">
          <span className="w-5 h-5 border-2 border-t-[#32BCAD] rounded-full animate-spin" style={{ borderColor: '#b2f0ea', borderTopColor: PIX_COLOR }} />
          <span className="text-sm">Gerando código Pix…</span>
        </div>
      )}

      {method === 'pix' && phase === 'qr_shown' && (
        <div className="space-y-3">
          {/* QR code */}
          <div className="flex flex-col items-center gap-3 bg-utu-bg-card rounded-2xl border p-4" style={{ borderColor: '#b2f0ea' }}>
            {qrImageUrl && (
              <Image src={qrImageUrl} alt="QR Code Pix" width={200} height={200} className="rounded-lg" unoptimized />
            )}
            <div className="text-center">
              <p className="text-xs text-utu-text-muted">Expira em</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: countdown < 60 ? '#ef4444' : PIX_COLOR }}>
                {formatCountdown(countdown)}
              </p>
            </div>
          </div>
          {/* Pix Copia e Cola */}
          <div className="space-y-1">
            <p className="text-xs text-utu-text-muted font-medium">Pix Copia e Cola</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={pixCopyCola}
                className="flex-1 text-xs bg-utu-bg-muted border border-utu-border-default rounded-lg px-3 py-2 font-mono truncate"
                aria-label="Código Pix Copia e Cola"
              />
              <button
                type="button"
                onClick={handleCopyPix}
                className="px-3 py-2 text-xs font-semibold text-white rounded-lg min-h-[44px] transition-colors"
                style={{ backgroundColor: PIX_COLOR }}
              >
                {copied ? '✓' : 'Copiar'}
              </button>
            </div>
          </div>
          <p className="text-xs text-center text-utu-text-muted">Aguardando confirmação do pagamento…</p>
        </div>
      )}

      {/* ── BOLETO ──────────────────────────────────────────────────────── */}
      {method === 'boleto' && phase === 'idle' && (
        <div className="space-y-3">
          <div className="rounded-xl px-4 py-4 border border-utu-border-default bg-utu-bg-muted space-y-2">
            <p className="text-sm font-semibold text-utu-text-primary">Boleto Bancário</p>
            <p className="text-xs text-utu-text-secondary">Pague em qualquer banco, lotérica ou app bancário. Vence em 3 dias úteis.</p>
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">⚠ A reserva será confirmada após a compensação do boleto (1–2 dias úteis).</p>
          </div>
          <button
            type="button"
            onClick={handleBoletoStart}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded-xl py-3.5 text-sm font-bold min-h-[44px]"
          >
            Gerar Boleto
          </button>
        </div>
      )}

      {method === 'boleto' && phase === 'loading' && (
        <div className="flex items-center justify-center py-8 gap-3 text-utu-text-muted">
          <span className="w-5 h-5 border-2 border-utu-border-default border-t-gray-600 rounded-full animate-spin" />
          <span className="text-sm">Gerando boleto…</span>
        </div>
      )}

      {method === 'boleto' && phase === 'pending_boleto' && (
        <div className="space-y-3 text-center">
          <div className="bg-green-50 rounded-xl px-4 py-4 border border-green-100">
            <p className="text-sm font-semibold text-utu-text-primary mb-2">Boleto gerado com sucesso</p>
            <p className="text-xs text-utu-text-secondary mb-3">
              Vencimento: <strong>{boletoExp ? new Date(boletoExp).toLocaleDateString('pt-BR') : '3 dias'}</strong>
            </p>
            <a
              href={boletoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gray-800 text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-gray-900 transition-colors"
            >
              Abrir / Imprimir Boleto (PDF)
            </a>
          </div>
          <p className="text-xs text-utu-text-muted">Sua reserva será confirmada após a compensação bancária (1–2 dias úteis).</p>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          <button
            type="button"
            onClick={() => { setPhase('idle'); setError(''); }}
            className="w-full text-white rounded-xl py-3 text-sm font-bold min-h-[44px]"
            style={{ backgroundColor: PIX_COLOR }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Card method */}
      {method === 'card' && (
        <div className="bg-utu-bg-muted rounded-2xl px-4 py-5 text-sm text-utu-text-muted text-center border border-utu-border-default">
          <p className="font-medium text-utu-text-secondary mb-1">Cartão de crédito / débito</p>
          <p className="text-xs">Visa, Mastercard, Elo, Hipercard. Seguro via Stripe.</p>
        </div>
      )}

      {/* Cancel */}
      {phase !== 'qr_shown' && phase !== 'pending_boleto' && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full border border-utu-border-strong text-utu-text-secondary rounded-xl py-3 text-sm font-medium hover:bg-utu-bg-muted min-h-[44px]"
        >
          Cancelar
        </button>
      )}

      <p className="text-xs text-center text-utu-text-muted">
        {method === 'pix' ? 'Pix é regulamentado pelo Banco Central do Brasil.' : method === 'boleto' ? 'Boleto Bancário — sistema bancário brasileiro.' : 'Pagamentos seguros via Stripe.'}
      </p>
    </div>
  );
}
