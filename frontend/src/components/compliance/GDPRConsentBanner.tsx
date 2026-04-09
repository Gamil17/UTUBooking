'use client';

/**
 * GDPRConsentBanner — EU/UK GDPR (Regulation 2016/679) consent banner.
 *
 * Shown ONLY when visitor's locale is en-GB, de, fr, nl, es, it, pl
 * OR detected country is in EU_COUNTRY_CODES or 'GB'.
 *
 * GDPR Articles:
 *   Art 7  — Conditions for consent (freely given, specific, informed, unambiguous)
 *   Art 13 — Information to be provided (right to know)
 *   Art 17 — Right to erasure ("right to be forgotten")
 *   Art 20 — Right to data portability
 *
 * Consent categories:
 *   1. Strictly Necessary — always on, no toggle (legitimate interest / contract basis)
 *   2. Analytics          — opt-in only, off by default
 *   3. Marketing          — opt-in only, off by default
 *
 * No pre-ticked boxes per Art 7 + Recital 32.
 *
 * Storage:
 *   Cookie gdpr_consent (base64-JSON, 30-day expiry) — client-side state
 *   POST /api/compliance/consent                       — server-side audit log
 */

import { useEffect, useRef, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';

// ── Types ──────────────────────────────────────────────────────────────────────

type BannerState = 'loading' | 'hidden' | 'banner' | 'detail' | 'accepted' | 'declined';

interface ConsentChoices {
  necessary: true;        // Always true — cannot be toggled
  analytics:  boolean;
  marketing:  boolean;
}

interface StoredConsent {
  choices:        ConsentChoices;
  version:        string;
  timestamp:      string;
  law:            'GDPR';
}

interface Props {
  /** ISO 3166-1 alpha-2 country code from middleware (e.g. 'DE', 'GB') */
  countryCode?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const COOKIE_NAME    = 'gdpr_consent';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (not 1 year — GDPR recommends shorter)
const CONSENT_VERSION = '1.0';

const EU_COUNTRY_CODES = new Set([
  'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR',
  'HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI',
  'SK','GB', // UK — UK GDPR post-Brexit
]);

const EU_LOCALES = new Set([
  'en-GB','de','de-AT','de-CH','fr','fr-BE','fr-CH','nl','nl-BE',
  'es','it','pl','pt','sv','da','fi','el','cs','ro','hu','sk','sl',
  'hr','bg','lv','lt','et','mt','ga',
]);

// ── Translations (inline for EU locales not in our locale files) ──────────────

type Lang = 'en' | 'fr' | 'de' | 'nl' | 'es' | 'it' | 'pl';

interface Strings {
  title:         string;
  intro:         string;
  necessary:     string;
  necessaryDesc: string;
  analytics:     string;
  analyticsDesc: string;
  marketing:     string;
  marketingDesc: string;
  alwaysOn:      string;
  acceptAll:     string;
  saveChoices:   string;
  rejectAll:     string;
  customize:     string;
  back:          string;
  rights:        string;
  retention:     string;
  limitedMode:   string;
  change:        string;
  privacy:       string;
  dpo:           string;
  remembered:    string;
}

const TRANSLATIONS: Record<Lang, Strings> = {
  en: {
    title:         '🔒 Your Privacy Choices',
    intro:         'UTUBooking uses cookies and processes personal data to provide our service. Strictly necessary data is processed under Art. 13 GDPR (contract performance). We ask your consent for analytics and marketing.',
    necessary:     'Strictly Necessary',
    necessaryDesc: 'Required for booking, payments, and account security. Cannot be disabled.',
    analytics:     'Analytics',
    analyticsDesc: 'Helps us understand how you use the app to improve your experience.',
    marketing:     'Marketing & Personalisation',
    marketingDesc: 'Personalised offers, Hajj/Umrah recommendations based on your preferences.',
    alwaysOn:      'Always on',
    acceptAll:     'Accept All',
    saveChoices:   'Save My Choices',
    rejectAll:     'Reject All Optional',
    customize:     'Customise',
    back:          '← Back',
    rights:        'Your rights: access, rectify, erase, port, object — email dpo@utubooking.com · response within 30 days.',
    retention:     'Data stored in AWS EU (Frankfurt). Retention: contract + 7 years (legal).',
    limitedMode:   '⚠️ Limited mode: analytics & marketing disabled. Core booking still works.',
    change:        'Change preferences',
    privacy:       'Privacy Policy',
    dpo:           'DPO Contact',
    remembered:    'Your choice is remembered for 30 days.',
  },
  fr: {
    title:         '🔒 Vos préférences de confidentialité',
    intro:         'UTUBooking utilise des cookies et traite des données personnelles. Les données strictement nécessaires sont traitées sur la base de l\'Art. 13 RGPD (exécution du contrat). Nous demandons votre consentement pour l\'analyse et le marketing.',
    necessary:     'Strictement nécessaires',
    necessaryDesc: 'Requis pour les réservations, les paiements et la sécurité du compte. Ne peut pas être désactivé.',
    analytics:     'Analyse',
    analyticsDesc: 'Nous aide à comprendre comment vous utilisez l\'application pour améliorer votre expérience.',
    marketing:     'Marketing et personnalisation',
    marketingDesc: 'Offres personnalisées, recommandations Hajj/Omra selon vos préférences.',
    alwaysOn:      'Toujours actif',
    acceptAll:     'Tout accepter',
    saveChoices:   'Enregistrer mes choix',
    rejectAll:     'Refuser les optionnels',
    customize:     'Personnaliser',
    back:          '← Retour',
    rights:        'Vos droits : accès, rectification, effacement, portabilité, opposition — dpo@utubooking.com · réponse sous 30 jours.',
    retention:     'Données stockées dans AWS EU (Francfort). Conservation : contrat + 7 ans.',
    limitedMode:   '⚠️ Mode limité : analyse et marketing désactivés. Les réservations restent disponibles.',
    change:        'Modifier mes préférences',
    privacy:       'Politique de confidentialité',
    dpo:           'Contact DPO',
    remembered:    'Votre choix est mémorisé pendant 30 jours.',
  },
  de: {
    title:         '🔒 Ihre Datenschutzeinstellungen',
    intro:         'UTUBooking verwendet Cookies und verarbeitet personenbezogene Daten. Unbedingt erforderliche Daten werden gemäß Art. 13 DSGVO (Vertragserfüllung) verarbeitet. Für Analysen und Marketing bitten wir um Ihre Einwilligung.',
    necessary:     'Unbedingt erforderlich',
    necessaryDesc: 'Für Buchungen, Zahlungen und Kontosicherheit erforderlich. Kann nicht deaktiviert werden.',
    analytics:     'Analyse',
    analyticsDesc: 'Hilft uns zu verstehen, wie Sie die App nutzen, um Ihre Erfahrung zu verbessern.',
    marketing:     'Marketing & Personalisierung',
    marketingDesc: 'Personalisierte Angebote, Hajj/Umra-Empfehlungen basierend auf Ihren Präferenzen.',
    alwaysOn:      'Immer aktiv',
    acceptAll:     'Alle akzeptieren',
    saveChoices:   'Meine Auswahl speichern',
    rejectAll:     'Optionale ablehnen',
    customize:     'Anpassen',
    back:          '← Zurück',
    rights:        'Ihre Rechte: Auskunft, Berichtigung, Löschung, Übertragbarkeit, Widerspruch — dpo@utubooking.com · Antwort innerhalb von 30 Tagen.',
    retention:     'Daten gespeichert in AWS EU (Frankfurt). Aufbewahrung: Vertrag + 7 Jahre.',
    limitedMode:   '⚠️ Eingeschränkter Modus: Analyse und Marketing deaktiviert. Buchungen weiterhin möglich.',
    change:        'Einstellungen ändern',
    privacy:       'Datenschutzerklärung',
    dpo:           'DSB-Kontakt',
    remembered:    'Ihre Auswahl wird 30 Tage gespeichert.',
  },
  nl: {
    title:         '🔒 Uw privacykeuzes',
    intro:         'UTUBooking gebruikt cookies en verwerkt persoonsgegevens. Strikt noodzakelijke gegevens worden verwerkt op basis van Art. 13 AVG (contractuitvoering). Voor analyse en marketing vragen wij uw toestemming.',
    necessary:     'Strikt noodzakelijk',
    necessaryDesc: 'Vereist voor boekingen, betalingen en accountbeveiliging. Kan niet worden uitgeschakeld.',
    analytics:     'Analyse',
    analyticsDesc: 'Helpt ons te begrijpen hoe u de app gebruikt om uw ervaring te verbeteren.',
    marketing:     'Marketing & Personalisatie',
    marketingDesc: 'Gepersonaliseerde aanbiedingen, Hajj/Umrah-aanbevelingen op basis van uw voorkeuren.',
    alwaysOn:      'Altijd aan',
    acceptAll:     'Alles accepteren',
    saveChoices:   'Mijn keuzes opslaan',
    rejectAll:     'Optioneel weigeren',
    customize:     'Aanpassen',
    back:          '← Terug',
    rights:        'Uw rechten: inzage, rectificatie, wissing, overdraagbaarheid, bezwaar — dpo@utubooking.com · reactie binnen 30 dagen.',
    retention:     'Gegevens opgeslagen in AWS EU (Frankfurt). Bewaring: contract + 7 jaar.',
    limitedMode:   '⚠️ Beperkte modus: analyse en marketing uitgeschakeld. Boekingen blijven beschikbaar.',
    change:        'Voorkeuren wijzigen',
    privacy:       'Privacybeleid',
    dpo:           'FG-contact',
    remembered:    'Uw keuze wordt 30 dagen onthouden.',
  },
  es: {
    title:         '🔒 Sus preferencias de privacidad',
    intro:         'UTUBooking utiliza cookies y procesa datos personales. Los datos estrictamente necesarios se procesan según el Art. 13 RGPD (ejecución del contrato). Solicitamos su consentimiento para análisis y marketing.',
    necessary:     'Estrictamente necesario',
    necessaryDesc: 'Necesario para reservas, pagos y seguridad de la cuenta. No se puede desactivar.',
    analytics:     'Análisis',
    analyticsDesc: 'Nos ayuda a entender cómo usa la app para mejorar su experiencia.',
    marketing:     'Marketing y personalización',
    marketingDesc: 'Ofertas personalizadas, recomendaciones de Hajj/Umrah según sus preferencias.',
    alwaysOn:      'Siempre activo',
    acceptAll:     'Aceptar todo',
    saveChoices:   'Guardar mis opciones',
    rejectAll:     'Rechazar opcionales',
    customize:     'Personalizar',
    back:          '← Volver',
    rights:        'Sus derechos: acceso, rectificación, supresión, portabilidad, oposición — dpo@utubooking.com · respuesta en 30 días.',
    retention:     'Datos almacenados en AWS EU (Fráncfort). Retención: contrato + 7 años.',
    limitedMode:   '⚠️ Modo limitado: análisis y marketing desactivados. Las reservas siguen disponibles.',
    change:        'Cambiar preferencias',
    privacy:       'Política de privacidad',
    dpo:           'Contacto DPO',
    remembered:    'Su elección se recuerda durante 30 días.',
  },
  it: {
    title:         '🔒 Le tue preferenze sulla privacy',
    intro:         'UTUBooking utilizza cookie e tratta dati personali. I dati strettamente necessari sono trattati ai sensi dell\'Art. 13 GDPR (esecuzione del contratto). Chiediamo il tuo consenso per analisi e marketing.',
    necessary:     'Strettamente necessari',
    necessaryDesc: 'Necessari per prenotazioni, pagamenti e sicurezza dell\'account. Non disattivabili.',
    analytics:     'Analisi',
    analyticsDesc: 'Ci aiuta a capire come usi l\'app per migliorare la tua esperienza.',
    marketing:     'Marketing e personalizzazione',
    marketingDesc: 'Offerte personalizzate, consigli per Hajj/Umrah in base alle tue preferenze.',
    alwaysOn:      'Sempre attivo',
    acceptAll:     'Accetta tutto',
    saveChoices:   'Salva le mie scelte',
    rejectAll:     'Rifiuta opzionali',
    customize:     'Personalizza',
    back:          '← Indietro',
    rights:        'I tuoi diritti: accesso, rettifica, cancellazione, portabilità, opposizione — dpo@utubooking.com · risposta entro 30 giorni.',
    retention:     'Dati archiviati in AWS EU (Francoforte). Conservazione: contratto + 7 anni.',
    limitedMode:   '⚠️ Modalità limitata: analisi e marketing disattivati. Le prenotazioni restano disponibili.',
    change:        'Modifica preferenze',
    privacy:       'Informativa sulla privacy',
    dpo:           'Contatto DPO',
    remembered:    'La tua scelta viene ricordata per 30 giorni.',
  },
  pl: {
    title:         '🔒 Twoje preferencje prywatności',
    intro:         'UTUBooking używa plików cookie i przetwarza dane osobowe. Niezbędne dane są przetwarzane na podstawie Art. 13 RODO (wykonanie umowy). Prosimy o zgodę na analizę i marketing.',
    necessary:     'Niezbędne',
    necessaryDesc: 'Wymagane do rezerwacji, płatności i bezpieczeństwa konta. Nie można wyłączyć.',
    analytics:     'Analityka',
    analyticsDesc: 'Pomaga nam zrozumieć, jak korzystasz z aplikacji, aby poprawić Twoje doświadczenia.',
    marketing:     'Marketing i personalizacja',
    marketingDesc: 'Spersonalizowane oferty, rekomendacje Hajj/Umra zgodnie z Twoimi preferencjami.',
    alwaysOn:      'Zawsze włączone',
    acceptAll:     'Zaakceptuj wszystko',
    saveChoices:   'Zapisz moje wybory',
    rejectAll:     'Odrzuć opcjonalne',
    customize:     'Dostosuj',
    back:          '← Wróć',
    rights:        'Twoje prawa: dostęp, sprostowanie, usunięcie, przenoszenie, sprzeciw — dpo@utubooking.com · odpowiedź w ciągu 30 dni.',
    retention:     'Dane przechowywane w AWS EU (Frankfurt). Retencja: umowa + 7 lat.',
    limitedMode:   '⚠️ Tryb ograniczony: analityka i marketing wyłączone. Rezerwacje nadal dostępne.',
    change:        'Zmień preferencje',
    privacy:       'Polityka prywatności',
    dpo:           'Kontakt z IOD',
    remembered:    'Twój wybór jest zapamiętywany przez 30 dni.',
  },
};

// ── Cookie helpers ─────────────────────────────────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name: string, value: string, maxAge: number): void {
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `max-age=${maxAge}`,
    'path=/',
    'SameSite=Lax',
    ...(location.protocol === 'https:' ? ['Secure'] : []),
  ].join('; ');
}

