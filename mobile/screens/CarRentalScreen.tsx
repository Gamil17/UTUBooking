/**
 * CarRentalScreen — CarTrawler car rental results list.
 * WCAG 2.1 AA: accessibilityRole, accessibilityLabel, 44 dp targets, ≥4.5:1 contrast.
 * Bilingual EN ↔ AR with RTL layout mirroring via I18nManager.
 *
 * Receives route params: { pickupCity, pickupDate, dropoffDate, transmission? }
 * Fetches from GET /api/v1/cars/search — shows make/model/category/price/day.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Translations } from '../i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CarOffer {
  id:               string;
  make:             string;        // e.g. "Toyota"
  model:            string;        // e.g. "Camry"
  category:         'economy' | 'midsize' | 'suv' | 'luxury' | 'minivan';
  transmission:     'automatic' | 'manual';
  seats:            number;
  doors:            number;
  pricePerDay:      number;        // SAR
  totalPrice:       number;
  rentalDays:       number;
  currency:         string;
  pickupLocation:   string;
  dropoffLocation:  string;
  includesInsurance:boolean;
  freeCancellation: boolean;
  supplier:         string;        // e.g. "Budget", "Hertz", "Sixt"
  imageEmoji?:      string;        // fallback emoji when no image
}

type CategoryFilter = 'all' | 'economy' | 'midsize' | 'suv' | 'luxury' | 'minivan';

type Props = NativeStackScreenProps<RootStackParamList, 'CarRental'>;

// ─── Colours ─────────────────────────────────────────────────────────────────

const BRAND_GREEN = '#10B981';
const TEXT_DARK   = '#111827';
const TEXT_GRAY   = '#6B7280';
const BORDER      = '#E5E7EB';

// Category → emoji
const CATEGORY_EMOJI: Record<CarOffer['category'], string> = {
  economy:  '🚗',
  midsize:  '🚙',
  suv:      '🚐',
  luxury:   '🏎️',
  minivan:  '🚌',
};

// ─── Car Card ─────────────────────────────────────────────────────────────────

interface CarCardProps {
  car:     CarOffer;
  t:       Translations;
  isRTL:   boolean;
  onPress: () => void;
}

function CarCard({ car, t, isRTL, onPress }: CarCardProps) {
  const emoji = car.imageEmoji ?? CATEGORY_EMOJI[car.category];

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.cars.accessibility.carCard(car.make, car.model)}
    >
      {/* Header: image placeholder + name */}
      <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
        <View style={styles.carEmoji}>
          <Text style={{ fontSize: 36 }}>{emoji}</Text>
        </View>

        <View style={styles.flex1}>
          <Text style={[styles.carName, isRTL && styles.rtlText]} numberOfLines={1}>
            {car.make} {car.model}
          </Text>
          {/* @ts-expect-error dynamic key */}
          <Text style={[styles.categoryLabel, isRTL && styles.rtlText]}>
            {t.cars.category[car.category]}
          </Text>
          <Text style={[styles.supplier, isRTL && styles.rtlText]}>{car.supplier}</Text>
        </View>

        {/* Transmission badge */}
        <View style={styles.transmissionBadge}>
          {/* @ts-expect-error dynamic key */}
          <Text style={styles.transmissionText}>{t.cars.transmission[car.transmission]}</Text>
        </View>
      </View>

      {/* Specs row */}
      <View style={[styles.specsRow, isRTL && styles.rowReverse]}>
        <Text style={styles.spec}>🪑 {t.cars.seats(car.seats)}</Text>
        <Text style={styles.spec}>🚪 {t.cars.doors(car.doors)}</Text>
        {car.includesInsurance && (
          <Text style={styles.spec}>🛡️ {t.cars.includesInsurance}</Text>
        )}
        {car.freeCancellation && (
          <Text style={styles.spec}>✅ {t.cars.freeCancellation}</Text>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Price + CTA */}
      <View style={[styles.priceRow, isRTL && styles.rowReverse]}>
        <View>
          <Text style={styles.price}>
            {t.common.sar} {car.pricePerDay.toLocaleString()}
            <Text style={styles.perDay}> {t.cars.perDay}</Text>
          </Text>
          <Text style={styles.totalPrice}>
            {t.common.sar} {car.totalPrice.toLocaleString()} · {car.rentalDays}d total
          </Text>
        </View>

        <Pressable
          style={styles.bookBtn}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t.cars.bookCar}
        >
          <Text style={styles.bookBtnText}>{t.cars.bookCar}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── CarRentalScreen ──────────────────────────────────────────────────────────

