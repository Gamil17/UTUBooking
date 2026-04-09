'use client';

/**
 * LGPDBanner — Lei Geral de Proteção de Dados (LGPD)
 * Brazil Privacy Law — Lei 13.709/2018
 *
 * Shown ONLY to Brazilian users (countryCode === 'BR').
 * Text in Brazilian Portuguese (pt-BR) — required by law.
 *
 * LGPD key requirements vs GDPR:
 *   - Consent must be free, informed, unambiguous — no pre-ticked boxes (Art. 8)
 *   - Legitimate interest basis available (Art. 7 IX) — analytics may qualify
 *   - Breach notification: ANPD + data subjects within 72 hours (Art. 48)
 *   - DPO (Encarregado) mandatory for large-scale processing (Art. 41)
 *   - ANPD (Autoridade Nacional de Proteção de Dados) is the regulator
 *
 * Cookie: `lgpd_consent` — base64-JSON, 365-day expiry (longer than GDPR — LGPD doesn't specify)
 * Logs to: POST /api/compliance/consent (existing route, law='LGPD')
 *
 * Pattern: follows GDPRConsentBanner.tsx structure exactly.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LGPDChoices {
  strictly_necessary: true;
  analytics:          boolean;
  marketing:          boolean;
  personalization:    boolean;
}

interface Props {
  countryCode?: string; // show only when 'BR'
}

const DEFAULT_CHOICES: LGPDChoices = {
  strictly_necessary: true,
  analytics:          false,
  marketing:          false,
  personalization:    false,
};

function loadSavedChoices(): LGPDChoices | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = document.cookie.split(';').find((c) => c.trim().startsWith('lgpd_consent='));
    if (!raw) return null;
    const val = raw.split('=')[1];
    return JSON.parse(atob(decodeURIComponent(val)));
  } catch {
    return null;
  }
}

function saveCookie(choices: LGPDChoices) {
  const val = encodeURIComponent(btoa(JSON.stringify(choices)));
  const exp = new Date(Date.now() + 365 * 86_400_000).toUTCString();
  document.cookie = `lgpd_consent=${val}; path=/; expires=${exp}; SameSite=Lax`;
}

async function logConsent(choices: LGPDChoices) {
  try {
    await fetch('/api/compliance/consent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ law: 'LGPD', choices }),
    });
  } catch { /* non-fatal */ }
}

