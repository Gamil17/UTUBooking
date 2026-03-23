export default {
  common: {
    brand:     'UTUBooking',
    switchLang: 'English',
    search:    'Cari',
    loading:   'Memuat…',
    error:     'Terjadi kesalahan. Silakan coba lagi.',
    noResults: 'Tidak ada hasil.',
    bookNow:   'Pesan Sekarang',
    cancel:    'Batal',
    confirm:   'Konfirmasi',
    back:      'Kembali',
    perNight:  '/ malam',
    sar:       'SAR',
    nights:    (n: number) => `${n} malam`,
    vat:       'termasuk PPN 11%',
    distHaram:   (m: number) => `${m} m dari Masjidil Haram`,
    distHaramKm: (m: number) => `${(m / 1000).toFixed(1)} km dari Masjidil Haram`,
    stars:     (n: number) => `hotel bintang ${n}`,
  },

  tabs: {
    home:    'Beranda',
    trips:   'Perjalanan Saya',
  },

  search: {
    tabs: {
      hotels:  'Hotel',
      flights: 'Penerbangan',
      cars:    'Mobil',
    },
    hero: {
      tagline:  'Gerbang Anda ke Makkah & Madinah',
      subtitle: 'Hotel terverifikasi · Ketersediaan real-time',
    },
    hotel: {
      destination:       'Tujuan',
      destinationHint:   'mis. Makkah, Madinah, Jeddah',
      checkIn:           'Waktu Masuk',
      checkOut:          'Waktu Keluar',
      guests:            'Tamu',
      guestsHint:        '2 dewasa',
      searchBtn:         'Cari Hotel',
      isUmrah:           'Perjalanan Umrah (filter dekat Haram)',
    },
    flight: {
      from:           'Dari',
      fromHint:       'Bandara keberangkatan (mis. CGK)',
      to:             'Ke',
      toHint:         'Bandara tujuan (mis. JED)',
      departDate:     'Tanggal Berangkat',
      returnDate:     'Tanggal Kembali (opsional)',
      passengers:     'Penumpang',
      passengersHint: '1 dewasa',
      cabin:          'Kelas Kabin',
      economy:        'Ekonomi',
      business:       'Bisnis',
      searchBtn:      'Cari Penerbangan',
    },
    car: {
      pickupCity:    'Kota Pengambilan',
      pickupHint:    'mis. Makkah',
      pickupDate:    'Tanggal Pengambilan',
      dropoffDate:   'Tanggal Pengembalian',
      transmission:  'Transmisi',
      automatic:     'Otomatis',
      manual:        'Manual',
      searchBtn:     'Cari Mobil',
    },
  },

  results: {
    title:          'Hotel Tersedia',
    count:          (n: number) => `${n} hotel ditemukan`,
    filters:        'Filter',
    sortBy:         'Urutkan',
    sortPrice:      'Harga ↑',
    sortDistance:   'Jarak',
    freeCancelOnly: 'Hanya pembatalan gratis',
    badge: {
      closest: 'Terdekat ke Haram',
      popular: 'Populer',
      value:   'Nilai Terbaik',
    },
    accessibility: {
      hotelCard:   'Kartu hotel',
      bookHotel:   (name: string) => `Pesan ${name}`,
      filterPanel: 'Filter pencarian',
    },
  },

  detail: {
    about:         'Tentang',
    amenities:     'Fasilitas',
    location:      'Lokasi',
    checkIn:       'Check-in mulai',
    checkOut:      'Check-out sebelum',
    priceBreakdown:'Rincian Harga',
    ratePerNight:  'Tarif per malam',
    totalNights:   'Total malam',
    subtotal:      'Subtotal',
    vat:           'PPN (11%)',
    total:         'Total',
    bookSticky:    (total: number) => `Pesan Sekarang — Rp ${total.toLocaleString('id-ID')}`,
    photos:        'Foto hotel',
    freeCancelTag: 'Pembatalan Gratis',
  },

  booking: {
    title:     'Selesaikan Pemesanan',
    steps: {
      details: 'Detail',
      payment: 'Pembayaran',
      confirm: 'Konfirmasi',
    },
    guest: {
      heading:          'Detail Tamu',
      firstName:        'Nama Depan',
      lastName:         'Nama Belakang',
      email:            'Alamat Email',
      phone:            'Nomor Telepon',
      phoneHint:        '+62 8XX XXXX XXXX',
      nationality:      'Kewarganegaraan',
      nationalityHint:  'mis. Indonesia',
      milesSmiles:      'Nomor Miles&Smiles (opsional)',
      milesSmilesHint:  'mis. 123456789',
      garudaMiles:      'Nomor GarudaMiles (opsional)',
      garudaMilesHint:  'mis. 000-123456789',
    },
    payment: {
      heading:     'Metode Pembayaran',
      stcPay:      'STC Pay',
      mada:        'Mada',
      visa:        'Visa / Mastercard',
      applePay:    'Apple Pay',
      cardNumber:  'Nomor Kartu',
      expiry:      'Kadaluarsa (MM/YY)',
      cvv:         'CVV',
    },
    summary: {
      heading:     'Ringkasan Pemesanan',
      hotel:       'Hotel',
      dates:       'Tanggal',
      guests:      'Tamu',
    },
    terms:     'Saya setuju dengan Syarat & Ketentuan dan Kebijakan Privasi.',
    payNow:    (total: number) => `Bayar Rp ${total.toLocaleString('id-ID')}`,
    processing:'Memproses pembayaran…',
    success:   'Pemesanan Dikonfirmasi!',
    refLabel:  'Referensi Pemesanan',
  },

  trips: {
    title:     'Perjalanan Saya',
    upcoming:  'Mendatang',
    past:      'Lalu',
    noUpcoming:'Belum ada perjalanan mendatang. Saatnya memesan!',
    noPast:    'Belum ada perjalanan sebelumnya.',
    status: {
      confirmed: 'Dikonfirmasi',
      pending:   'Menunggu',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
    },
    viewDetails: 'Lihat Detail',
    cancelTrip:  'Batalkan Perjalanan',
    ref:         'Ref',
  },

  loyalty: {
    title:           'Loyalitas Saya',
    yourPoints:      (n: number) => `${n.toLocaleString()} poin`,
    earnRate:        '1 SAR = 10 poin',
    redeemRate:      '1.000 poin = SAR 10 diskon',
    tier: {
      silver:   'Perak',
      gold:     'Emas',
      platinum: 'Platinum',
    },
    nextTier:        (n: number) => `${n.toLocaleString()} poin ke tier berikutnya`,
    atTopTier:       'Anda telah mencapai Platinum — tier tertinggi kami!',
    rewards:         'Hadiah Tersedia',
    noRewards:       'Tidak ada hadiah saat ini.',
    pts:             (n: number) => `${n.toLocaleString()} poin`,
    redeem:          'Tukar',
    notEnoughPoints: 'Poin tidak cukup',
    redeemSuccess:   (name: string) => `${name} berhasil ditukar!`,
    tabs: {
      loyalty: 'Loyalitas',
    },
  },

  // ── Garuda-specific UI strings ──────────────────────────────────────────────
  garuda: {
    // Loyalty program
    garudaMilesLabel:  'GarudaMiles',
    garudaMilesTagline:'Kumpulkan mil untuk setiap perjalanan',
    earnMiles:         (miles: number) => `Dapatkan ${miles.toLocaleString()} mil`,
    memberNumber:      'Nomor Anggota GarudaMiles',
    memberHint:        'mis. 000-123456789',

    // Route suggestions shown in flight search
    routeLabel:        'Rute Populer ke Tanah Suci',
    routes: {
      cgkJed: 'Jakarta (CGK) → Jeddah (JED) — Rute Umrah Tersibuk',
      cgkMed: 'Jakarta (CGK) → Madinah (MED)',
      subJed: 'Surabaya (SUB) → Jeddah (JED)',
      domestic: 'Rute Domestik Indonesia',
    },

    // Airport names in Bahasa
    airports: {
      CGK: 'Bandara Soekarno-Hatta, Jakarta',
      SUB: 'Bandara Juanda, Surabaya',
      DPS: 'Bandara Ngurah Rai, Bali',
      UPG: 'Bandara Sultan Hasanuddin, Makassar',
      JED: 'Bandara King Abdulaziz, Jeddah',
      MED: 'Bandara Prince Mohammad bin Abdulaziz, Madinah',
    },

    // Baggage info (Garuda includes 30kg on Umrah routes)
    baggageIncluded:   (kg: number) => `Bagasi ${kg} kg termasuk`,
    baggageNotIncluded:'Bagasi berbayar',

    // Cabin class labels (Indonesian)
    cabin: {
      economy:  'Kelas Ekonomi',
      business: 'Kelas Bisnis',
      first:    'Kelas Pertama',
    },

    // Fare families
    fareFamilies: {
      lite:     'Garuda Lite',
      smart:    'Garuda Smart',
      freedom:  'Garuda Freedom',
    },

    // Booking confirmation
    pnrLabel:         'Kode Pemesanan Garuda',
    ticketLabel:      'Nomor Tiket',
    eTicketNote:      'Tiket elektronik akan dikirim ke email Anda.',

    // Accessible labels
    accessibility: {
      selectFlight: (flightNum: string) => `Pilih penerbangan ${flightNum}`,
      viewMiles:    (miles: number) => `${miles.toLocaleString()} mil GarudaMiles yang dapat diperoleh`,
    },
  },
} as const;
