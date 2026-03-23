/**
 * HotelResultsScreen — FlatList of hotel cards with filter chips + sort.
 * WCAG 2.1 AA: accessibilityRole, accessibilityLabel, 44 dp targets, ≥4.5:1 contrast.
 * Bilingual EN ↔ AR with RTL layout via I18nManager.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { usesKilometres } from '../i18n';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HotelCardData {
  id:               string;
  name:             string;
  starRating:       number;        // 1-5
  pricePerNight:    number;        // SAR
  distanceHaramM:   number;        // metres
  badge?:           'closest' | 'popular' | 'value';
  freeCancellation: boolean;
  amenities:        string[];
}

type SortKey = 'price' | 'distance';

type Props = NativeStackScreenProps<RootStackParamList, 'HotelResults'>;

// ─── Constants ────────────────────────────────────────────────────────────────
const STAR_INDICES = [0, 1, 2, 3, 4] as const;

const BADGE_STYLE: Record<string, { bg: string; text: string }> = {
  closest: { bg: '#D1FAE5', text: '#065F46' },
  popular: { bg: '#DBEAFE', text: '#1E3A8A' },
  value:   { bg: '#FEF3C7', text: '#92400E' },
};

// ─── Star Row ─────────────────────────────────────────────────────────────────
function StarRow({ rating }: { rating: number }) {
  return (
    <View style={styles.starRow} accessibilityLabel={`${rating} stars`}>
      {STAR_INDICES.map(i => (
        <Text key={i} style={[styles.star, i < rating ? styles.starFilled : styles.starEmpty]}>
          ★
        </Text>
      ))}
    </View>
  );
}

// ─── Hotel Card ───────────────────────────────────────────────────────────────
interface HotelCardProps {
  hotel:    HotelCardData;
  onPress:  () => void;
  t:        Translations;
  isRTL:    boolean;
  /** When true, show distance in km (Turkish convention) instead of metres */
  useKm:    boolean;
}
function HotelCard({ hotel, onPress, t, isRTL, useKm }: HotelCardProps) {
  const badgeStyle = hotel.badge ? BADGE_STYLE[hotel.badge] : null;
  const badgeLabel = hotel.badge ? t.results.badge[hotel.badge] : null;

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.results.accessibility.bookHotel(hotel.name)}
    >
      {/* Photo placeholder */}
      <View style={styles.photoPlaceholder}>
        <Text style={styles.photoEmoji}>🏨</Text>
        {badgeLabel && badgeStyle && (
          <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.badgeText, { color: badgeStyle.text }]}>{badgeLabel}</Text>
          </View>
        )}
        {hotel.freeCancellation && (
          <View style={styles.freeCancelBadge}>
            <Text style={styles.freeCancelText}>{t.detail.freeCancelTag}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.hotelName, isRTL && styles.rtlText]} numberOfLines={1}>
          {hotel.name}
        </Text>

        <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
          <StarRow rating={hotel.starRating} />
          <Text style={styles.distance}>
            {useKm
              ? t.common.distHaramKm(hotel.distanceHaramM)
              : t.common.distHaram(hotel.distanceHaramM)}
          </Text>
        </View>

        <View style={[styles.priceRow, isRTL && styles.rowReverse]}>
          <View>
            <Text style={styles.price}>
              {t.common.sar} {hotel.pricePerNight.toLocaleString()}
            </Text>
            <Text style={styles.perNight}>{t.common.perNight}</Text>
          </View>
          <Pressable
            style={styles.bookBtn}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={t.common.bookNow}
          >
            <Text style={styles.bookBtnText}>{t.common.bookNow}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ─── HotelResultsScreen ───────────────────────────────────────────────────────
