import type { Meta, StoryObj } from '@storybook/react';
import { colors, spacing, radius, fonts, fontSizes } from '@/design-system';

const meta: Meta = {
  title: 'Design System/Tokens',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'page' },
  },
};
export default meta;
type Story = StoryObj;

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold text-utu-text-primary mb-6 pb-2 border-b border-utu-border-default">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ColorSwatch({ name, value, label }: { name: string; value: string; label?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="w-full h-16 rounded-utu-input border border-utu-border-default shadow-sm"
        style={{ backgroundColor: value }}
      />
      <p className="text-[11px] font-medium text-utu-text-primary">{label ?? name}</p>
      <p className="text-[11px] font-mono text-utu-text-muted">{value}</p>
    </div>
  );
}

// ── Story: Color System ───────────────────────────────────────────────────────

function ColorPalette() {
  const brandColors = [
    { name: 'navy',       value: colors.navy,       label: 'Navy (Primary)' },
    { name: 'blue',       value: colors.blue,       label: 'Blue (Action)' },
    { name: 'blueMid',    value: colors.blueMid,    label: 'Blue Mid' },
    { name: 'blueLight',  value: colors.blueLight,  label: 'Blue Light' },
    { name: 'bluePale',   value: colors.bluePale,   label: 'Blue Pale' },
  ];
  const bgColors = [
    { name: 'bgPage',   value: colors.bgPage,   label: 'Page BG' },
    { name: 'bgCard',   value: colors.bgCard,   label: 'Card BG' },
    { name: 'bgMuted',  value: colors.bgMuted,  label: 'Muted BG' },
    { name: 'bgSubtle', value: colors.bgSubtle, label: 'Subtle BG' },
  ];
  const textColors = [
    { name: 'textPrimary',   value: colors.textPrimary,   label: 'Text Primary' },
    { name: 'textSecondary', value: colors.textSecondary, label: 'Text Secondary' },
    { name: 'textMuted',     value: colors.textMuted,     label: 'Text Muted' },
  ];
  const borderColors = [
    { name: 'borderDefault', value: colors.borderDefault, label: 'Border Default' },
    { name: 'borderStrong',  value: colors.borderStrong,  label: 'Border Strong' },
  ];
  const statusGroups = [
    { label: 'Success', items: [
      { name: 'successBg',     value: colors.successBg,     label: 'BG' },
      { name: 'successBorder', value: colors.successBorder, label: 'Border' },
      { name: 'successText',   value: colors.successText,   label: 'Text' },
    ]},
    { label: 'Info', items: [
      { name: 'infoBg',     value: colors.infoBg,     label: 'BG' },
      { name: 'infoBorder', value: colors.infoBorder, label: 'Border' },
      { name: 'infoText',   value: colors.infoText,   label: 'Text' },
    ]},
    { label: 'Warning', items: [
      { name: 'warningBg',     value: colors.warningBg,     label: 'BG' },
      { name: 'warningBorder', value: colors.warningBorder, label: 'Border' },
      { name: 'warningText',   value: colors.warningText,   label: 'Text' },
    ]},
    { label: 'Error', items: [
      { name: 'errorBg',     value: colors.errorBg,     label: 'BG' },
      { name: 'errorBorder', value: colors.errorBorder, label: 'Border' },
      { name: 'errorText',   value: colors.errorText,   label: 'Text' },
    ]},
  ];

  return (
    <div className="p-8 bg-utu-bg-page min-h-screen">
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-utu-text-primary">UTUBooking Design System</h1>
          <p className="text-sm text-utu-text-muted mt-1">v1.0 · All tokens are defined in <code className="font-mono bg-utu-bg-muted px-1 rounded">src/design-system/tokens.ts</code></p>
        </div>

        <Section title="Brand Colors">
          <div className="grid grid-cols-5 gap-4">
            {brandColors.map((c) => <ColorSwatch key={c.name} {...c} />)}
          </div>
        </Section>

        <Section title="Background Colors">
          <div className="grid grid-cols-4 gap-4">
            {bgColors.map((c) => <ColorSwatch key={c.name} {...c} />)}
          </div>
        </Section>

        <Section title="Text Colors">
          <div className="grid grid-cols-3 gap-4">
            {textColors.map((c) => <ColorSwatch key={c.name} {...c} />)}
          </div>
        </Section>

        <Section title="Border Colors">
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            {borderColors.map((c) => <ColorSwatch key={c.name} {...c} />)}
          </div>
        </Section>

        <Section title="Status Colors">
          {statusGroups.map((g) => (
            <div key={g.label} className="mb-6">
              <p className="text-xs font-semibold text-utu-text-secondary mb-3 uppercase tracking-wide">{g.label}</p>
              <div className="grid grid-cols-3 gap-4 max-w-xs">
                {g.items.map((c) => <ColorSwatch key={c.name} {...c} />)}
              </div>
            </div>
          ))}
        </Section>

        <Section title="Typography Specimens — English (LTR)">
          <div className="space-y-4">
            <div><p style={{ fontSize: fontSizes['3xl'], fontWeight: 700, color: colors.textPrimary, lineHeight: 1.2 }}>H1 — 32px Bold — Discover Sacred Destinations</p><p className="text-[11px] text-utu-text-muted mt-1">32px / font-bold / leading-tight</p></div>
            <div><p style={{ fontSize: fontSizes['2xl'], fontWeight: 600, color: colors.textPrimary, lineHeight: 1.3 }}>H2 — 28px Semibold — Hotels near Al-Haram</p><p className="text-[11px] text-utu-text-muted mt-1">28px / font-semibold</p></div>
            <div><p style={{ fontSize: fontSizes.xl, fontWeight: 600, color: colors.textPrimary }}>H3 — 22px Semibold — Booking Summary</p><p className="text-[11px] text-utu-text-muted mt-1">22px / font-semibold</p></div>
            <div><p style={{ fontSize: fontSizes.lg, fontWeight: 500, color: colors.textPrimary }}>Body Large — 18px Medium — Your stay details</p><p className="text-[11px] text-utu-text-muted mt-1">18px / font-medium</p></div>
            <div><p style={{ fontSize: fontSizes.base, color: colors.textSecondary, lineHeight: 1.6 }}>Body — 14px Regular — Makkah Hilton & Towers is a five-star luxury hotel located 200 meters from the Grand Mosque. Offering premium services tailored for Hajj and Umrah pilgrims.</p><p className="text-[11px] text-utu-text-muted mt-1">14px / regular / leading-relaxed</p></div>
            <div><p style={{ fontSize: fontSizes.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Caption / Label — 12px · ALL CAPS</p><p className="text-[11px] text-utu-text-muted mt-1">12px / font-semibold / tracking-wider</p></div>
          </div>
        </Section>

        <Section title="Typography Specimens — Arabic (RTL)">
          <div dir="rtl" className="space-y-4" style={{ fontFamily: fonts.arabic }}>
            <div><p style={{ fontSize: fontSizes['2xl'], fontWeight: 700, color: colors.textPrimary }}>اكتشف الوجهات المقدسة</p><p className="text-[11px] text-utu-text-muted mt-1" dir="ltr">28px / Arabic heading</p></div>
            <div><p style={{ fontSize: fontSizes.lg, color: colors.textSecondary, lineHeight: 1.8 }}>فندق مكة هيلتون وأبراجه — فندق فاخر من فئة خمس نجوم يقع على بعد ٢٠٠ متر من المسجد الحرام. يقدم خدمات مميزة للحجاج والمعتمرين.</p><p className="text-[11px] text-utu-text-muted mt-1" dir="ltr">18px / Arabic body / line-height 1.8</p></div>
            <div><p style={{ fontSize: fontSizes.base, color: colors.textMuted }}>١٠٠ ريال سعودي · ليلة واحدة · إفطار مجاني</p><p className="text-[11px] text-utu-text-muted mt-1" dir="ltr">14px / Arabic caption</p></div>
          </div>
        </Section>

        <Section title="Spacing Scale">
          <div className="flex items-end gap-4">
            {Object.entries(spacing).map(([key, value]) => (
              <div key={key} className="flex flex-col items-center gap-2">
                <div className="bg-utu-blue rounded" style={{ width: value, height: value }} />
                <p className="text-[11px] font-mono text-utu-text-muted">{value}</p>
                <p className="text-[11px] text-utu-text-secondary">{key}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Border Radius Scale">
          <div className="flex flex-wrap gap-6">
            {Object.entries(radius).filter(([,v]) => v !== '9999px').map(([key, value]) => (
              <div key={key} className="flex flex-col items-center gap-2">
                <div
                  className="w-16 h-16 bg-utu-navy"
                  style={{ borderRadius: value }}
                />
                <p className="text-[11px] font-mono text-utu-text-muted">{value}</p>
                <p className="text-[11px] text-utu-text-secondary">{key}</p>
              </div>
            ))}
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-utu-navy rounded-full" />
              <p className="text-[11px] font-mono text-utu-text-muted">9999px</p>
              <p className="text-[11px] text-utu-text-secondary">pill</p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

export const Tokens: Story = {
  render: () => <ColorPalette />,
};
