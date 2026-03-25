import { notFound }                          from 'next/navigation';
import { Metadata }                           from 'next';
import Link                                   from 'next/link';
import { getBrCityGuide, BR_CITY_SLUGS }      from '@/lib/brCityGuides';

// ── Static params ──────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return BR_CITY_SLUGS.map((cidade) => ({ cidade }));
}

// ── Metadata ───────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: { cidade: string } },
): Promise<Metadata> {
  const guide = getBrCityGuide(params.cidade);
  if (!guide) return { title: 'Não encontrado' };

  return {
    title:       `Comunidade Árabe em ${guide.name} — Guia Umrah · UTUBooking`,
    description: guide.heroDescription.slice(0, 160),
    robots:      { index: true, follow: true },
    openGraph: {
      title:       `Comunidade Árabe em ${guide.name} · UTUBooking`,
      description: guide.heroDescription.slice(0, 160),
      type:        'website',
    },
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function BrCityGuidePage({ params }: { params: { cidade: string } }) {
  const guide = getBrCityGuide(params.cidade);
  if (!guide) notFound();

  const flightSearchUrl =
    `/voos/buscar?origem=${guide.departureAirport}&destino=JED&tipo=umrah`;

  return (
    <article className="max-w-2xl mx-auto px-4 py-8 space-y-10" lang="pt-BR">

      {/* ── Breadcrumb ─────────────────────────────────────────────── */}
      <nav aria-label="Navegação" className="text-xs text-gray-400">
        <Link href="/br/comunidade-arabe" className="hover:underline">
          Comunidade Árabe no Brasil
        </Link>
        {' / '}
        <span>{guide.name}</span>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl" aria-hidden="true">🕌</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Comunidade Árabe em {guide.name}
            </h1>
            <p className="text-sm text-gray-500">{guide.state}</p>
          </div>
        </div>
        <p className="text-lg font-medium text-emerald-700 italic">{guide.tagline}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{guide.heroDescription}</p>

        {/* Stats pills */}
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 rounded-xl px-3 py-1.5 text-xs text-emerald-800">
            <span aria-hidden="true">👥</span>
            <span>Descendência árabe: <strong>{guide.arabPopEstimate}</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 rounded-xl px-3 py-1.5 text-xs text-emerald-800">
            <span aria-hidden="true">🕌</span>
            <span>Muçulmanos: <strong>{guide.muslimPopEstimate}</strong></span>
          </div>
        </div>
      </header>

      {/* ── Umrah Departure ────────────────────────────────────────── */}
      <section
        aria-labelledby="partida-heading"
        className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 space-y-3"
      >
        <h2
          id="partida-heading"
          className="text-base font-semibold text-emerald-900 flex items-center gap-2"
        >
          <span aria-hidden="true">✈️</span> Aeroporto de partida para o Umrah
        </h2>
        <p className="text-sm text-emerald-800">
          <strong>{guide.departureAirport}</strong> — {guide.airportName}
        </p>
        <Link
          href={flightSearchUrl}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold min-h-[44px] transition-colors"
        >
          ✈️ Buscar voos de Umrah de {guide.departureAirport}
        </Link>
      </section>

      {/* ── Mosques ────────────────────────────────────────────────── */}
      <section aria-labelledby="mesquitas-heading" className="space-y-3">
        <h2
          id="mesquitas-heading"
          className="text-base font-semibold text-gray-900 flex items-center gap-2"
        >
          <span aria-hidden="true">🕌</span> Mesquitas
        </h2>
        <ul className="space-y-3" role="list">
          {guide.mosques.map((mosque) => (
            <li
              key={mosque.name}
              className="rounded-xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow"
            >
              <p className="text-sm font-semibold text-gray-900">{mosque.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{mosque.address}</p>
              <a
                href={mosque.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-600 hover:underline mt-1 inline-block"
                aria-label={`Abrir ${mosque.name} no Google Maps`}
              >
                Ver no Google Maps →
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Arab Services ──────────────────────────────────────────── */}
      <section aria-labelledby="servicos-heading" className="space-y-4">
        <h2
          id="servicos-heading"
          className="text-base font-semibold text-gray-900 flex items-center gap-2"
        >
          <span aria-hidden="true">🌙</span> Serviços árabes e islâmicos
        </h2>
        {guide.arabServices.map((group) => (
          <div
            key={group.category}
            className="rounded-xl border border-gray-100 bg-gray-50 p-4"
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{group.category}</h3>
            <ul className="space-y-1" role="list">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="text-sm text-gray-600 flex items-start gap-2"
                >
                  <span className="text-emerald-500 mt-0.5" aria-hidden="true">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* ── Hotel Search CTA ───────────────────────────────────────── */}
      <section className="rounded-2xl bg-gray-900 text-white p-6 text-center space-y-3">
        <p className="text-base font-semibold">
          Encontre hotéis halal próximos ao Haram
        </p>
        <p className="text-sm text-gray-300">
          Filtre por comida halal, sala de oração, distância ao Masjid Al-Haram e mais.
        </p>
        <Link
          href="/hoteis/buscar?destino=Meca&halal=true"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-5 py-3 text-sm font-semibold min-h-[44px] transition-colors"
        >
          🕌 Buscar hotéis halal em Meca
        </Link>
      </section>

      {/* ── Disclaimer ─────────────────────────────────────────────── */}
      <footer className="text-xs text-gray-400 border-t border-gray-100 pt-4">
        <p>
          Conteúdo revisado anualmente com assessoria de líderes comunitários.
          As informações sobre estabelecimentos são fornecidas para fins informativos —
          verifique a certificação halal diretamente com restaurantes e hotéis.
          UTUBooking recomenda confirmar horários e disponibilidade antes de visitar.
        </p>
      </footer>

    </article>
  );
}
