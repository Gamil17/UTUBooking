import { getTranslations }                from 'next-intl/server';
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
export default async function AdminDashboardPage() {
  const t = await getTranslations('admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-utu-text-primary">{t('revenueOptimization')}</h1>
        <p className="mt-1 text-sm text-utu-text-muted">{t('revenueOptimizationSubtitle')}</p>
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
