import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Promo Codes & Deals — UTUBooking',
  description: 'Exclusive discount codes for hotels, flights, and Umrah packages. Apply a promo code at checkout to save on your next booking.',
  openGraph: {
    title: 'Promo Codes & Deals — UTUBooking',
    description: 'Save on hotels, flights, and Umrah packages with UTUBooking promo codes.',
    type: 'website',
  },
};

export default function PromoCodesLayout({ children }: { children: ReactNode }) {
  return children;
}