function readStoredConsent(): StoredConsent | null {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return null;
  try {
    return JSON.parse(atob(raw)) as StoredConsent;
  } catch {
    return null;
  }
}

function writeConsentCookie(choices: ConsentChoices): void {
  const payload: StoredConsent = {
    choices,
    version:   CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    law:       'GDPR',
  };
  setCookie(COOKIE_NAME, btoa(JSON.stringify(payload)), COOKIE_MAX_AGE);
}

// ── Locale helpers ─────────────────────────────────────────────────────────────

function detectLang(locale: string): Lang {
  if (locale.startsWith('fr')) return 'fr';
  if (locale.startsWith('de')) return 'de';
  if (locale.startsWith('nl')) return 'nl';
  if (locale.startsWith('es')) return 'es';
  if (locale.startsWith('it')) return 'it';
  if (locale.startsWith('pl')) return 'pl';
  return 'en';
}

function isGdprRequired(locale: string, countryCode?: string): boolean {
  if (countryCode && EU_COUNTRY_CODES.has(countryCode.toUpperCase())) return true;
  const base = locale.split('-')[0].toLowerCase();
  const full  = locale.toLowerCase();
  return EU_LOCALES.has(full) || EU_LOCALES.has(base);
}

async function logConsent(choices: ConsentChoices, locale: string): Promise<void> {
  try {
    await fetch('/api/compliance/consent', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        consentGiven:    choices.analytics || choices.marketing,
        consentChoices:  choices,
        locale,
        consentVersion:  CONSENT_VERSION,
        law:             'GDPR',
      }),
    });
  } catch {
    // Non-fatal — cookie already set; audit log will note gap
  }
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const S = {
  banner: {
    position:        'fixed' as const,
    bottom:          0,
    left:            0,
    right:           0,
    zIndex:          50,
    backgroundColor: '#111827',
    borderTop:       '3px solid #10B981',
    boxShadow:       '0 -4px 24px rgba(0,0,0,0.45)',
    padding:         '20px 24px',
    maxHeight:       '80vh',
    overflowY:       'auto' as const,
  },
  title: {
    color:        '#F9FAFB',
    fontWeight:   700,
    fontSize:     16,
    marginBottom: 10,
  },
  body: {
    color:        '#D1D5DB',
    fontSize:     13,
    lineHeight:   1.7,
    marginBottom: 12,
  },
  categoryRow: {
    display:         'flex' as const,
    alignItems:      'flex-start' as const,
    justifyContent:  'space-between' as const,
    backgroundColor: '#1F2937',
    borderRadius:    8,
    padding:         '12px 14px',
    marginBottom:    8,
    gap:             12,
  },
  categoryLabel: {
    color:      '#F3F4F6',
    fontWeight: 600,
    fontSize:   14,
    marginBottom: 3,
  },
  categoryDesc: {
    color:    '#9CA3AF',
    fontSize: 12,
    lineHeight: 1.5,
  },
  alwaysOn: {
    color:    '#10B981',
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    marginTop: 4,
  },
  toggle: {
    width:         44,
    height:        24,
    borderRadius:  12,
    border:        'none',
    cursor:        'pointer',
    flexShrink:    0 as const,
    transition:    'background-color 0.2s',
    position:      'relative' as const,
    marginTop:     2,
  },
  actions: {
    display:    'flex' as const,
    gap:        10,
    flexWrap:   'wrap' as const,
    alignItems: 'center',
    marginTop:  16,
  },
  btnPrimary: {
    backgroundColor: '#10B981',
    color:           '#fff',
    border:          'none',
    borderRadius:    8,
    padding:         '10px 24px',
    fontSize:        14,
    fontWeight:      700,
    cursor:          'pointer',
    minHeight:       44,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    color:           '#9CA3AF',
    border:          '1px solid #4B5563',
    borderRadius:    8,
    padding:         '10px 20px',
    fontSize:        14,
    fontWeight:      600,
    cursor:          'pointer',
    minHeight:       44,
  },
  note: {
    color:     '#6B7280',
    fontSize:  12,
    lineHeight: 1.5,
    marginTop: 10,
  },
  link: {
    color:          '#10B981',
    textDecoration: 'underline' as const,
  },
} as const;

