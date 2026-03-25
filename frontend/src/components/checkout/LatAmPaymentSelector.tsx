'use client';

/**
 * LatAmPaymentSelector
 *
 * MercadoPago Checkout Pro for Latin America:
 *   AR (ARS) — Argentina, CO (COP) — Colombia, CL (CLP) — Chile,
 *   UY (UYU) — Uruguay, MX (MXN) — Mexico, PE (PEN) — Peru
 *
 * Flow: POST /api/payments/mercadopago/initiate → { redirectUrl }
 *       → redirect to MercadoPago hosted checkout
 *       → MercadoPago redirects back to success/failure/pending URL
 *
 * MercadoPago handles all local payment methods per country:
 *   AR → PSP, Rapipago, Pago Fácil, cuotas sin interés
 *   CO → PSE, Efecty, Baloto
 *   CL → WebPay Plus, Khipu, Multicaja
 *   UY → Abitab, Redpagos, OCA
 *   MX → OXXO, SPEI
 *   PE → PagoEfectivo
 */

import { useState } from 'react';

type Phase = 'idle' | 'loading' | 'redirecting' | 'error';

interface Props {
  bookingId:     string;
  amount:        number;
  currency:      'ARS' | 'COP' | 'CLP' | 'UYU' | 'MXN' | 'PEN';
  countryCode:   'AR' | 'CO' | 'CL' | 'UY' | 'MX' | 'PE';
  customerEmail: string;
  onCancel:      () => void;
}

// Local method labels per country (shown to user)
const LOCAL_METHODS: Record<string, string[]> = {
  AR: ['Tarjeta de crédito/débito', 'Rapipago', 'Pago Fácil', 'PSP', 'Cuotas sin interés'],
  CO: ['Tarjeta de crédito/débito', 'PSE (débito bancario)', 'Efecty', 'Baloto'],
  CL: ['Tarjeta de crédito/débito', 'WebPay Plus', 'Khipu', 'Multicaja'],
  UY: ['Tarjeta de crédito/débito', 'Abitab', 'Redpagos', 'OCA'],
  MX: ['Tarjeta de crédito/débito', 'OXXO', 'SPEI (transferencia)'],
  PE: ['Tarjeta de crédito/débito', 'PagoEfectivo', 'Yape'],
};

const COUNTRY_NAMES: Record<string, string> = {
  AR: 'Argentina', CO: 'Colombia', CL: 'Chile',
  UY: 'Uruguay',  MX: 'México',  PE: 'Perú',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: '$', COP: '$', CLP: '$', UYU: '$U', MXN: '$', PEN: 'S/',
};

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-419', {
      style: 'currency', currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${CURRENCY_SYMBOLS[currency] ?? '$'} ${amount.toLocaleString('es-419')}`;
  }
}

export default function LatAmPaymentSelector({
  bookingId,
  amount,
  currency,
  countryCode,
  customerEmail,
  onCancel,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');

  const methods     = LOCAL_METHODS[countryCode] ?? [];
  const countryName = COUNTRY_NAMES[countryCode] ?? countryCode;

  async function handleStart() {
    setPhase('loading');
    setError('');
    try {
      const res  = await fetch('/api/payments/mercadopago/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          bookingId,
          amount,
          currency,
          customerEmail,
          description: 'UTUBooking — Paquete Hajj/Umrah',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Error al iniciar el pago');
        setPhase('error');
        return;
      }
      setPhase('redirecting');
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError((err as Error).message ?? 'Error de red');
      setPhase('error');
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">

      {/* Amount */}
      <div className="text-center bg-blue-50 rounded-2xl py-4 px-6 border border-blue-100">
        <p className="text-xs text-blue-700 mb-1">Total</p>
        <p className="text-2xl font-bold text-blue-900">{formatAmount(amount, currency)}</p>
        <p className="text-xs text-blue-500 mt-0.5">{currency} · {countryName}</p>
      </div>

      {phase === 'idle' && (
        <div className="space-y-3">
          {/* MercadoPago info */}
          <div className="rounded-xl px-4 py-4 border border-blue-100 bg-blue-50 space-y-3">
            <div className="flex items-center gap-2">
              {/* MercadoPago brand colors: blue #009EE3 */}
              <span className="font-black text-base" style={{ color: '#009EE3' }}>Mercado</span>
              <span className="font-black text-base text-yellow-500">Pago</span>
            </div>
            <p className="text-sm text-gray-700">
              Serás redirigido/a al checkout seguro de MercadoPago. Elige tu método de pago preferido.
            </p>
            {/* Local methods list */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Métodos disponibles en {countryName}:</p>
              <div className="flex flex-wrap gap-1">
                {methods.map((m) => (
                  <span key={m} className="text-xs bg-white border border-blue-100 text-gray-600 rounded-full px-2 py-0.5">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="w-full text-white rounded-xl py-3.5 text-sm font-bold min-h-[44px] transition-colors"
            style={{ backgroundColor: '#009EE3' }}
          >
            Pagar con MercadoPago
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
          <span className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">Conectando con MercadoPago…</span>
        </div>
      )}

      {phase === 'redirecting' && (
        <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
          <span className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">Redirigiendo al checkout…</span>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-2">
          <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          <button
            type="button"
            onClick={() => { setPhase('idle'); setError(''); }}
            className="w-full text-white rounded-xl py-3 text-sm font-bold min-h-[44px]"
            style={{ backgroundColor: '#009EE3' }}
          >
            Intentar de nuevo
          </button>
        </div>
      )}

      {phase !== 'redirecting' && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full border border-gray-300 text-gray-700 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 min-h-[44px]"
        >
          Cancelar
        </button>
      )}

      <p className="text-xs text-center text-gray-400">
        Pagos seguros procesados por MercadoPago · Cifrado SSL
      </p>
    </div>
  );
}
