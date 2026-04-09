'use client';

/**
 * PIPEDAPrivacyNotice
 *
 * Privacy notice shown to Canadian users at the point of data collection.
 * Required by PIPEDA (s.4.8 — transparency principle) and Quebec Law 25.
 *
 * Quebec Law 25: Notice MUST be in French for QC users (Bill 96 / Law 25 s.8).
 * PIPEDA: Notice must be clear, understandable, and accessible.
 *
 * Triggered on: signup, checkout entry (first time), and profile update.
 * Stores acknowledgement in localStorage (non-consent-log purposes)
 * and POSTs to /api/compliance/consent for the PIPEDA consent log.
 *
 * Props:
 *   locale       — 'en' or 'fr' (Quebec users get 'fr' via middleware)
 *   isQuebec     — adds Quebec Law 25 / CAI specific disclosures
 *   onAccept     — called when user clicks "I understand"
 *   onSettings   — called when user clicks "Manage preferences"
 */

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  locale?:    'en' | 'fr';
  isQuebec?:  boolean;
  onAccept?:  () => void;
  onSettings?: () => void;
}

const STRINGS = {
  en: {
    title:       'Privacy Notice',
    law:         'Protected under Canada\'s Personal Information Protection and Electronic Documents Act (PIPEDA)',
    intro:       'UTUBooking collects and uses your personal information (name, email, payment details) to process your Hajj/Umrah travel bookings. We are committed to protecting your privacy as a Canadian resident.',
    dataStored:  'Your data is stored exclusively in Canada (AWS Montréal, ca-central-1).',
    purposes: [
      'Process and confirm your travel bookings',
      'Send booking confirmations and travel updates',
      'Comply with anti-money laundering (AML) requirements',
      'Improve our services (with your consent)',
    ],
    thirdParty:  'We share your data with: Bambora (payment processing), Amadeus (flight search), and Hotelbeds (hotel inventory). These partners operate under Canadian or equivalent privacy standards.',
    rights:      'Your rights: Access, correct, or request erasure of your data at any time via My Account → Privacy.',
    officer:     'Privacy Officer: privacy@utubooking.com',
    accept:      'I understand',
    manage:      'Manage preferences',
    policy:      'Read full Privacy Policy',
  },
  fr: {
    title:       'Avis de confidentialité',
    law:         'Protégé par la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) et la Loi 25 du Québec',
    intro:       'UTUBooking collecte et utilise vos renseignements personnels (nom, courriel, coordonnées de paiement) pour traiter vos réservations de voyage Hajj/Omra. Nous nous engageons à protéger votre vie privée conformément à la loi québécoise.',
    dataStored:  'Vos données sont stockées exclusivement au Canada (AWS Montréal, ca-central-1).',
    purposes: [
      'Traiter et confirmer vos réservations de voyage',
      'Envoyer des confirmations de réservation et mises à jour de voyage',
      'Respecter les exigences anti-blanchiment d\'argent (CANAFE)',
      'Améliorer nos services (avec votre consentement)',
    ],
    thirdParty:  'Nous partageons vos données avec : Bambora (traitement des paiements), Amadeus (recherche de vols) et Hotelbeds (inventaire hôtelier). Ces partenaires respectent des normes de protection équivalentes.',
    rights:      'Vos droits : Accédez à vos données, corrigez-les ou demandez leur suppression à tout moment via Mon Compte → Confidentialité. Responsable de la protection des renseignements personnels (RPP) joignable à l\'adresse ci-dessous.',
    officer:     'RPP (Responsable de la protection) : confidentialite@utubooking.com',
    accept:      'Je comprends',
    manage:      'Gérer mes préférences',
    policy:      'Lire la politique de confidentialité complète',
  },
} as const;

