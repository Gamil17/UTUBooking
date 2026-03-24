import CCPAFooterLink from '@/components/compliance/CCPAFooterLink';

export default function USLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
      {/* CCPA disclosure — required for California users before US launch */}
      <CCPAFooterLink countryCode="US" />
    </div>
  );
}
