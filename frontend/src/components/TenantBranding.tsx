import Image from 'next/image';
import { useTenant } from '@/contexts/TenantContext';

/**
 * Displays the tenant logo + name.
 * Shows "Powered by UTUBooking" footer unless hide_platform_branding is true.
 * Use in headers/nav where partner branding should replace UTUBooking branding.
 */
export default function TenantBranding() {
  const tenant = useTenant();

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        {tenant.logoUrl ? (
          <Image
            src={tenant.logoUrl}
            alt={`${tenant.name} logo`}
            width={120}
            height={40}
            className="object-contain"
          />
        ) : (
          <span className="text-xl font-bold" style={{ color: 'var(--brand-primary)' }}>
            {tenant.name}
          </span>
        )}
      </div>

      {!tenant.hidePlatformBranding && (
        <span className="text-xs text-utu-text-muted">
          Powered by AMEC Solutions
        </span>
      )}
    </div>
  );
}
