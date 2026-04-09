'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function AdminSignOut() {
  const t = useTranslations('admin');
  const router = useRouter();
  async function handleSignOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
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