export default function CarRentalScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const tr    = t as unknown as Translations;
  const isRTL = I18nManager.isRTL;

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Stub data — replace with useQuery call to /api/v1/cars/search
  const RAW_CARS: CarOffer[] = useMemo(() => [
    {
      id: 'c1', make: 'Toyota', model: 'Corolla', category: 'economy', transmission: 'automatic',
      seats: 5, doors: 4, pricePerDay: 120, totalPrice: 360, rentalDays: 3,
      currency: 'SAR', pickupLocation: 'JED Airport', dropoffLocation: 'JED Airport',
      includesInsurance: true, freeCancellation: true, supplier: 'Budget', imageEmoji: '🚗',
    },
    {
      id: 'c2', make: 'Toyota', model: 'Camry', category: 'midsize', transmission: 'automatic',
      seats: 5, doors: 4, pricePerDay: 180, totalPrice: 540, rentalDays: 3,
      currency: 'SAR', pickupLocation: 'JED Airport', dropoffLocation: 'JED Airport',
      includesInsurance: true, freeCancellation: false, supplier: 'Hertz',
    },
    {
      id: 'c3', make: 'Toyota', model: 'Land Cruiser', category: 'suv', transmission: 'automatic',
      seats: 7, doors: 5, pricePerDay: 350, totalPrice: 1050, rentalDays: 3,
      currency: 'SAR', pickupLocation: 'JED Airport', dropoffLocation: 'JED Airport',
      includesInsurance: true, freeCancellation: true, supplier: 'Sixt', imageEmoji: '🚐',
    },
    {
      id: 'c4', make: 'Mercedes', model: 'E-Class', category: 'luxury', transmission: 'automatic',
      seats: 5, doors: 4, pricePerDay: 600, totalPrice: 1800, rentalDays: 3,
      currency: 'SAR', pickupLocation: 'JED Airport', dropoffLocation: 'JED Airport',
      includesInsurance: true, freeCancellation: true, supplier: 'Avis', imageEmoji: '🏎️',
    },
    {
      id: 'c5', make: 'Hyundai', model: 'Staria', category: 'minivan', transmission: 'automatic',
      seats: 8, doors: 5, pricePerDay: 280, totalPrice: 840, rentalDays: 3,
      currency: 'SAR', pickupLocation: 'JED Airport', dropoffLocation: 'JED Airport',
      includesInsurance: true, freeCancellation: true, supplier: 'Enterprise', imageEmoji: '🚌',
    },
  ], []);

  const cars = useMemo(() => {
    const filtered = categoryFilter === 'all'
      ? RAW_CARS
      : RAW_CARS.filter(c => c.category === categoryFilter);
    return [...filtered].sort((a, b) => a.pricePerDay - b.pricePerDay);
  }, [RAW_CARS, categoryFilter]);

  const categories: { key: CategoryFilter; label: string }[] = useMemo(() => [
    { key: 'all',      label: '🚗 All' },
    { key: 'economy',  label: tr.cars.category.economy },
    { key: 'midsize',  label: tr.cars.category.midsize },
    { key: 'suv',      label: tr.cars.category.suv },
    { key: 'luxury',   label: tr.cars.category.luxury },
    { key: 'minivan',  label: tr.cars.category.minivan },
  ], [tr]);

  const renderItem = useCallback(({ item }: { item: CarOffer }) => (
    <CarCard
      car={item}
      t={tr}
      isRTL={isRTL}
      onPress={() => {
        // Navigate to booking flow with car offer
        // navigation.navigate('BookingFlow', { car: item });
      }}
    />
  ), [tr, isRTL]);

  const ListHeader = useMemo(() => (
    <View>
      <View style={[styles.filterBar, isRTL && styles.rowReverse]}>
        <Text style={styles.countText}>{tr.cars.count(cars.length)}</Text>
      </View>

      {/* Category chips */}
      <View style={[styles.categoryRow, isRTL && styles.rowReverse]}>
        {categories.map(cat => (
          <Pressable
            key={cat.key}
            style={[styles.chip, categoryFilter === cat.key && styles.chipActive]}
            onPress={() => setCategoryFilter(cat.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: categoryFilter === cat.key }}
            accessibilityLabel={cat.label}
          >
            <Text style={[styles.chipText, categoryFilter === cat.key && styles.chipTextActive]}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  ), [cars.length, categories, categoryFilter, tr, isRTL]);

  return (
    <View style={styles.root}>
      <FlatList
        data={cars}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={styles.emptyText}>{tr.common.noResults}</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F9FAFB' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  filterBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  countText:   { fontSize: 14, fontWeight: '600', color: TEXT_DARK },

  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 12 },
  chip:        { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  chipActive:  { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  chipText:    { fontSize: 12, color: TEXT_GRAY, fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // Card
  card:        { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },

  cardHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  carEmoji:    { width: 56, height: 56, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  flex1:       { flex: 1 },
  carName:     { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  categoryLabel:{ fontSize: 13, color: TEXT_GRAY, fontWeight: '500' },
  supplier:    { fontSize: 11, color: TEXT_GRAY },

  transmissionBadge:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#EFF6FF', alignSelf: 'flex-start' },
  transmissionText: { fontSize: 11, fontWeight: '700', color: '#1E40AF' },

  specsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  spec:        { fontSize: 12, color: TEXT_GRAY },

  divider:     { height: 1, backgroundColor: BORDER, marginBottom: 12 },

  priceRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price:       { fontSize: 20, fontWeight: '800', color: TEXT_DARK },
  perDay:      { fontSize: 13, fontWeight: '400', color: TEXT_GRAY },
  totalPrice:  { fontSize: 12, color: TEXT_GRAY, marginTop: 2 },
  bookBtn:     { backgroundColor: BRAND_GREEN, borderRadius: 10, minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  bookBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  rowReverse:  { flexDirection: 'row-reverse' },
  rtlText:     { textAlign: 'right', writingDirection: 'rtl' },

  empty:       { padding: 48, alignItems: 'center' },
  emptyEmoji:  { fontSize: 52, marginBottom: 16 },
  emptyText:   { fontSize: 16, color: TEXT_GRAY, textAlign: 'center' },
});
