export const metadata = {
  title: {
    template: '%s — US Muslim Travel Guide · UTUBooking',
    default:  'US Muslim Travel Guide · UTUBooking',
  },
  description: 'Halal hotel guides, mosque directories, and Umrah departure info for Muslim travelers across the United States.',
};

export default function MuslimGuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
