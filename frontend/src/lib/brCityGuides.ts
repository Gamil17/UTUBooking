/**
 * Brazil Arab & Muslim Community Guide — Static Data
 *
 * Brazil has the largest Arab diaspora outside the Arab world — estimated
 * 8–12 million Brazilians of Arab origin (predominantly Lebanese and Syrian),
 * plus a growing convert and immigrant Muslim population of ~200,000.
 *
 * This data powers the /br/comunidade-arabe/[cidade] static pages,
 * targeted at Brazilian Muslims and Arabic-origin families planning Umrah.
 *
 * Content is in Brazilian Portuguese (pt-BR).
 * Marketing team to review + update annually with local community advisors.
 */

export interface Mosque {
  name:    string;
  address: string;
  mapsUrl: string;
}

export interface ArabService {
  category: string;
  items:    string[];
}

export interface BrCityGuide {
  slug:               string;
  name:               string;
  state:              string;
  centerLat:          number;
  centerLng:          number;
  arabPopEstimate:    string;
  muslimPopEstimate:  string;
  departureAirport:   string;
  airportName:        string;
  tagline:            string;
  heroDescription:    string;
  mosques:            Mosque[];
  arabServices:       ArabService[];
}

export const BR_CITY_GUIDES: Record<string, BrCityGuide> = {

  'sao-paulo': {
    slug:              'sao-paulo',
    name:              'São Paulo',
    state:             'São Paulo',
    centerLat:         -23.5505,
    centerLng:         -46.6333,
    arabPopEstimate:   '~6 milhões de descendência árabe',
    muslimPopEstimate: '~100.000',
    departureAirport:  'GRU',
    airportName:       'Aeroporto Internacional de Guarulhos',
    tagline:           'O maior polo árabe fora do mundo árabe',
    heroDescription:
      'São Paulo abriga a maior comunidade de descendência árabe fora do Oriente Médio — ' +
      'cerca de 6 milhões de pessoas de origem libanesa, síria, palestina e outras. ' +
      'O bairro do Bom Retiro e a Rua 25 de Março são o coração cultural árabe da cidade. ' +
      'O Aeroporto de Guarulhos (GRU) oferece conexões para Jeddah via Doha (Qatar Airways), ' +
      'Dubai (Emirates) e Istambul (Turkish Airlines), tornando São Paulo o principal ' +
      'ponto de embarque para o Umrah no Brasil.',
    mosques: [
      {
        name:    'Mesquita Brasil (Mesquita de São Paulo)',
        address: 'R. Cavalheiro Basílio Jafet, 125 — Cambuci, São Paulo, SP',
        mapsUrl: 'https://maps.google.com/?q=Mesquita+Brasil+São+Paulo',
      },
      {
        name:    'Mesquita do Brás — Sociedade Beneficente Muçulmana',
        address: 'R. do Gasômetro, 392 — Brás, São Paulo, SP',
        mapsUrl: 'https://maps.google.com/?q=Mesquita+Brás+São+Paulo',
      },
      {
        name:    'Centro Islâmico do Brasil (CIB)',
        address: 'R. Brasília, 231 — Perdizes, São Paulo, SP',
        mapsUrl: 'https://maps.google.com/?q=Centro+Islâmico+do+Brasil+São+Paulo',
      },
    ],
    arabServices: [
      {
        category: 'Culinária árabe e halal',
        items: [
          'Rua 25 de Março — mercado árabe, especiarias e doces do Oriente Médio',
          'Restaurante Almanara (rede halal, diversas unidades)',
          'Bom Retiro — restaurantes libaneses, sírios e turcos',
          'Padaria Árabe Sérgio — esfirras e salgados árabes',
        ],
      },
      {
        category: 'Cultura e comunidade árabe',
        items: [
          'Federação das Associações Árabe-Brasileiras (FEARAB)',
          'Clube Atlético Sírio-Libanês',
          'Museu do Oriente Médio — história da imigração árabe no Brasil',
          'Biblioteca Árabe — acervo em árabe e português',
        ],
      },
      {
        category: 'Serviços para peregrinos',
        items: [
          'WAMY Brasil — assistência a peregrinos e orientação de Hajj/Umrah',
          'Liga Mundial Islâmica — São Paulo',
          'Agências de viagem islâmicas no Brás e Bom Retiro',
        ],
      },
      {
        category: 'Educação islâmica',
        items: [
          'Colégio Islâmico do Brasil (São Bernardo do Campo)',
          'Instituto Brasileiro de Estudos Islâmicos (IBEI)',
          'Cursos de árabe — Mesquita Brasil e Centro Islâmico do Brasil',
        ],
      },
    ],
  },

  curitiba: {
    slug:              'curitiba',
    name:              'Curitiba',
    state:             'Paraná',
    centerLat:         -25.4284,
    centerLng:         -49.2733,
    arabPopEstimate:   '~200.000 de descendência árabe',
    muslimPopEstimate: '~10.000',
    departureAirport:  'CWB',
    airportName:       'Aeroporto Internacional Afonso Pena',
    tagline:           'Comunidade árabe vibrante no Sul do Brasil',
    heroDescription:
      'Curitiba tem uma das mais antigas comunidades libanesas do Brasil, ' +
      'estabelecida desde o final do século XIX. A cidade abriga dezenas de ' +
      'famílias de origem libanesa e síria e uma comunidade muçulmana ativa, ' +
      'com conexões para o Umrah via São Paulo (GRU) ou direto por Buenos Aires. ' +
      'Curitiba é conhecida por sua organização e qualidade de vida, ' +
      'facilitando o planejamento de viagens sagradas.',
    mosques: [
      {
        name:    'Mesquita de Curitiba — Sociedade Islâmica do Paraná',
        address: 'R. João Bettega, 1259 — Portão, Curitiba, PR',
        mapsUrl: 'https://maps.google.com/?q=Mesquita+Curitiba+Paraná',
      },
      {
        name:    'Centro Islâmico de Curitiba',
        address: 'R. Buenos Aires, 40 — Batel, Curitiba, PR',
        mapsUrl: 'https://maps.google.com/?q=Centro+Islâmico+Curitiba',
      },
    ],
    arabServices: [
      {
        category: 'Culinária árabe e halal',
        items: [
          'Restaurante Dom Emílio — culinária libanesa tradicional',
          'Empório Árabe — produtos importados e halal',
          'Mercado Municipal — seção de produtos do Oriente Médio',
        ],
      },
      {
        category: 'Comunidade árabe',
        items: [
          'Associação Beneficente Muçulmana do Paraná',
          'Club Libanês de Curitiba',
          'Comunidade Sírio-Libanesa do Paraná',
        ],
      },
      {
        category: 'Serviços para peregrinos',
        items: [
          'Agências de Hajj/Umrah autorizadas — consultar Sociedade Islâmica do Paraná',
          'Orientação de viagem pela Mesquita de Curitiba',
        ],
      },
    ],
  },

  'foz-do-iguacu': {
    slug:              'foz-do-iguacu',
    name:              'Foz do Iguaçu',
    state:             'Paraná',
    centerLat:         -25.5469,
    centerLng:         -54.5882,
    arabPopEstimate:   '~30.000 de origem árabe (10% da população)',
    muslimPopEstimate: '~15.000 (maior concentração per capita do Brasil)',
    departureAirport:  'IGU',
    airportName:       'Aeroporto Internacional de Foz do Iguaçu',
    tagline:           'A capital muçulmana do Brasil',
    heroDescription:
      'Foz do Iguaçu, na Tríplice Fronteira (Brasil–Argentina–Paraguai), tem a maior ' +
      'concentração de muçulmanos per capita do Brasil — majoritariamente de origem ' +
      'libanesa e síria. A cidade possui várias mesquitas ativas, escolas islâmicas e ' +
      'uma forte rede de comércio halal. As Cataratas do Iguaçu atraem turistas de todo ' +
      'o mundo, incluindo peregrinos muçulmanos que visitam a comunidade local. ' +
      'Voos para o Umrah partem via Guarulhos (GRU) com conexão em GIG ou diretamente ' +
      'por Buenos Aires (EZE).',
    mosques: [
      {
        name:    'Mesquita Iqra — Centro Cultural Islâmico de Foz do Iguaçu',
        address: 'Av. Paraná, 1851 — Centro, Foz do Iguaçu, PR',
        mapsUrl: 'https://maps.google.com/?q=Mesquita+Iqra+Foz+do+Iguaçu',
      },
      {
        name:    'Mesquita Nour — Associação Islâmica de Foz do Iguaçu',
        address: 'R. Mem de Sá, 1045 — Centro, Foz do Iguaçu, PR',
        mapsUrl: 'https://maps.google.com/?q=Mesquita+Nour+Foz+do+Iguaçu',
      },
      {
        name:    'Mesquita Al-Aqsa',
        address: 'R. Rui Barbosa, 901 — Centro, Foz do Iguaçu, PR',
        mapsUrl: 'https://maps.google.com/?q=Mesquita+Al-Aqsa+Foz+Iguaçu',
      },
    ],
    arabServices: [
      {
        category: 'Culinária halal',
        items: [
          'Restaurante Al-Sham — comida síria e libanesa',
          'Supermercado Halal Iguaçu — abastecimento completo halal',
          'Padaria e doceria árabe na Av. Paraná',
          'Açougue halal certificado — diversas unidades no centro',
        ],
      },
      {
        category: 'Comunidade árabe',
        items: [
          'Associação Beneficente Islâmica de Foz do Iguaçu',
          'Sociedade Libanesa de Foz do Iguaçu',
          'Câmara de Comércio Árabe-Brasileira — polo regional',
        ],
      },
      {
        category: 'Educação islâmica',
        items: [
          'Escola Islâmica de Foz do Iguaçu — ensino fundamental',
          'Madraçal do Centro Cultural Islâmico — aulas de árabe e Alcorão',
          'Biblioteca islâmica — acervo em árabe, inglês e português',
        ],
      },
      {
        category: 'Serviços para peregrinos',
        items: [
          'Grupos de Hajj/Umrah organizados pelo Centro Cultural Islâmico',
          'Consulado da Arábia Saudita — visto Umrah (via Curitiba ou São Paulo)',
          'Agências de câmbio para Real ↔ Riyal',
        ],
      },
    ],
  },

  'belo-horizonte': {
    slug:              'belo-horizonte',
    name:              'Belo Horizonte',
    state:             'Minas Gerais',
    centerLat:         -19.9167,
    centerLng:         -43.9345,
    arabPopEstimate:   '~150.000 de descendência árabe',
    muslimPopEstimate: '~5.000',
    departureAirport:  'CNF',
    airportName:       'Aeroporto Internacional Tancredo Neves (Confins)',
    tagline:           'Comunidade árabe mineira com raízes centenárias',
    heroDescription:
      'Belo Horizonte tem uma comunidade árabe estabelecida há mais de um século, ' +
      'principalmente de origem libanesa. A cidade é ponto de passagem para o ' +
      'interior de Minas, onde muitas famílias árabes se fixaram. ' +
      'O aeroporto de Confins conecta a São Paulo para voos internacionais ao ' +
      'Oriente Médio. BH tem um centro islâmico ativo e crescente interesse ' +
      'em viagens de Umrah entre as novas gerações de muçulmanos.',
    mosques: [
      {
        name:    'Mesquita de Belo Horizonte — Centro Islâmico de Minas Gerais',
        address: 'R. dos Goitacazes, 1146 — Centro, Belo Horizonte, MG',
        mapsUrl: 'https://maps.google.com/?q=Mesquita+Belo+Horizonte+Minas+Gerais',
      },
      {
        name:    'Associação Islâmica de Belo Horizonte',
        address: 'R. Bernardo Guimarães, 3071 — Serra, Belo Horizonte, MG',
        mapsUrl: 'https://maps.google.com/?q=Associação+Islâmica+Belo+Horizonte',
      },
    ],
    arabServices: [
      {
        category: 'Culinária árabe e halal',
        items: [
          'Restaurante Abu Hassan — culinária árabe tradicional',
          'Mercado Central de BH — temperos e produtos árabes',
          'Opções halal no Savassi e Funcionários',
        ],
      },
      {
        category: 'Comunidade árabe',
        items: [
          'Clube Libanês de Belo Horizonte',
          'Associação Sírio-Libanesa de Minas Gerais',
          'Centro Cultural Árabe-Mineiro',
        ],
      },
      {
        category: 'Serviços para peregrinos',
        items: [
          'Orientação de Umrah pelo Centro Islâmico de Minas Gerais',
          'Voos via GRU (Guarulhos) para Jeddah — conexão em São Paulo',
        ],
      },
    ],
  },

  'rio-de-janeiro': {
    slug:              'rio-de-janeiro',
    name:              'Rio de Janeiro',
    state:             'Rio de Janeiro',
    centerLat:         -22.9068,
    centerLng:         -43.1729,
    arabPopEstimate:   '~500.000 de descendência árabe',
    muslimPopEstimate: '~20.000',
    departureAirport:  'GIG',
    airportName:       'Aeroporto Internacional do Galeão',
    tagline:           'Maravilhas naturais e espiritualidade islâmica',
    heroDescription:
      'Rio de Janeiro tem uma comunidade muçulmana diversificada, com destaque ' +
      'para a Sociedade Beneficente Muçulmana do Rio de Janeiro (SBMRJ), ' +
      'fundada em 1929 e uma das mais antigas do Brasil. ' +
      'A cidade recebe muçulmanos de todo o Brasil e do exterior, ' +
      'atraídos pelo Cristo Redentor e pelas belezas naturais. ' +
      'O Aeroporto do Galeão (GIG) tem voos para o Oriente Médio via ' +
      'Doha (Qatar Airways) e Dubai (Emirates), sendo a principal ' +
      'porta de saída para o Umrah no Sudeste.',
    mosques: [
      {
        name:    'Mesquita da Tijuca — SBMRJ',
        address: 'R. Barão de Mesquita, 216 — Tijuca, Rio de Janeiro, RJ',
        mapsUrl: 'https://maps.google.com/?q=Mesquita+Tijuca+Rio+de+Janeiro',
      },
      {
        name:    'Centro Islâmico do Rio de Janeiro',
        address: 'R. Senador Dantas, 75 — Centro, Rio de Janeiro, RJ',
        mapsUrl: 'https://maps.google.com/?q=Centro+Islâmico+Rio+de+Janeiro',
      },
      {
        name:    'Mesquita Iqra — Niterói',
        address: 'R. Visconde de Itaboraí, 118 — Centro, Niterói, RJ',
        mapsUrl: 'https://maps.google.com/?q=Mesquita+Iqra+Niteroi',
      },
    ],
    arabServices: [
      {
        category: 'Culinária árabe e halal',
        items: [
          'Restaurante Árabe Gibran — culinária libanesa na Tijuca',
          'Saara (Centro) — mercado árabe com especiarias, tecidos e culinária do Oriente Médio',
          'Açougue halal na Tijuca — certificado para muçulmanos',
        ],
      },
      {
        category: 'Comunidade árabe',
        items: [
          'Sociedade Beneficente Muçulmana do Rio de Janeiro (SBMRJ) — fundada 1929',
          'Clube Libanês do Rio de Janeiro',
          'Associação Palestina do Rio de Janeiro',
        ],
      },
      {
        category: 'Serviços para peregrinos',
        items: [
          'Grupos de Hajj/Umrah organizados pela SBMRJ',
          'Consulado da Arábia Saudita no Rio de Janeiro — visto Umrah',
          'Liga Mundial Islâmica — escritório regional',
        ],
      },
    ],
  },

};

export const BR_CITY_SLUGS = Object.keys(BR_CITY_GUIDES);

export function getBrCityGuide(slug: string): BrCityGuide | null {
  return BR_CITY_GUIDES[slug] ?? null;
}
