// US sub-layout — wraps all /us/* routes.
// CCPAFooterLink is rendered in the root layout (layout.tsx) for all US users.
export default function USLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