// ── Toggle switch sub-component ────────────────────────────────────────────────

function Toggle({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const knobPos = isRtl ? (checked ? 3 : 23) : (checked ? 23 : 3);
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        ...S.toggle,
        backgroundColor: checked ? '#10B981' : '#374151',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display:         'block',
          width:           18,
          height:          18,
          borderRadius:    '50%',
          backgroundColor: '#fff',
          position:        'absolute',
          top:             3,
          left:            knobPos,
          transition:      'left 0.2s',
        }}
      />
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function GDPRConsentBanner({ countryCode }: Props) {
  const tenant = useTenant();
  const [state, setState]       = useState<BannerState>('loading');
  const [analytics,  setAnalytics]  = useState(false);
  const [marketing,  setMarketing]  = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const lang = detectLang(tenant.locale);
  const t    = TRANSLATIONS[lang];

  useEffect(() => {
    if (!isGdprRequired(tenant.locale, countryCode)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage (SSR-unavailable), must run after hydration to avoid mismatch
      setState('hidden');
      return;
    }
    const stored = readStoredConsent();
    if (stored) {
      setAnalytics(stored.choices.analytics);
      setMarketing(stored.choices.marketing);
      setState('accepted');  // Already decided — hide banner, show nothing
    } else {
      setState('banner');
    }
  }, [tenant.locale, countryCode]);

  function buildChoices(): ConsentChoices {
    return { necessary: true, analytics, marketing };
  }

  async function handleAcceptAll(): Promise<void> {
    const choices: ConsentChoices = { necessary: true, analytics: true, marketing: true };
    writeConsentCookie(choices);
    setState('accepted');
    await logConsent(choices, tenant.locale);
  }

  async function handleSaveChoices(): Promise<void> {
    const choices = buildChoices();
    writeConsentCookie(choices);
    setState(analytics || marketing ? 'accepted' : 'declined');
    await logConsent(choices, tenant.locale);
  }

  async function handleRejectAll(): Promise<void> {
    const choices: ConsentChoices = { necessary: true, analytics: false, marketing: false };
    writeConsentCookie(choices);
    setState('declined');
    await logConsent(choices, tenant.locale);
  }

  function handleRevoke(): void {
    setState('banner');
  }

  if (state === 'loading' || state === 'hidden' || state === 'accepted') return null;

  // ── Declined — minimal persistent bar ─────────────────────────────────────
  if (state === 'declined') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          zIndex:          50,
          backgroundColor: '#1F2937',
          borderTop:       '1px solid #374151',
          padding:         '10px 20px',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          gap:             12,
          flexWrap:        'wrap',
        }}
      >
        <span style={{ color: '#D1D5DB', fontSize: 13 }}>{t.limitedMode}</span>
        <button
          onClick={handleRevoke}
          aria-label={t.change}
          style={{
            background:   'transparent',
            border:       '1px solid #6B7280',
            borderRadius: 6,
            color:        '#D1D5DB',
            fontSize:     13,
            padding:      '4px 14px',
            cursor:       'pointer',
            whiteSpace:   'nowrap',
            minHeight:    36,
          }}
        >
          {t.change}
        </button>
      </div>
    );
  }

  // ── Detail view — granular category toggles ────────────────────────────────
  if (state === 'detail') {
    return (
      <div
        ref={detailRef}
        role="dialog"
        aria-modal="false"
        aria-label={t.title}
        style={S.banner}
      >
        <p style={S.title}>{t.title}</p>

        {/* Strictly Necessary */}
        <div style={S.categoryRow}>
          <div>
            <p style={S.categoryLabel}>{t.necessary}</p>
            <p style={S.categoryDesc}>{t.necessaryDesc}</p>
          </div>
          <span style={S.alwaysOn}>{t.alwaysOn}</span>
        </div>

        {/* Analytics */}
        <div style={S.categoryRow}>
          <div style={{ flex: 1 }}>
            <p style={S.categoryLabel}>{t.analytics}</p>
            <p style={S.categoryDesc}>{t.analyticsDesc}</p>
          </div>
          <Toggle
            id="gdpr-analytics"
            checked={analytics}
            onChange={setAnalytics}
            label={t.analytics}
          />
        </div>

        {/* Marketing */}
        <div style={S.categoryRow}>
          <div style={{ flex: 1 }}>
            <p style={S.categoryLabel}>{t.marketing}</p>
            <p style={S.categoryDesc}>{t.marketingDesc}</p>
          </div>
          <Toggle
            id="gdpr-marketing"
            checked={marketing}
            onChange={setMarketing}
            label={t.marketing}
          />
        </div>

        <div style={S.actions}>
          <button onClick={handleSaveChoices}  aria-label={t.saveChoices}  style={S.btnPrimary}>{t.saveChoices}</button>
          <button onClick={handleAcceptAll}     aria-label={t.acceptAll}    style={S.btnSecondary}>{t.acceptAll}</button>
          <button onClick={() => setState('banner')} aria-label={t.back}   style={S.btnSecondary}>{t.back}</button>
        </div>

        <p style={S.note}>
          {t.rights}
          {' · '}
          {t.retention}
          {' '}
          <a href="/privacy" style={S.link}>{t.privacy}</a>
        </p>
        <p style={{ ...S.note, marginTop: 4 }}>{t.remembered}</p>
      </div>
    );
  }

  // ── Banner — summary view ──────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t.title}
      style={S.banner}
    >
      <p style={S.title}>{t.title}</p>

      <p style={S.body}>{t.intro}</p>

      <p style={{ ...S.note, marginBottom: 0 }}>
        {t.rights}
        {' · '}
        <a href="/privacy" style={S.link}>{t.privacy}</a>
        {' · '}
        <a href="mailto:dpo@utubooking.com" style={S.link}>{t.dpo}</a>
      </p>

      <div style={S.actions}>
        <button onClick={handleAcceptAll}          aria-label={t.acceptAll}    style={S.btnPrimary}>{t.acceptAll}</button>
        <button onClick={handleRejectAll}          aria-label={t.rejectAll}    style={S.btnSecondary}>{t.rejectAll}</button>
        <button onClick={() => setState('detail')} aria-label={t.customize}    style={S.btnSecondary}>{t.customize}</button>
      </div>

      <p style={{ ...S.note, marginTop: 10 }}>{t.remembered}</p>
    </div>
  );
}
