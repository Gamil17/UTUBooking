'use client';

import { useTranslations } from 'next-intl';

export default function AdminSignOut() {
  const t = useTranslations('admin');
  async function handleSignOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    window.location.href = '/admin/login';
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-xs text-utu-text-muted hover:text-red-600 transition-colors"
    >
      {t('signOut')}
    </button>
  );
}