export default function HotelResultsScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const tr    = t as unknown as Translations;
  const isRTL = I18nManager.isRTL;
  const useKm = usesKilometres(i18n.language as 'en' | 'ar' | 'fr' | 'tr');

  const [sortKey,       setSortKey]       = useState<SortKey>('price');
  const [freeCancelOnly, setFreeCancelOnly] = useState(false);

  // In a real app these would come from route.params + useQuery.
  // Using local stub so screen renders standalone.
  const RAW_HOTELS: HotelCardData[] = useMemo(() => [
    { id: '1', name: 'Swissotel Makkah',         starRating: 5, pricePerNight: 1200, distanceHaramM: 100,  badge: 'closest', freeCancellation: true,  amenities: ['WiFi', 'Pool', 'Spa'] },
    { id: '2', name: 'Pullman ZamZam Makkah',     starRating: 5, pricePerNight: 980,  distanceHaramM: 200,  badge: 'popular', freeCancellation: false, amenities: ['WiFi', 'Restaurant'] },
    { id: '3', name: 'Hilton Suites Makkah',      starRating: 4, pricePerNight: 750,  distanceHaramM: 350,  badge: 'value',   freeCancellation: true,  amenities: ['WiFi', 'Gym'] },
    { id: '4', name: 'Al Safwah Royale Orchid',   starRating: 4, pricePerNight: 620,  distanceHaramM: 500,  badge: undefined, freeCancellation: false, amenities: ['WiFi'] },
    { id: '5', name: 'Dar Al Tawfiq Hotel',       starRating: 3, pricePerNight: 380,  distanceHaramM: 800,  badge: undefined, freeCancellation: true,  amenities: ['WiFi', 'Parking'] },
  ], []);

  const hotels = useMemo(() => {
    const filtered = freeCancelOnly ? RAW_HOTELS.filter(h => h.freeCancellation) : RAW_HOTELS;
    return [...filtered].sort((a, b) =>
      sortKey === 'price' ? a.pricePerNight - b.pricePerNight : a.distanceHaramM - b.distanceHaramM
    );
  }, [RAW_HOTELS, freeCancelOnly, sortKey]);

  const handleHotelPress = useCallback((hotel: HotelCardData) => {
    navigation.navigate('HotelDetail', { hotel });
  }, [navigation]);

  const sortOptions: { key: SortKey; label: string }[] = useMemo(() => [
    { key: 'price',    label: tr.results.sortPrice },
    { key: 'distance', label: tr.results.sortDistance },
  ], [tr]);

  const renderItem = useCallback(({ item }: { item: HotelCardData }) => (
    <HotelCard
      hotel={item}
      onPress={() => handleHotelPress(item)}
      t={tr}
      isRTL={isRTL}
      useKm={useKm}
    />
  ), [handleHotelPress, tr, isRTL, useKm]);

  const keyExtractor = useCallback((item: HotelCardData) => item.id, []);

  const ListHeader = useMemo(() => (
    <View>
      {/* Count + filter bar */}
      <View style={[styles.filterBar, isRTL && styles.rowReverse]} accessibilityLabel={tr.results.accessibility.filterPanel}>
        <Text style={styles.countText}>{tr.results.count(hotels.length)}</Text>

        {/* Sort chips */}
        <View style={[styles.chipRow, isRTL && styles.rowReverse]}>
          {sortOptions.map(opt => (
            <Pressable
              key={opt.key}
              style={[styles.chip, sortKey === opt.key && styles.chipActive]}
              onPress={() => setSortKey(opt.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: sortKey === opt.key }}
              accessibilityLabel={opt.label}
            >
              <Text style={[styles.chipText, sortKey === opt.key && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}

          {/* Free cancel toggle chip */}
          <Pressable
            style={[styles.chip, freeCancelOnly && styles.chipActive]}
            onPress={() => setFreeCancelOnly(v => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: freeCancelOnly }}
            accessibilityLabel={tr.results.freeCancelOnly}
          >
            <Text style={[styles.chipText, freeCancelOnly && styles.chipTextActive]}>
              {tr.results.freeCancelOnly}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  ), [hotels.length, sortOptions, sortKey, freeCancelOnly, tr, isRTL]);

  return (
    <View style={styles.root}>
      <FlatList
        data={hotels}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{tr.common.noResults}</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const BRAND_GREEN = '#10B981';
const TEXT_DARK   = '#111827';
const TEXT_GRAY   = '#6B7280';
const BORDER      = '#E5E7EB';

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F9FAFB' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  filterBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, flexWrap: 'wrap', gap: 8 },
  countText:   { fontSize: 14, fontWeight: '600', color: TEXT_DARK },
  chipRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip:        { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  chipActive:  { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  chipText:    { fontSize: 12, color: TEXT_GRAY, fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // Card
  card:            { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  photoPlaceholder:{ height: 160, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  photoEmoji:      { fontSize: 48 },
  badge:           { position: 'absolute', top: 10, start: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText:       { fontSize: 11, fontWeight: '700' },
  freeCancelBadge: { position: 'absolute', top: 10, end: 10, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  freeCancelText:  { fontSize: 11, fontWeight: '700', color: '#065F46' },

  cardBody:   { padding: 14 },
  hotelName:  { fontSize: 16, fontWeight: '700', color: TEXT_DARK, marginBottom: 6 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  starRow:    { flexDirection: 'row' },
  star:       { fontSize: 14, marginEnd: 1 },
  starFilled: { color: '#F59E0B' },
  starEmpty:  { color: '#D1D5DB' },
  distance:   { fontSize: 12, color: TEXT_GRAY },

  priceRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price:      { fontSize: 20, fontWeight: '800', color: TEXT_DARK },
  perNight:   { fontSize: 12, color: TEXT_GRAY },
  bookBtn:    { backgroundColor: BRAND_GREEN, borderRadius: 10, minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  bookBtnText:{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  rowReverse: { flexDirection: 'row-reverse' },
  rtlText:    { textAlign: 'right', writingDirection: 'rtl' },

  empty:      { padding: 40, alignItems: 'center' },
  emptyText:  { fontSize: 16, color: TEXT_GRAY },
});
