'use strict';

/**
 * UTUBooking — Development Seed Script
 * Run inside Docker: docker compose run --rm migrate node /app/seed.js
 * Or locally:        DATABASE_URL=... node backend/seed.js
 *
 * Seeds: users, hotel_offers, flight_offers, car_offers
 */

require('dotenv').config({ path: __dirname + '/.env' });
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function seed() {
  await client.connect();
  console.log('Connected to DB — seeding...\n');

  // ── Users ─────────────────────────────────────────────────────────────────
  const superHash   = await bcrypt.hash('Super@123456', 10);
  const adminHash   = await bcrypt.hash('Admin@123456', 10);
  const userHash    = await bcrypt.hash('User@123456', 10);

  // Super admin — global access
  await client.query(`
    INSERT INTO users (email, password_hash, role, name, name_en, name_ar, phone, preferred_currency, preferred_lang, status, country)
    VALUES ('superadmin@utubooking.com', $1, 'super_admin', 'Super Admin', 'Super Admin', 'سوبر أدمن', '+966500000000', 'SAR', 'en', 'active', 'SA')
    ON CONFLICT (email) DO NOTHING
  `, [superHash]);

  // Country admins
  await client.query(`
    INSERT INTO users (email, password_hash, role, name, name_en, name_ar, phone, preferred_currency, preferred_lang, status, country, admin_country)
    VALUES
      ('admin.sa@utubooking.com', $1, 'country_admin', 'Saudi Admin',  'Saudi Admin',  'أدمن السعودية', '+966500000011', 'SAR', 'ar', 'active', 'SA', 'SA'),
      ('admin.ae@utubooking.com', $1, 'country_admin', 'UAE Admin',    'UAE Admin',    'أدمن الإمارات', '+971500000012', 'AED', 'ar', 'active', 'AE', 'AE'),
      ('admin.tr@utubooking.com', $1, 'country_admin', 'Turkey Admin', 'Turkey Admin', 'Türkiye Admin',  '+905000000013', 'SAR', 'tr', 'active', 'TR', 'TR')
    ON CONFLICT (email) DO NOTHING
  `, [adminHash]);

  // Regular admin (platform ops)
  await client.query(`
    INSERT INTO users (email, password_hash, role, name, name_en, name_ar, phone, preferred_currency, preferred_lang, status)
    VALUES ('admin@utubooking.com', $1, 'admin', 'Admin UTU', 'Admin UTU', 'أدمن يو تي يو', '+966500000001', 'SAR', 'en', 'active')
    ON CONFLICT (email) DO NOTHING
  `, [adminHash]);

  // Test users
  await client.query(`
    INSERT INTO users (email, password_hash, role, name, name_en, name_ar, phone, preferred_currency, preferred_lang, status, country)
    VALUES
      ('test@utubooking.com',   $1, 'user',  'Ahmed Al-Rashid', 'Ahmed Al-Rashid', 'أحمد الراشد', '+966500000002', 'SAR', 'ar', 'active', 'SA'),
      ('agent@utubooking.com',  $2, 'agent', 'Sara Booking',    'Sara Booking',    'سارة بوكينج', '+971500000003', 'AED', 'en', 'active', 'AE'),
      ('pending@utubooking.com',$1, 'user',  'Pending User',    'Pending User',    'مستخدم معلق',  '+201000000005', 'SAR', 'en', 'pending','EG')
    ON CONFLICT (email) DO NOTHING
  `, [userHash, adminHash]);

  console.log('✓ Users seeded:');
  console.log('  Super Admin:    superadmin@utubooking.com / Super@123456');
  console.log('  Country Admin SA: admin.sa@utubooking.com  / Admin@123456');
  console.log('  Country Admin AE: admin.ae@utubooking.com  / Admin@123456');
  console.log('  Country Admin TR: admin.tr@utubooking.com  / Admin@123456');
  console.log('  Platform Admin: admin@utubooking.com       / Admin@123456');
  console.log('  Test User:      test@utubooking.com        / User@123456');
  console.log('  Pending User:   pending@utubooking.com     / User@123456 (awaiting approval)');

  // ── Hotel Offers ──────────────────────────────────────────────────────────
  await client.query(`
    INSERT INTO hotel_offers (
      hotel_id, name, name_ar, stars, location, distance_haram_m,
      price_per_night, currency, is_hajj_package, is_umrah_package,
      amenities, is_active, halal_amenities, is_halal_friendly
    ) VALUES
    -- Makkah — 5-star
    ('HTL-MKH-001', 'Swissotel Al Maqam Makkah', 'سويسوتيل المقام مكة', 5, 'Makkah', 100,
      1850.00, 'SAR', true, true,
      ARRAY['Free WiFi','Buffet Restaurant','Zamzam Water','Prayer Room','Qibla Direction','24h Room Service','Concierge'],
      true,
      '{"no_alcohol":true,"halal_food":true,"prayer_room":true,"qibla_direction":true,"zamzam_water":true,"female_only_floor":true,"no_pork":true}',
      true),

    ('HTL-MKH-002', 'Hilton Suites Makkah', 'هيلتون سويتس مكة', 5, 'Makkah', 200,
      1500.00, 'SAR', true, true,
      ARRAY['Free WiFi','Halal Restaurant','Prayer Room','Qibla Direction','Zamzam Water','Kids Club','Spa'],
      true,
      '{"no_alcohol":true,"halal_food":true,"prayer_room":true,"qibla_direction":true,"zamzam_water":true,"female_only_floor":false,"no_pork":true}',
      true),

    ('HTL-MKH-003', 'Jabal Omar Hyatt Regency', 'جبل عمر حياة ريجنسي', 5, 'Makkah', 350,
      1200.00, 'SAR', false, true,
      ARRAY['Free WiFi','Multiple Restaurants','Prayer Room','Fitness Center','Business Center'],
      true,
      '{"no_alcohol":true,"halal_food":true,"prayer_room":true,"qibla_direction":true,"zamzam_water":false,"female_only_floor":false,"no_pork":true}',
      true),

    -- Makkah — 4-star
    ('HTL-MKH-004', 'Radisson Blu Makkah', 'راديسون بلو مكة', 4, 'Makkah', 600,
      750.00, 'SAR', false, true,
      ARRAY['Free WiFi','Restaurant','Prayer Room','Laundry','24h Front Desk'],
      true,
      '{"no_alcohol":true,"halal_food":true,"prayer_room":true,"qibla_direction":true,"zamzam_water":false,"female_only_floor":false,"no_pork":true}',
      true),

    ('HTL-MKH-005', 'Al Marwa Rayhaan by Rotana', 'المروة ريحان روتانا', 4, 'Makkah', 450,
      950.00, 'SAR', true, true,
      ARRAY['Free WiFi','Halal Food','Prayer Room','Airport Transfer','Tour Desk'],
      true,
      '{"no_alcohol":true,"halal_food":true,"prayer_room":true,"qibla_direction":true,"zamzam_water":true,"female_only_floor":true,"no_pork":true}',
      true),

    -- Makkah — 3-star budget
    ('HTL-MKH-006', 'Makkah Clock Royal Tower Economy', 'برج ساعة مكة اقتصادي', 3, 'Makkah', 800,
      320.00, 'SAR', false, true,
      ARRAY['Free WiFi','Prayer Room','Cafeteria'],
      true,
      '{"no_alcohol":true,"halal_food":true,"prayer_room":true,"qibla_direction":false,"zamzam_water":false,"female_only_floor":false,"no_pork":true}',
      true),

    -- Madinah — 5-star
    ('HTL-MED-001', 'Al Madinah Hilton', 'هيلتون المدينة المنورة', 5, 'Madinah', 300,
      1100.00, 'SAR', false, true,
      ARRAY['Free WiFi','Halal Restaurant','Prayer Room','Shuttle to Masjid Al-Nabawi','Spa','Gym'],
      true,
      '{"no_alcohol":true,"halal_food":true,"prayer_room":true,"qibla_direction":true,"zamzam_water":true,"female_only_floor":true,"no_pork":true}',
      true),

    ('HTL-MED-002', 'Pullman ZamZam Madinah', 'بولمان زمزم المدينة', 5, 'Madinah', 150,
      1350.00, 'SAR', true, true,
      ARRAY['Free WiFi','Multiple Restaurants','Prayer Room','Direct Masjid Access','Business Center'],
      true,
      '{"no_alcohol":true,"halal_food":true,"prayer_room":true,"qibla_direction":true,"zamzam_water":true,"female_only_floor":false,"no_pork":true}',
      true),

    -- Madinah — 4-star
    ('HTL-MED-003', 'Oberoi Madinah', 'أوبروي المدينة', 4, 'Madinah', 500,
      680.00, 'SAR', false, true,
      ARRAY['Free WiFi','Halal Food','Prayer Room','Laundry','Airport Shuttle'],
      true,
      '{"no_alcohol":true,"halal_food":true,"prayer_room":true,"qibla_direction":true,"zamzam_water":false,"female_only_floor":false,"no_pork":true}',
      true),

    -- Jeddah — 5-star (gateway city)
    ('HTL-JED-001', 'Park Hyatt Jeddah', 'بارك حياة جدة', 5, 'Jeddah', NULL,
      1050.00, 'SAR', false, false,
      ARRAY['Free WiFi','Restaurant','Pool','Gym','Beach Access','Spa'],
      true,
      '{"no_alcohol":false,"halal_food":true,"prayer_room":true,"qibla_direction":false,"zamzam_water":false,"female_only_floor":false,"no_pork":true}',
      true),

    -- Riyadh — 5-star (business hub)
    ('HTL-RUH-001', 'Nobu Hotel Riyadh', 'نوبو فندق الرياض', 5, 'Riyadh', NULL,
      1400.00, 'SAR', false, false,
      ARRAY['Free WiFi','Fine Dining','Pool','Gym','Concierge','Valet Parking'],
      true,
      '{"no_alcohol":false,"halal_food":true,"prayer_room":true,"qibla_direction":false,"zamzam_water":false,"female_only_floor":false,"no_pork":true}',
      true),

    ('HTL-RUH-002', 'Ritz-Carlton Riyadh', 'ريتز كارلتون الرياض', 5, 'Riyadh', NULL,
      1600.00, 'SAR', false, false,
      ARRAY['Free WiFi','Multiple Restaurants','Pool','Spa','Tennis Court','Business Center'],
      true,
      '{"no_alcohol":false,"halal_food":true,"prayer_room":true,"qibla_direction":false,"zamzam_water":false,"female_only_floor":false,"no_pork":true}',
      true)

    ON CONFLICT DO NOTHING
  `);
  console.log('✓ Hotel offers seeded (12 hotels: Makkah, Madinah, Jeddah, Riyadh)');

  // ── Flight Offers ─────────────────────────────────────────────────────────
  // Departures from major hubs to Jeddah (JED) and Madinah (MED)
  const flights = [
    // Riyadh (RUH) → Jeddah (JED) — domestic
    { num:'SV101', airline:'SV', origin:'RUH', dest:'JED', dep:'2026-05-01 08:00', arr:'2026-05-01 09:10', cabin:'economy',  seats:120, price:320 },
    { num:'SV103', airline:'SV', origin:'RUH', dest:'JED', dep:'2026-05-01 14:00', arr:'2026-05-01 15:10', cabin:'economy',  seats:80,  price:290 },
    { num:'SV105', airline:'SV', origin:'RUH', dest:'JED', dep:'2026-05-01 18:00', arr:'2026-05-01 19:10', cabin:'business', seats:20,  price:780 },
    // Jeddah (JED) → Madinah (MED)
    { num:'SV201', airline:'SV', origin:'JED', dest:'MED', dep:'2026-05-02 10:00', arr:'2026-05-02 11:00', cabin:'economy',  seats:100, price:250 },
    { num:'SV203', airline:'SV', origin:'JED', dest:'MED', dep:'2026-05-02 16:00', arr:'2026-05-02 17:00', cabin:'economy',  seats:60,  price:230 },
    // Dubai (DXB) → Jeddah (JED)
    { num:'EK801', airline:'EK', origin:'DXB', dest:'JED', dep:'2026-05-01 07:30', arr:'2026-05-01 09:00', cabin:'economy',  seats:150, price:480 },
    { num:'EK803', airline:'EK', origin:'DXB', dest:'JED', dep:'2026-05-01 20:00', arr:'2026-05-01 21:30', cabin:'business', seats:30,  price:1850 },
    { num:'EK805', airline:'EK', origin:'DXB', dest:'JED', dep:'2026-05-02 06:00', arr:'2026-05-02 07:30', cabin:'first',    seats:8,   price:4200 },
    // Cairo (CAI) → Jeddah (JED)
    { num:'MS701', airline:'MS', origin:'CAI', dest:'JED', dep:'2026-05-01 06:00', arr:'2026-05-01 08:30', cabin:'economy',  seats:180, price:550 },
    { num:'MS703', airline:'MS', origin:'CAI', dest:'JED', dep:'2026-05-01 22:00', arr:'2026-05-02 00:30', cabin:'economy',  seats:120, price:490 },
    // Istanbul (IST) → Jeddah (JED)
    { num:'TK501', airline:'TK', origin:'IST', dest:'JED', dep:'2026-05-01 02:00', arr:'2026-05-01 06:00', cabin:'economy',  seats:200, price:680 },
    { num:'TK503', airline:'TK', origin:'IST', dest:'JED', dep:'2026-05-01 15:00', arr:'2026-05-01 19:00', cabin:'business', seats:28,  price:2100 },
    // Kuala Lumpur (KUL) → Jeddah (JED)
    { num:'MH081', airline:'MH', origin:'KUL', dest:'JED', dep:'2026-05-01 23:00', arr:'2026-05-02 05:30', cabin:'economy',  seats:300, price:1100 },
    // London (LHR) → Jeddah (JED)
    { num:'BA253', airline:'BA', origin:'LHR', dest:'JED', dep:'2026-05-01 09:00', arr:'2026-05-01 19:30', cabin:'economy',  seats:160, price:1450 },
    { num:'BA255', airline:'BA', origin:'LHR', dest:'JED', dep:'2026-05-01 21:00', arr:'2026-05-02 07:30', cabin:'business', seats:32,  price:4800 },
    // Karachi (KHI) → Jeddah (JED)
    { num:'PK753', airline:'PK', origin:'KHI', dest:'JED', dep:'2026-05-01 04:00', arr:'2026-05-01 07:00', cabin:'economy',  seats:220, price:620 },
    // Jakarta (CGK) → Jeddah (JED)
    { num:'GA981', airline:'GA', origin:'CGK', dest:'JED', dep:'2026-05-01 22:00', arr:'2026-05-02 06:30', cabin:'economy',  seats:350, price:1350 },
    // Return flights JED → key hubs
    { num:'SV102', airline:'SV', origin:'JED', dest:'RUH', dep:'2026-05-15 10:00', arr:'2026-05-15 11:10', cabin:'economy',  seats:100, price:310 },
    { num:'EK802', airline:'EK', origin:'JED', dest:'DXB', dep:'2026-05-15 12:00', arr:'2026-05-15 13:30', cabin:'economy',  seats:140, price:470 },
    { num:'MS702', airline:'MS', origin:'JED', dest:'CAI', dep:'2026-05-15 14:00', arr:'2026-05-15 16:30', cabin:'economy',  seats:170, price:530 },
  ];

  for (const f of flights) {
    await client.query(`
      INSERT INTO flight_offers (flight_num, airline_code, origin, dest, departure, arrival, cabin_class, seats_available, price, currency, is_active)
      VALUES ($1,$2,$3,$4,$5::timestamptz,$6::timestamptz,$7::cabin_class,$8,$9,'SAR',true)
      ON CONFLICT DO NOTHING
    `, [f.num, f.airline, f.origin, f.dest, f.dep, f.arr, f.cabin, f.seats, f.price]);
  }
  console.log(`✓ Flight offers seeded (${flights.length} flights across 8 routes)`);

  // ── Car Offers ────────────────────────────────────────────────────────────
  await client.query(`
    INSERT INTO car_offers (
      vendor_id, vendor_name, vehicle_type, model, seats, transmission,
      pickup_location, dropoff_location, available_from, available_to,
      price_per_day, currency, features, is_active
    ) VALUES
    -- Makkah
    ('VND-BDG-001','Budget Saudi Arabia','economy','Toyota Yaris',5,'automatic',
      'Makkah — Al Haram District','Makkah — Al Haram District',
      '2026-04-01','2026-12-31', 120.00,'SAR',
      ARRAY['GPS','Full Insurance','Free Cancellation 24h'],'true'),

    ('VND-BDG-002','Budget Saudi Arabia','suv','Toyota Land Cruiser',7,'automatic',
      'Makkah — Al Haram District','Makkah — King Abdulaziz Airport',
      '2026-04-01','2026-12-31', 350.00,'SAR',
      ARRAY['GPS','Full Insurance','Child Seat','7 Seats','4WD'],'true'),

    ('VND-HRZ-001','Hertz Saudi Arabia','compact','Hyundai Elantra',5,'automatic',
      'Makkah — Al Aziziyah','Jeddah — King Abdulaziz Airport',
      '2026-04-01','2026-12-31', 160.00,'SAR',
      ARRAY['GPS','Unlimited Mileage','Roadside Assistance'],'true'),

    ('VND-HRZ-002','Hertz Saudi Arabia','van','Toyota HiAce',12,'manual',
      'Makkah — Al Haram District','Makkah — Al Haram District',
      '2026-04-01','2026-12-31', 480.00,'SAR',
      ARRAY['GPS','12 Seats','Full Insurance','Group Transfer'],'true'),

    ('VND-LOC-001','Al Haramain Car Rental','luxury','Mercedes E-Class',5,'automatic',
      'Makkah — 5-Star Hotel Zone','Makkah — 5-Star Hotel Zone',
      '2026-04-01','2026-12-31', 650.00,'SAR',
      ARRAY['Chauffeur Option','Meet & Greet','Full Insurance','WiFi Hotspot'],'true'),

    ('VND-LOC-002','Al Haramain Car Rental','minibus','Mercedes Sprinter',16,'manual',
      'Makkah — Al Haram District','Madinah — Masjid Al-Nabawi',
      '2026-04-01','2026-12-31', 800.00,'SAR',
      ARRAY['16 Seats','Air Conditioned','Intercity Transfer','Prayer Mats'],'true'),

    -- Madinah
    ('VND-BDG-003','Budget Saudi Arabia','economy','Toyota Corolla',5,'automatic',
      'Madinah — Masjid Al-Nabawi Zone','Madinah — Prince Mohammad Airport',
      '2026-04-01','2026-12-31', 130.00,'SAR',
      ARRAY['GPS','Full Insurance','Unlimited Mileage'],'true'),

    ('VND-HRZ-003','Hertz Saudi Arabia','suv','Nissan Patrol',7,'automatic',
      'Madinah — City Centre','Jeddah — King Abdulaziz Airport',
      '2026-04-01','2026-12-31', 380.00,'SAR',
      ARRAY['GPS','7 Seats','4WD','Roof Rack','Child Seat'],'true'),

    -- Jeddah
    ('VND-BDG-004','Budget Saudi Arabia','economy','Honda Civic',5,'automatic',
      'Jeddah — King Abdulaziz Airport','Jeddah — King Abdulaziz Airport',
      '2026-04-01','2026-12-31', 110.00,'SAR',
      ARRAY['GPS','Free Cancellation 24h','Full Insurance'],'true'),

    ('VND-ENT-001','Enterprise Jeddah','compact','Kia Cerato',5,'automatic',
      'Jeddah — King Abdulaziz Airport','Makkah — Al Haram District',
      '2026-04-01','2026-12-31', 150.00,'SAR',
      ARRAY['GPS','Airport Pickup','Unlimited Mileage'],'true'),

    -- Riyadh
    ('VND-BDG-005','Budget Saudi Arabia','suv','Toyota Fortuner',7,'automatic',
      'Riyadh — King Khalid Airport','Riyadh — King Khalid Airport',
      '2026-04-01','2026-12-31', 280.00,'SAR',
      ARRAY['GPS','7 Seats','Child Seat','Roadside Assistance'],'true'),

    ('VND-ENT-002','Enterprise Riyadh','luxury','BMW 5 Series',5,'automatic',
      'Riyadh — King Khalid Airport','Riyadh — King Khalid Airport',
      '2026-04-01','2026-12-31', 720.00,'SAR',
      ARRAY['Chauffeur Option','WiFi','Full Insurance','Premium Sound'],'true')

    ON CONFLICT DO NOTHING
  `);
  console.log('✓ Car offers seeded (12 vehicles across Makkah, Madinah, Jeddah, Riyadh)');

  await client.end();
  console.log('\nSeed complete.');
  console.log('  Admin: admin@utubooking.com / Admin@123456');
  console.log('  User:  test@utubooking.com  / User@123456');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