export default function LGPDBanner({ countryCode }: Props) {
  const [visible,  setVisible]  = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [choices,  setChoices]  = useState<LGPDChoices>(DEFAULT_CHOICES);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (countryCode !== 'BR') return;
    const saved = loadSavedChoices();
    if (!saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads cookie (SSR-unavailable), must run after hydration to avoid mismatch
      setVisible(true);
    }
  }, [countryCode]);

  if (!visible) return null;

  async function handleAcceptAll() {
    const all: LGPDChoices = { strictly_necessary: true, analytics: true, marketing: true, personalization: true };
    saveCookie(all);
    await logConsent(all);
    setVisible(false);
  }

  async function handleSaveChoices() {
    saveCookie(choices);
    await logConsent(choices);
    setVisible(false);
  }

  async function handleDeclineAll() {
    saveCookie(DEFAULT_CHOICES);
    await logConsent(DEFAULT_CHOICES);
    setDeclined(true);
    setVisible(false);
  }

  function toggle(key: keyof Omit<LGPDChoices, 'strictly_necessary'>) {
    setChoices((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (declined) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-utu-bg-card border-t border-utu-border-default px-4 py-3 flex items-center justify-between gap-4">
        <p className="text-xs text-utu-text-muted">Apenas cookies essenciais estão ativos.</p>
        <button
          type="button"
          onClick={() => { setDeclined(false); setVisible(true); }}
          className="text-xs text-green-700 underline whitespace-nowrap"
        >
          Alterar preferências
        </button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aviso de Privacidade — LGPD"
      className="fixed bottom-0 left-0 right-0 z-50 bg-utu-bg-card border-t border-utu-border-default shadow-lg max-h-[90vh] overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-utu-text-primary">Suas preferências de privacidade</h2>
            <p className="text-xs text-utu-text-muted mt-0.5">
              Lei Geral de Proteção de Dados — Lei 13.709/2018 (LGPD)
            </p>
          </div>
          {/* Brazilian flag colors hint */}
          <div className="flex gap-0.5 flex-shrink-0 mt-1">
            <div className="w-2 h-4 rounded-sm bg-green-600" />
            <div className="w-2 h-4 rounded-sm bg-yellow-400" />
            <div className="w-2 h-4 rounded-sm bg-blue-700" />
          </div>
        </div>

        <p className="text-xs text-utu-text-secondary">
          Utilizamos cookies e dados para melhorar sua experiência, analisar o uso do site e personalizar conteúdo. Você pode escolher quais categorias aceitar. Cookies estritamente necessários não podem ser desativados — são essenciais para o funcionamento do site.
        </p>

        {/* Expanded categories */}
        {expanded && (
          <div className="space-y-3 border-t border-utu-border-default pt-3">

            {/* Strictly necessary — always on */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-utu-text-primary">Estritamente necessários</p>
                <p className="text-xs text-utu-text-muted">Autenticação, carrinho, segurança. Não podem ser desativados.</p>
              </div>
              <div className="w-10 h-5 bg-green-500 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-end pr-0.5">
                <div className="w-4 h-4 bg-utu-bg-card rounded-full" />
              </div>
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-utu-text-primary">Análise e desempenho</p>
                <p className="text-xs text-utu-text-muted">Entender como você usa o site; nenhum dado é vendido a terceiros.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={choices.analytics}
                onClick={() => toggle('analytics')}
                className={['w-10 h-5 rounded-full flex-shrink-0 mt-0.5 transition-colors flex items-center',
                  choices.analytics ? 'bg-green-500 justify-end pr-0.5' : 'bg-utu-border-strong justify-start pl-0.5'].join(' ')}
              >
                <div className="w-4 h-4 bg-utu-bg-card rounded-full" />
                <span className="sr-only">{choices.analytics ? 'Ativado' : 'Desativado'}</span>
              </button>
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-utu-text-primary">Marketing e publicidade</p>
                <p className="text-xs text-utu-text-muted">Anúncios personalizados de Hajj/Umrah. Requer consentimento explícito (Art. 7 LGPD).</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={choices.marketing}
                onClick={() => toggle('marketing')}
                className={['w-10 h-5 rounded-full flex-shrink-0 mt-0.5 transition-colors flex items-center',
                  choices.marketing ? 'bg-green-500 justify-end pr-0.5' : 'bg-utu-border-strong justify-start pl-0.5'].join(' ')}
              >
                <div className="w-4 h-4 bg-utu-bg-card rounded-full" />
                <span className="sr-only">{choices.marketing ? 'Ativado' : 'Desativado'}</span>
              </button>
            </div>

            {/* Personalization */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-utu-text-primary">Personalização</p>
                <p className="text-xs text-utu-text-muted">Recomendações de hotéis e preços baseados no seu histórico de buscas.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={choices.personalization}
                onClick={() => toggle('personalization')}
                className={['w-10 h-5 rounded-full flex-shrink-0 mt-0.5 transition-colors flex items-center',
                  choices.personalization ? 'bg-green-500 justify-end pr-0.5' : 'bg-utu-border-strong justify-start pl-0.5'].join(' ')}
              >
                <div className="w-4 h-4 bg-utu-bg-card rounded-full" />
                <span className="sr-only">{choices.personalization ? 'Ativado' : 'Desativado'}</span>
              </button>
            </div>
          </div>
        )}

        {/* LGPD rights note */}
        <p className="text-xs text-utu-text-muted">
          Seus direitos: acesso, correção, exclusão e portabilidade dos dados (LGPD Art. 18).{' '}
          <Link href="/privacy" className="text-green-700 underline">Política de privacidade</Link> ·{' '}
          <a href="https://www.anpd.gov.br" target="_blank" rel="noopener noreferrer" className="text-green-700 underline">ANPD</a>
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-xs font-semibold min-h-[44px] transition-colors"
          >
            Aceitar todos
          </button>

          {expanded ? (
            <button
              type="button"
              onClick={handleSaveChoices}
              className="flex-1 min-w-[120px] border border-green-600 text-green-700 rounded-xl py-2.5 text-xs font-semibold min-h-[44px] hover:bg-green-50"
            >
              Salvar preferências
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex-1 min-w-[120px] border border-utu-border-strong text-utu-text-secondary rounded-xl py-2.5 text-xs font-semibold min-h-[44px] hover:bg-utu-bg-muted"
            >
              Gerenciar preferências
            </button>
          )}

          <button
            type="button"
            onClick={handleDeclineAll}
            className="flex-1 min-w-[120px] text-utu-text-muted rounded-xl py-2.5 text-xs hover:bg-utu-bg-muted min-h-[44px]"
          >
            Apenas essenciais
          </button>
        </div>
      </div>
    </div>
  );
}
