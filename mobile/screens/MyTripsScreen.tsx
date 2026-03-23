/**
 * MyTripsScreen — Upcoming / Past tabs with booking cards and status badges.
 * WCAG 2.1 AA: roles, labels, states, 44 dp targets, high contrast.
 * Bilingual EN ↔ AR with RTL layout mirroring.
 */
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Translations } from '../i18n';

// ─── Types ────────────────────────────────────────────────────────────────────
type TripStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';
type TripTab    = 'upcoming' | 'past';

interface Trip {
  id:          string;
  hotelName:   string;
  destination: string;
  checkIn:     string;
  checkOut:    string;
  nights:      number;
  guests:      number;
  totalSAR:    number;
  status:      TripStatus;
  bookingRef:  string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<TripStatus, { bg: string; text: string }> = {
  confirmed: { bg: '#D1FAE5', text: '#065F46' },
  pending:   { bg: '#FEF3C7', text: '#92400E' },
  completed: { bg: '#E5E7EB', text: '#374151' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

// ─── Stub data ────────────────────────────────────────────────────────────────
const STUB_TRIPS: Trip[] = [
  {
    id: '1', hotelName: 'Swissotel Makkah',       destination: 'Makkah',  checkIn: '2026-04-10', checkOut: '2026-04-13', nights: 3, guests: 2, totalSAR: 4140, status: 'confirmed', bookingRef: 'UTU-A8K2P',
  },
  {
    id: '2', hotelName: 'Pullman ZamZam Makkah',  destination: 'Makkah',  checkIn: '2026-06-01', checkOut: '2026-06-05', nights: 4, guests: 3, totalSAR: 4508, status: 'pending',   bookingRef: 'UTU-B9L3Q',
  },
  {
    id: '3', hotelName: 'Hilton Suites Makkah',   destination: 'Makkah',  checkIn: '2025-12-20', checkOut: '2025-12-24', nights: 4, guests: 2, totalSAR: 3450, status: 'completed', bookingRef: 'UTU-C1M4R',
  },
  {
    id: '4', hotelName: 'Al Safwah Royale Orchid', destination: 'Makkah', checkIn: '2025-10-05', checkOut: '2025-10-07', nights: 2, guests: 2, totalSAR: 1426, status: 'cancelled', bookingRef: 'UTU-D2N5S',
  },
];

const UPCOMING_STATUSES: TripStatus[] = ['confirmed', 'pending'];

// ─── Trip Card ────────────────────────────────────────────────────────────────
interface TripCardProps {
  trip:    Trip;
  t:       Translations;
  isRTL:   boolean;
  onView:  () => void;
  onCancel?: () => void;
}
function TripCard({ trip, t, isRTL, onView, onCancel }: TripCardProps) {
  const statusStyle = STATUS_STYLE[trip.status];
  const statusLabel = t.trips.status[trip.status];

  return (
    <View
      style={styles.card}
      accessibilityRole="article"
      accessibilityLabel={`${trip.hotelName}, ${statusLabel}`}
    >
      {/* Card header: name + status */}
      <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
        <View style={styles.flex1}>
          <Text style={[styles.hotelName, isRTL && styles.rtlText]} numberOfLines={1}>
            {trip.hotelName}
          </Text>
          <Text style={[styles.destination, isRTL && styles.rtlText]}>{trip.destination}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Dates + nights */}
      <View style={[styles.datesRow, isRTL && styles.rowReverse]}>
        <View style={styles.dateBox}>
          <Text style={styles.dateLabelSmall}>{t.detail.checkIn}</Text>
          <Text style={styles.dateValue}>{trip.checkIn}</Text>
        </View>
        <Text style={styles.arrow}>{isRTL ? '←' : '→'}</Text>
        <View style={styles.dateBox}>
          <Text style={styles.dateLabelSmall}>{t.detail.checkOut}</Text>
          <Text style={styles.dateValue}>{trip.checkOut}</Text>
        </View>
        <View style={styles.flex1} />
        <Text style={styles.nights}>{t.common.nights(trip.nights)}</Text>
      </View>

      {/* Ref + price */}
      <View style={[styles.metaRow, isRTL && styles.rowReverse]}>
        <Text style={styles.ref}>{t.trips.ref}: {trip.bookingRef}</Text>
        <Text style={styles.price}>{t.common.sar} {trip.totalSAR.toLocaleString()}</Text>
      </View>

      {/* Actions */}
      <View style={[styles.actions, isRTL && styles.rowReverse]}>
        <Pressable
          style={styles.viewBtn}
          onPress={onView}
          accessibilityRole="button"
          accessibilityLabel={t.trips.viewDetails}
        >
          <Text style={styles.viewBtnText}>{t.trips.viewDetails}</Text>
        </Pressable>

        {trip.status === 'confirmed' && onCancel && (
          <Pressable
            style={styles.cancelBtn}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t.trips.cancelTrip}
          >
            <Text style={styles.cancelBtnText}>{t.trips.cancelTrip}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── MyTripsScreen ────────────────────────────────────────────────────────────
export default function MyTripsScreen() {
  const { t } = useTranslation();
  const tr    = t as unknown as Translations;
  const isRTL = I18nManager.isRTL;

  const [activeTab, setActiveTab] = useState<TripTab>('upcoming');

  const tabs: { key: TripTab; label: string }[] = useMemo(() => [
    { key: 'upcoming', label: tr.trips.upcoming },
    { key: 'past',     label: tr.trips.past },
  ], [tr]);

  const trips = useMemo(() => {
    if (activeTab === 'upcoming') {
      return STUB_TRIPS.filter(trip => UPCOMING_STATUSES.includes(trip.status));
    }
    return STUB_TRIPS.filter(trip => !UPCOMING_STATUSES.includes(trip.status));
  }, [activeTab]);

  const emptyMessage = activeTab === 'upcoming' ? tr.trips.noUpcoming : tr.trips.noPast;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{tr.trips.title}</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar} accessibilityRole="tablist">
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
            accessibilityLabel={tab.label}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>

      {/* Trip list */}
      <FlatList
        data={trips}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            t={tr}
            isRTL={isRTL}
            onView={() => { /* navigate to detail */ }}
            onCancel={item.status === 'confirmed' ? () => { /* cancel logic */ } : undefined}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{activeTab === 'upcoming' ? '✈️' : '📋'}</Text>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
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
  header:      { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:       { fontSize: 26, fontWeight: '800', color: TEXT_DARK },

  // Tab bar
  tabBar:      { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: BORDER },
  tab:         { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  tabActive:   {},
  tabText:     { fontSize: 15, color: TEXT_GRAY, fontWeight: '500' },
  tabTextActive:{ color: BRAND_GREEN, fontWeight: '700' },
  tabUnderline:{ position: 'absolute', bottom: 0, left: 24, right: 24, height: 3, backgroundColor: BRAND_GREEN, borderRadius: 2 },

  // List
  listContent: { padding: 16, paddingBottom: 32 },

  // Card
  card:        { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },

  cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  flex1:       { flex: 1 },
  hotelName:   { fontSize: 16, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  destination: { fontSize: 13, color: TEXT_GRAY },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginStart: 8 },
  statusText:  { fontSize: 12, fontWeight: '700' },

  datesRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  dateBox:     { gap: 2 },
  dateLabelSmall: { fontSize: 10, color: TEXT_GRAY, textTransform: 'uppercase', letterSpacing: 0.4 },
  dateValue:   { fontSize: 14, fontWeight: '600', color: TEXT_DARK },
  arrow:       { fontSize: 18, color: TEXT_GRAY },
  nights:      { fontSize: 13, color: TEXT_GRAY, fontWeight: '500' },

  metaRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  ref:         { fontSize: 12, color: TEXT_GRAY },
  price:       { fontSize: 18, fontWeight: '800', color: TEXT_DARK },

  actions:     { flexDirection: 'row', gap: 10 },
  viewBtn:     { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1.5, borderColor: BRAND_GREEN, justifyContent: 'center', alignItems: 'center' },
  viewBtnText: { color: BRAND_GREEN, fontSize: 14, fontWeight: '600' },
  cancelBtn:   { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1.5, borderColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  cancelBtnText:{ color: '#EF4444', fontSize: 14, fontWeight: '600' },

  rowReverse:  { flexDirection: 'row-reverse' },
  rtlText:     { textAlign: 'right', writingDirection: 'rtl' },

  empty:       { padding: 48, alignItems: 'center' },
  emptyEmoji:  { fontSize: 52, marginBottom: 16 },
  emptyText:   { fontSize: 16, color: TEXT_GRAY, textAlign: 'center' },
});
