import type { Metadata } from 'next';
import Link              from 'next/link';
import { BR_CITY_GUIDES } from '@/lib/brCityGuides';

export const metadata: Metadata = {
  title:       'Comunidade Árabe no Brasil — Guia de Umrah · UTUBooking',
  description: 'Guia completo para muçulmanos e descendentes árabes no Brasil que desejam realizar o Umrah: mesquitas, serviços halal, voos e pacotes de São Paulo, Curitiba, Foz do Iguaçu, BH e Rio.',
  robots:      { index: true, follow: true },
};

export default function BrComunidadeArabePage() {
  const cities = Object.values(BR_CITY_GUIDES);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8" lang="pt-BR">

      {/* Hero */}
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-utu-text-primary">
          Comunidade Árabe no Brasil
        </h1>
        <p className="text-base text-emerald-700 font-medium italic">
          O Brasil tem a maior diáspora árabe fora do mundo árabe — e UTUBooking está aqui para servir essa comunidade.
        </p>
        <p className="text-sm text-utu-text-secondary leading-relaxed">
          Somos o portal de viagem para muçulmanos brasileiros e descendentes árabes que desejam
          realizar o Umrah ou o Hajj. Encontre mesquitas, restaurantes halal, serviços comunitários
          e os melhores voos e hotéis próximos ao Masjid Al-Haram — na sua cidade.
        </p>
        <div className="inline-flex items-center gap-2 bg-emerald-50 rounded-xl px-4 py-2 text-sm text-emerald-800">
          <span aria-hidden="true">🌍</span>
          <span>8–12 milhões de brasileiros de origem árabe · ~200.000 muçulmanos no Brasil</span>
        </div>
      </header>

      {/* City grid */}
      <section aria-labelledby="cidades-heading">
        <h2 id="cidades-heading" className="text-base font-semibold text-utu-text-primary mb-4">
          Escolha sua cidade
        </h2>
        <ul className="space-y-3" role="list">
          {cities.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/br/comunidade-arabe/${guide.slug}`}
                className="block rounded-2xl border border-utu-border-default bg-utu-bg-card p-4 hover:shadow-md hover:border-emerald-200 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-semibold text-utu-text-primary group-hover:text-emerald-700 transition-colors">
                      {guide.name}
                      <span className="ml-1.5 text-xs font-normal text-utu-text-muted">{guide.state}</span>
                    </p>
                    <p className="text-xs text-emerald-700 italic">{guide.tagline}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-xs text-utu-text-muted">
                        👥 {guide.arabPopEstimate}
                      </span>
                      <span className="text-xs text-utu-text-muted">
                        ✈️ {guide.departureAirport}
                      </span>
                    </div>
                  </div>
                  <span className="text-emerald-400 group-hover:text-emerald-600 transition-colors flex-shrink-0 mt-1" aria-hidden="true">
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Umrah CTA */}
      <section className="rounded-2xl bg-gray-900 text-white p-6 {/* EXCEPTION: dark CTA section — intentional */} text-center space-y-3">
        <p className="text-base font-semibold">Pronto para seu Umrah?</p>
        <p className="text-sm text-utu-text-muted">
          Compare hotéis halal próximos ao Haram, voos de todo o Brasil e pacotes completos de Umrah.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/hoteis/buscar?destino=Meca&halal=true"
            className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-5 py-3 text-sm font-semibold min-h-[44px] transition-colors"
          >
            🕌 Hotéis em Meca
          </Link>
          <Link
            href="/voos/buscar?destino=JED&tipo=umrah"
            className="inline-flex items-center justify-center gap-2 bg-utu-bg-card/10 hover:bg-utu-bg-card/20 text-white rounded-xl px-5 py-3 text-sm font-semibold min-h-[44px] transition-colors"
          >
            ✈️ Voos para Jeddah
          </Link>
        </div>
      </section>

    </main>
  );
}
