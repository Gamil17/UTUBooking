/**
 * HotelDetailScreen — Photo gallery, amenity grid, price breakdown, sticky Book Now.
 * WCAG 2.1 AA: roles, labels, 44 dp targets, high contrast.
 * Bilingual EN ↔ AR with RTL layout mirroring.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  I18nManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Translations } from '../i18n';
import type { HotelCardData } from './HotelResultsScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'HotelDetail'>;

// ─── Constants ────────────────────────────────────────────────────────────────
const NIGHTS      = 3;
const VAT_RATE    = 0.15;
const STAR_INDICES = [0, 1, 2, 3, 4] as const;
const PHOTO_EMOJIS = ['🏨', '🛏️', '🍽️', '🏊', '🌙'] as const;

const AMENITY_ICONS: Record<string, string> = {
  WiFi:       '📶',
  Pool:       '🏊',
  Spa:        '💆',
  Gym:        '🏋️',
  Restaurant: '🍽️',
  Parking:    '🅿️',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StarRow({ rating }: { rating: number }) {
  return (
    <View style={styles.starRow} accessibilityLabel={`${rating} stars`}>
      {STAR_INDICES.map(i => (
        <Text key={i} style={[styles.star, i < rating ? styles.starFilled : styles.starEmpty]}>★</Text>
      ))}
    </View>
  );
}

interface PhotoGalleryProps {
  label: string;
}
function PhotoGallery({ label }: PhotoGalleryProps) {
  const [active, setActive] = useState(0);

  return (
    <View accessibilityLabel={label} accessibilityRole="image">
      {/* Main photo */}
      <View style={styles.mainPhoto}>
        <Text style={styles.mainPhotoEmoji}>{PHOTO_EMOJIS[active]}</Text>
      </View>
      {/* Thumbnail strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbStrip} contentContainerStyle={styles.thumbContent}>
        {PHOTO_EMOJIS.map((emoji, i) => (
          <Pressable
            key={i}
            style={[styles.thumb, active === i && styles.thumbActive]}
            onPress={() => setActive(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: active === i }}
            accessibilityLabel={`Photo ${i + 1}`}
          >
            <Text style={styles.thumbEmoji}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

interface AmenityGridProps {
  amenities: string[];
  heading:   string;
}
function AmenityGrid({ amenities, heading }: AmenityGridProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      <View style={styles.amenityGrid}>
        {amenities.map(name => (
          <View key={name} style={styles.amenityItem}>
            <Text style={styles.amenityIcon}>{AMENITY_ICONS[name] ?? '✅'}</Text>
            <Text style={styles.amenityLabel}>{name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface PriceRowProps {
  label:  string;
  value:  string;
  bold?:  boolean;
  color?: string;
}
function PriceRow({ label, value, bold, color }: PriceRowProps) {
  const textStyle = [styles.priceRowText, bold && styles.bold, color ? { color } : undefined];
  return (
    <View style={styles.priceRow}>
      <Text style={textStyle}>{label}</Text>
      <Text style={textStyle}>{value}</Text>
    </View>
  );
}

// ─── HotelDetailScreen ────────────────────────────────────────────────────────
export default function HotelDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const tr    = t as unknown as Translations;
  const isRTL = I18nManager.isRTL;

  const hotel: HotelCardData = route.params?.hotel ?? {
    id: 'preview', name: 'Swissotel Makkah', starRating: 5,
    pricePerNight: 1200, distanceHaramM: 100, badge: 'closest',
    freeCancellation: true, amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Gym'],
  };

  const subtotal = hotel.pricePerNight * NIGHTS;
  const vat      = Math.round(subtotal * VAT_RATE);
  const total    = subtotal + vat;

  const handleBook = useCallback(() => {
    navigation.navigate('BookingFlow', { hotel, nights: NIGHTS, total });
  }, [navigation, hotel, total]);

  const sections = useMemo(() => [
    { id: 'about', label: tr.detail.about },
    { id: 'amenities', label: tr.detail.amenities },
    { id: 'location', label: tr.detail.location },
  ], [tr]);

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Photo gallery */}
        <PhotoGallery label={tr.detail.photos} />

        {/* Hotel header */}
        <View style={styles.header}>
          <View style={[styles.headerTop, isRTL && styles.rowReverse]}>
            <View style={styles.flex1}>
              <Text style={[styles.hotelName, isRTL && styles.rtlText]}>{hotel.name}</Text>
              <StarRow rating={hotel.starRating} />
            </View>
            <View style={styles.distanceBox}>
              <Text style={styles.distanceText}>{tr.common.distHaram(hotel.distanceHaramM)}</Text>
              {hotel.freeCancellation && (
                <View style={styles.freeCancelBadge}>
                  <Text style={styles.freeCancelText}>{tr.detail.freeCancelTag}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>{tr.detail.about}</Text>
          <Text style={[styles.aboutText, isRTL && styles.rtlText]}>
            {hotel.name} {isRTL ? 'يقع على بُعد' : 'is located just'} {hotel.distanceHaramM}
            {isRTL ? ' م من الحرم المكي الشريف، ويوفر إقامة فاخرة للحجاج والمعتمرين.' : ' m from the Grand Mosque, offering premium accommodation for Hajj and Umrah pilgrims.'}
          </Text>
        </View>

        {/* Amenities */}
        <AmenityGrid amenities={hotel.amenities} heading={tr.detail.amenities} />

        {/* Check-in/out info */}
        <View style={styles.section}>
          <View style={[styles.checkInRow, isRTL && styles.rowReverse]}>
            <View style={styles.flex1}>
              <Text style={styles.checkLabel}>{tr.detail.checkIn}</Text>
              <Text style={styles.checkValue}>14:00</Text>
            </View>
            <View style={styles.checkDivider} />
            <View style={styles.flex1}>
              <Text style={styles.checkLabel}>{tr.detail.checkOut}</Text>
              <Text style={styles.checkValue}>12:00</Text>
            </View>
          </View>
        </View>

        {/* Price breakdown */}
        <View style={[styles.section, styles.priceCard]}>
          <Text style={styles.sectionHeading}>{tr.detail.priceBreakdown}</Text>
          <PriceRow
            label={tr.detail.ratePerNight}
            value={`${tr.common.sar} ${hotel.pricePerNight.toLocaleString()}`}
          />
          <PriceRow
            label={tr.detail.totalNights}
            value={tr.common.nights(NIGHTS)}
          />
          <View style={styles.priceDivider} />
          <PriceRow
            label={tr.detail.subtotal}
            value={`${tr.common.sar} ${subtotal.toLocaleString()}`}
          />
          <PriceRow
            label={tr.detail.vat}
            value={`${tr.common.sar} ${vat.toLocaleString()}`}
            color="#6B7280"
          />
          <View style={styles.priceDivider} />
          <PriceRow
            label={tr.detail.total}
            value={`${tr.common.sar} ${total.toLocaleString()}`}
            bold
            color="#10B981"
          />
        </View>

        {/* Spacer so content clears sticky button */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Sticky Book Now */}
      <View style={styles.stickyBar}>
        <Pressable
          style={styles.bookBtn}
          onPress={handleBook}
          accessibilityRole="button"
          accessibilityLabel={tr.detail.bookSticky(total)}
        >
          <Text style={styles.bookBtnText}>{tr.detail.bookSticky(total)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const BRAND_GREEN = '#10B981';
const TEXT_DARK   = '#111827';
const TEXT_GRAY   = '#6B7280';
const BORDER      = '#E5E7EB';

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F9FAFB' },
  scroll:       { flex: 1 },
  scrollContent:{ paddingBottom: 16 },

  // Gallery
  mainPhoto:    { height: 240, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  mainPhotoEmoji: { fontSize: 72 },
  thumbStrip:   { backgroundColor: '#F3F4F6' },
  thumbContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  thumb:        { width: 56, height: 56, borderRadius: 8, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  thumbActive:  { borderColor: BRAND_GREEN },
  thumbEmoji:   { fontSize: 26 },

  // Header
  header:      { padding: 16, backgroundColor: '#FFFFFF', marginBottom: 8 },
  headerTop:   { flexDirection: 'row', alignItems: 'flex-start' },
  flex1:       { flex: 1 },
  hotelName:   { fontSize: 20, fontWeight: '800', color: TEXT_DARK, marginBottom: 6 },
  starRow:     { flexDirection: 'row' },
  star:        { fontSize: 16, marginEnd: 2 },
  starFilled:  { color: '#F59E0B' },
  starEmpty:   { color: '#D1D5DB' },
  distanceBox: { alignItems: 'flex-end', gap: 6 },
  distanceText:{ fontSize: 12, color: TEXT_GRAY },
  freeCancelBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  freeCancelText:  { fontSize: 11, fontWeight: '700', color: '#065F46' },

  // Sections
  section:        { backgroundColor: '#FFFFFF', marginBottom: 8, padding: 16 },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, marginBottom: 12 },
  aboutText:      { fontSize: 14, color: TEXT_GRAY, lineHeight: 22 },

  // Amenities
  amenityGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityItem:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44 },
  amenityIcon:  { fontSize: 18 },
  amenityLabel: { fontSize: 13, color: TEXT_DARK, fontWeight: '500' },

  // Check-in/out
  checkInRow:  { flexDirection: 'row', alignItems: 'center' },
  checkLabel:  { fontSize: 12, color: TEXT_GRAY, marginBottom: 4 },
  checkValue:  { fontSize: 18, fontWeight: '700', color: TEXT_DARK },
  checkDivider:{ width: 1, height: 40, backgroundColor: BORDER, marginHorizontal: 16 },

  // Price breakdown
  priceCard:   { borderWidth: 1, borderColor: '#D1FAE5', borderRadius: 12, marginHorizontal: 16 },
  priceRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceRowText:{ fontSize: 14, color: TEXT_DARK },
  bold:        { fontWeight: '700' },
  priceDivider:{ height: 1, backgroundColor: BORDER, marginVertical: 8 },

  rowReverse:  { flexDirection: 'row-reverse' },
  rtlText:     { textAlign: 'right', writingDirection: 'rtl' },

  // Sticky bar
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: BORDER },
  bookBtn:   { backgroundColor: BRAND_GREEN, borderRadius: 14, minHeight: 54, justifyContent: 'center', alignItems: 'center' },
  bookBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});
