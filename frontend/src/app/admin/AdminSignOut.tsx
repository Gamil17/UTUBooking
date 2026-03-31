'use client';

export default function AdminSignOut() {
  async function handleSignOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    window.location.href = '/admin/login';
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-xs text-gray-400 hover:text-red-600 transition-colors"
    >
      Sign out
    </button>
  );
}
