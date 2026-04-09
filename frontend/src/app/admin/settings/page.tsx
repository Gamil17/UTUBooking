'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getPlatformSettings, savePlatformSettings, type PlatformSettings } from '@/lib/api';

const DEFAULT_SETTINGS: PlatformSettings = {
  notifications: {
    recovery_delay_hours:  2,
    reminder_hours_before: 24,
    max_recovery_attempts: 3,
    price_alert_threshold: 10,
  },
  pricing: {
    hajj_surge_multiplier:   1.8,
    umrah_peak_multiplier:   1.3,
    demand_window_days:      30,
    min_confidence_to_apply: 75,
  },
  maintenance: {
    mode:    false,
    message: '',
  },
};

function NumberField({
  label,
  desc,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  desc: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="grid sm:grid-cols-3 gap-3 py-4 border-b border-utu-border-default last:border-0">
      <div className="sm:col-span-2">
        <p className="text-sm font-medium text-utu-text-primary">{label}</p>
        <p className="mt-0.5 text-xs text-utu-text-muted">{desc}</p>
      </div>
      <div className="flex items-center">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm text-utu-text-primary
                     focus:outline-none focus:ring-2 focus:ring-utu-blue"
        />
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loadError, setLoadError]  = useState(false);
  const [isLoading, setIsLoading]  = useState(true);
  const [isSaving, setIsSaving]    = useState(false);
  const [saveMsg, setSaveMsg]      = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    getPlatformSettings()
      .then((res) => setSettings(res.data))
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSave() {
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await savePlatformSettings(settings);
      setSettings(res.data);
      setSaveMsg({ type: 'ok', text: t('settingsSaved') });
    } catch {
      setSaveMsg({ type: 'err', text: t('settingsSaveError') });
    } finally {
      setIsSaving(false);
    }
  }

  function setNotif<K extends keyof PlatformSettings['notifications']>(
    key: K,
    val: PlatformSettings['notifications'][K],
  ) {
    setSettings((s) => ({ ...s, notifications: { ...s.notifications, [key]: val } }));
  }

  function setPricing<K extends keyof PlatformSettings['pricing']>(
    key: K,
    val: PlatformSettings['pricing'][K],
  ) {
    setSettings((s) => ({ ...s, pricing: { ...s.pricing, [key]: val } }));
  }

  function setMaintenance<K extends keyof PlatformSettings['maintenance']>(
    key: K,
    val: PlatformSettings['maintenance'][K],
  ) {
    setSettings((s) => ({ ...s, maintenance: { ...s.maintenance, [key]: val } }));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-utu-text-primary">{t('settings')}</h1>
          <p className="mt-1 text-sm text-utu-text-muted">{t('settingsSubtitle')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="rounded-lg bg-utu-blue px-5 py-2.5 text-sm font-medium text-white
                     hover:bg-utu-blue disabled:opacity-40 transition-colors"
          style={{ minHeight: 44 }}
        >
          {isSaving ? t('saving') : t('saveSettings')}
        </button>
      </div>

      {saveMsg && (
        <div className={`rounded-xl border px-4 py-3 text-sm
          ${saveMsg.type === 'ok'
            ? 'border-utu-border-default bg-utu-bg-subtle text-utu-blue'
            : 'border-red-200 bg-red-50 text-red-600'}`}
        >
          {saveMsg.text}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-utu-border-default bg-utu-bg-card p-10 text-center text-sm text-utu-text-muted">
          {tCommon('loading')}
        </div>
      )}

      {loadError && !isLoading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {t('settingsLoadDefault')}
        </div>
      )}

      {!isLoading && (
        <>
          {/* Email Notifications */}
          <section className="rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
            <div className="border-b border-utu-border-default px-6 py-4">
              <h2 className="text-base font-semibold text-utu-text-primary">{t('sectionNotifications')}</h2>
            </div>
            <div className="px-6">
              <NumberField
                label={t('recoveryDelayHours')}
                desc={t('recoveryDelayDesc')}
                value={settings.notifications.recovery_delay_hours}
                onChange={(v) => setNotif('recovery_delay_hours', v)}
                min={0} max={72}
              />
              <NumberField
                label={t('reminderHoursBefore')}
                desc={t('reminderHoursDesc')}
                value={settings.notifications.reminder_hours_before}
                onChange={(v) => setNotif('reminder_hours_before', v)}
                min={1} max={168}
              />
              <NumberField
                label={t('maxRecoveryAttempts')}
                desc={t('maxRecoveryDesc')}
                value={settings.notifications.max_recovery_attempts}
                onChange={(v) => setNotif('max_recovery_attempts', v)}
                min={1} max={10}
              />
              <NumberField
                label={t('priceAlertThreshold')}
                desc={t('priceAlertDesc')}
                value={settings.notifications.price_alert_threshold}
                onChange={(v) => setNotif('price_alert_threshold', v)}
                min={1} max={100}
              />
            </div>
          </section>

          {/* AI Pricing Engine */}
          <section className="rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
            <div className="border-b border-utu-border-default px-6 py-4">
              <h2 className="text-base font-semibold text-utu-text-primary">{t('sectionPricing')}</h2>
            </div>
            <div className="px-6">
              <NumberField
                label={t('hajjSurgeMultiplier')}
                desc={t('hajjSurgeDesc')}
                value={settings.pricing.hajj_surge_multiplier}
                onChange={(v) => setPricing('hajj_surge_multiplier', v)}
                min={1} max={5} step={0.1}
              />
              <NumberField
                label={t('umrahPeakMultiplier')}
                desc={t('umrahPeakDesc')}
                value={settings.pricing.umrah_peak_multiplier}
                onChange={(v) => setPricing('umrah_peak_multiplier', v)}
                min={1} max={3} step={0.1}
              />
              <NumberField
                label={t('demandWindowDays')}
                desc={t('demandWindowDesc')}
                value={settings.pricing.demand_window_days}
                onChange={(v) => setPricing('demand_window_days', v)}
                min={7} max={365}
              />
              <NumberField
                label={t('minConfidence')}
                desc={t('minConfidenceDesc')}
                value={settings.pricing.min_confidence_to_apply}
                onChange={(v) => setPricing('min_confidence_to_apply', v)}
                min={0} max={100}
              />
            </div>
          </section>

          {/* Maintenance Mode */}
          <section className="rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
            <div className="border-b border-utu-border-default px-6 py-4">
              <h2 className="text-base font-semibold text-utu-text-primary">{t('sectionMaintenance')}</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-utu-text-primary">{t('maintenanceMode')}</p>
                  <p className="text-xs text-utu-text-muted">{t('maintenanceModeDesc')}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={settings.maintenance.mode}
                  onClick={() => setMaintenance('mode', !settings.maintenance.mode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${settings.maintenance.mode ? 'bg-red-500' : 'bg-utu-border-default'}`}
                  style={{ minWidth: 44 }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-utu-bg-card shadow transition-transform
                      ${settings.maintenance.mode ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
              {settings.maintenance.mode && (
                <div>
                  <label className="block text-sm font-medium text-utu-text-secondary mb-1">
                    {t('maintenanceMsg')}
                  </label>
                  <textarea
                    value={settings.maintenance.message}
                    onChange={(e) => setMaintenance('message', e.target.value)}
                    placeholder={t('maintenanceMsgPh')}
                    rows={2}
                    className="w-full rounded-lg border border-utu-border-default p-3 text-sm text-utu-text-primary
                               focus:outline-none focus:ring-2 focus:ring-utu-blue resize-none"
                  />
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