export default function PIPEDAPrivacyNotice({
  locale = 'en',
  isQuebec = false,
  onAccept,
  onSettings,
}: Props) {
  const t = locale === 'fr' ? STRINGS.fr : STRINGS.en;
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    try {
      // Log notice acknowledgement to PIPEDA consent log
      await fetch('/api/compliance/consent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          law:         isQuebec ? 'QUEBEC_LAW25' : 'PIPEDA',
          consentType: 'privacy_notice_acknowledged',
          granted:     true,
          language:    locale,
        }),
      });
      localStorage.setItem('pipeda_notice_v1', '1');
    } catch {
      // Non-fatal — notice was shown, user clicked accept
    }
    setLoading(false);
    onAccept?.();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pipeda-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div className="bg-utu-bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-red-700 rounded-t-2xl px-5 py-4 flex items-center gap-3">
          {/* Canadian maple leaf – SVG inline */}
          <svg className="w-7 h-7 text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l1.5 4.5L18 4l-2 4 4 1-3.5 2.5 1 4-3-2.5-1 3.5L12 14l-1.5 3.5-1-3.5L6.5 16.5l1-4L4 10l4-1-2-4 4.5 2.5z" />
          </svg>
          <div>
            <h2 id="pipeda-title" className="text-white font-bold text-base">{t.title}</h2>
            <p className="text-red-200 text-xs mt-0.5">{t.law}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-4">

          <p className="text-sm text-utu-text-secondary">{t.intro}</p>

          {/* Data stored in Canada */}
          <div className="flex gap-2 bg-green-50 rounded-xl px-3 py-2.5 border border-green-100">
            <span className="text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
            <p className="text-xs text-green-800 font-medium">{t.dataStored}</p>
          </div>

          {/* Purposes */}
          <div>
            <p className="text-xs font-semibold text-utu-text-secondary uppercase tracking-wide mb-2">
              {locale === 'fr' ? 'Finalités de traitement' : 'Why we collect your data'}
            </p>
            <ul className="space-y-1">
              {t.purposes.map((p, i) => (
                <li key={i} className="flex gap-2 text-xs text-utu-text-secondary">
                  <span className="text-utu-text-muted flex-shrink-0" aria-hidden="true">•</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Third parties */}
          <p className="text-xs text-utu-text-muted">{t.thirdParty}</p>

          {/* Quebec Law 25 additional disclosure */}
          {isQuebec && (
            <div className="bg-blue-50 rounded-xl px-3 py-3 border border-blue-100 text-xs text-blue-800 space-y-1">
              <p className="font-semibold">
                {locale === 'fr'
                  ? 'Droits supplémentaires — Loi 25 du Québec'
                  : 'Additional rights — Quebec Law 25'}
              </p>
              <p>
                {locale === 'fr'
                  ? 'En tant que résident(e) du Québec, vous disposez de droits supplémentaires : droit à l\'effacement (art. 28.1), droit à la portabilité (art. 27) et droit de déposer une plainte auprès de la Commission d\'accès à l\'information (CAI).'
                  : 'As a Quebec resident, you have additional rights: erasure (art. 28.1), portability (art. 27), and the right to file a complaint with the Commission d\'accès à l\'information (CAI).'}
              </p>
            </div>
          )}

          {/* Rights + Privacy Officer */}
          <div className="border-t border-utu-border-default pt-3 space-y-1">
            <p className="text-xs text-utu-text-muted">{t.rights}</p>
            <p className="text-xs text-utu-text-muted font-medium">{t.officer}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 space-y-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={loading}
            className="w-full bg-red-700 hover:bg-red-800 text-white rounded-xl py-3 text-sm font-semibold min-h-[44px] transition-colors disabled:opacity-60"
          >
            {loading ? (locale === 'fr' ? 'Enregistrement…' : 'Saving…') : t.accept}
          </button>

          {onSettings && (
            <button
              type="button"
              onClick={onSettings}
              className="w-full border border-utu-border-default text-utu-text-secondary rounded-xl py-2.5 text-sm hover:bg-utu-bg-muted min-h-[44px]"
            >
              {t.manage}
            </button>
          )}

          <Link
            href="/privacy"
            className="block text-center text-xs text-red-700 underline hover:text-red-800 py-1"
          >
            {t.policy}
          </Link>
        </div>
      </div>
    </div>
  );
}
