import { RevParWidget }                  from '@/components/admin/RevParWidget';
import { ConversionFunnelWidget }         from '@/components/admin/ConversionFunnelWidget';
import { PricingRecommendationsWidget }   from '@/components/admin/PricingRecommendationsWidget';

/**
 * AI Revenue Optimization Admin Dashboard
 *
 * Three widgets:
 *  1. RevPAR by market (Makkah / Madinah)
 *  2. Conversion funnel by country + device
 *  3. AI pricing recommendations with Accept / Reject actions
 */
export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Revenue Optimization</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          AI-powered pricing insights for Makkah &amp; Madinah hotels · Updated every 6 hours
        </p>
      </div>

      {/* Row 1 — RevPAR */}
      <RevParWidget />

      {/* Row 2 — Funnel */}
      <ConversionFunnelWidget />

      {/* Row 3 — AI Pricing Recommendations */}
      <PricingRecommendationsWidget />
    </div>
  );
}
