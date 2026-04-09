'use client';

/**
 * WhatsAppOptIn — Brazil
 *
 * EXCEPTION: bg-[#25D366] and hover:bg-[#128C7E] are WhatsApp's official brand colors.
 * Per WhatsApp brand guidelines these must not be replaced with design system tokens.
 * Reference: https://developers.facebook.com/docs/whatsapp/brand
 * Allows Brazilian users to subscribe to WhatsApp marketing messages
 * (Ramadan greetings, Umrah price alerts, booking confirmations).
 *
 * LGPD compliance:
 *  - Explicit opt-in checkbox required before subscribe (Art. 7 LGPD)
 *  - One-tap unsubscribe available at any time
 *  - "Reply PARAR to stop" instruction shown (in-channel opt-out)
 *
 * Only rendered for pt-BR locale / BR country code.
 * Dismissed state stored in localStorage (not a cookie — no consent needed).
 */

import { useState, useEffect } from 'react';

interface Props {
  /** Show only for BR users — parent should guard this */
  countryCode?: string;
  /** JWT token for authenticated subscription requests */
  authToken?: string;
}

type State = 'idle' | 'loading' | 'subscribed' | 'error';

export default function WhatsAppOptIn({ countryCode, authToken }: Props) {
  const [dismissed,    setDismissed]    = useState(true);  // start hidden, check localStorage
  const [phone,        setPhone]        = useState('');
  const [lgpdConsent,  setLgpdConsent]  = useState(false);
  const [state,        setState]        = useState<State>('idle');
  const [errorMsg,     setErrorMsg]     = useState('');

  // Only show for Brazil
  useEffect(() => {
    if (countryCode !== 'BR') return;
    const d = localStorage.getItem('wa_optin_dismissed');
    if (!d) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage (SSR-unavailable), must run after hydration
      setDismissed(false);
    }
  }, [countryCode]);

  if (countryCode !== 'BR' || dismissed) return null;

  function _dismiss() {
    localStorage.setItem('wa_optin_dismissed', '1');
    setDismissed(true);
  }

  async function _subscribe() {
    if (!phone.trim()) {
      setErrorMsg('Informe seu número de WhatsApp.');
      return;
    }
    if (!lgpdConsent) {
      setErrorMsg('Você precisa aceitar os termos para continuar.');
      return;
    }

    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/whatsapp/subscribe', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ phone: phone.trim(), lgpdConsent }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Ocorreu um erro. Tente novamente.');
        setState('error');
        return;
      }

      setState('subscribed');
      localStorage.setItem('wa_optin_dismissed', '1');
    } catch {
      setErrorMsg('Serviço indisponível. Tente novamente.');
      setState('error');
    }
  }

  if (state === 'subscribed') {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-[#25D366] text-white rounded-2xl p-4 shadow-xl z-50"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">✅</span>
          <div>
            <p className="font-semibold text-sm">Inscrição confirmada!</p>
            <p className="text-xs mt-1 opacity-90">
              Você receberá ofertas de Umrah pelo WhatsApp.
              Para cancelar, responda <strong>PARAR</strong> a qualquer mensagem.
            </p>
          </div>
          <button
            onClick={_dismiss}
            className="ml-auto text-white/70 hover:text-white text-lg leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-utu-bg-card border border-utu-border-default rounded-2xl shadow-xl z-50"
      role="dialog"
      aria-labelledby="wa-optin-title"
    >
      {/* Header */}
      <div className="flex items-center gap-2 bg-[#25D366] text-white rounded-t-2xl px-4 py-3">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
        </svg>
        <span id="wa-optin-title" className="font-semibold text-sm">Receba ofertas de Umrah</span>
        <button
          onClick={_dismiss}
          className="ml-auto text-white/70 hover:text-white text-xl leading-none"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <p className="text-xs text-utu-text-secondary">
          Receba no WhatsApp: preços especiais para hotéis perto do Haram,
          alertas da temporada de Umrah e saudações de Ramadan. 🕌
        </p>

        {/* Phone input */}
        <div>
          <label htmlFor="wa-phone" className="block text-xs font-medium text-utu-text-secondary mb-1">
            Número de WhatsApp
          </label>
          <div className="flex gap-2">
            <span className="inline-flex items-center px-2.5 rounded-l-lg border border-r-0 border-utu-border-strong bg-utu-bg-muted text-utu-text-muted text-xs">
              🇧🇷 +55
            </span>
            <input
              id="wa-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 99999-8888"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 rounded-r-lg border border-utu-border-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] min-h-[44px]"
              aria-required="true"
            />
          </div>
        </div>

        {/* LGPD consent checkbox */}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={lgpdConsent}
            onChange={(e) => setLgpdConsent(e.target.checked)}
            className="mt-0.5 accent-[#25D366]"
            aria-required="true"
          />
          <span className="text-xs text-utu-text-muted leading-relaxed">
            Concordo em receber mensagens de marketing pelo WhatsApp.
            Posso cancelar a qualquer momento respondendo{' '}
            <strong>PARAR</strong>. (LGPD Art. 7)
          </span>
        </label>

        {/* Error */}
        {errorMsg && (
          <p className="text-xs text-red-600" role="alert">{errorMsg}</p>
        )}

        {/* Subscribe button */}
        <button
          onClick={_subscribe}
          disabled={state === 'loading'}
          className="w-full bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-60 text-white font-semibold text-sm rounded-xl py-2.5 min-h-[44px] transition-colors"
          aria-busy={state === 'loading'}
        >
          {state === 'loading' ? 'Inscrevendo…' : 'Quero receber ofertas'}
        </button>

        <p className="text-[10px] text-utu-text-muted text-center">
          Apenas para usuários no Brasil. Dados protegidos pela LGPD.
        </p>
      </div>
    </div>
  );
}
