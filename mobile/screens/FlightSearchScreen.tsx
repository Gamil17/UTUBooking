/**
 * FlightSearchScreen — Amadeus/Sabre flight results list.
 * WCAG 2.1 AA: accessibilityRole, accessibilityLabel, 44 dp targets, ≥4.5:1 contrast.
 * Bilingual EN ↔ AR with RTL layout mirroring via I18nManager.
 *
 * Receives route params: { origin, destination, date, returnDate?, passengers, cabin }
 * Fetches from GET /api/v1/flights/search — shows price/stops/duration/carrier.
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlightOffer {
  id:             string;
  carrier:        string;        // e.g. "Saudia", "flynas", "Emirates"
  carrierCode:    string;        // IATA e.g. "SV", "XY", "EK"
  flightNumber:   string;        // e.g. "SV823"
  origin:         string;        // IATA
  destination:    string;
  departureTime:  string;        // "HH:MM"
  arrivalTime:    string;
  durationMins:   number;
  stops:          number;        // 0 = direct
  stopAirports?:  string[];      // IATA codes of layover airports
  cabin:          'economy' | 'business';
  pricePerPerson: number;        // SAR
  totalPrice:     number;
  currency:       string;
  seatsLeft?:     number;
  refundable:     boolean;
  source:         'amadeus' | 'sabre';
}

type SortKey = 'cheapest' | 'fastest';

type Props = NativeStackScreenProps<RootStackParamList, 'FlightResults'>;

// ─── Colours ─────────────────────────────────────────────────────────────────

const BRAND_GREEN = '#10B981';
const TEXT_DARK   = '#111827';
const TEXT_GRAY   = '#6B7280';
const BORDER      = '#E5E7EB';

// ─── Stop badge ───────────────────────────────────────────────────────────────

function StopsBadge({ stops, t }: { stops: number; t: Translations }) {
  const label = stops === 0 ? t.flights.direct
              : stops === 1 ? t.flights.oneStop
              : t.flights.multiStop;
  const colour = stops === 0 ? '#065F46'  // green — direct
               : stops === 1 ? '#92400E'  // amber — 1 stop
               : '#991B1B';               // red — 2+
  const bg     = stops === 0 ? '#D1FAE5'
               : stops === 1 ? '#FEF3C7'
               : '#FEE2E2';
  return (
    <View style={[styles.stopsBadge, { backgroundColor: bg }]}>
      <Text style={[styles.stopsBadgeText, { color: colour }]}>{label}</Text>
    </View>
  );
}

// ─── Flight Card ─────────────────────────────────────────────────────────────

interface FlightCardProps {
  flight:  FlightOffer;
  t:       Translations;
  isRTL:   boolean;
  onPress: () => void;
}

function FlightCard({ flight, t, isRTL, onPress }: FlightCardProps) {
  const hours = Math.floor(flight.durationMins / 60);
  const mins  = flight.durationMins % 60;

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.flights.accessibility.flightCard(flight.origin, flight.destination)}
    >
      {/* Carrier + flight number */}
      <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
        <View style={styles.carrierBadge}>
          <Text style={styles.carrierCode}>{flight.carrierCode}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.carrierName, isRTL && styles.rtlText]}>{flight.carrier}</Text>
          <Text style={[styles.flightNum, isRTL && styles.rtlText]}>{flight.flightNumber}</Text>
        </View>
        <StopsBadge stops={flight.stops} t={t} />
      </View>

      {/* Route: departure → arrival */}
      <View style={[styles.routeRow, isRTL && styles.rowReverse]}>
        {/* Departure */}
        <View style={styles.airportBlock}>
          <Text style={[styles.time, isRTL && styles.rtlText]}>{flight.departureTime}</Text>
          <Text style={[styles.iata, isRTL && styles.rtlText]}>{flight.origin}</Text>
          <Text style={[styles.timeLabel, isRTL && styles.rtlText]}>{t.flights.departs}</Text>
        </View>

        {/* Duration line */}
        <View style={styles.durationCol}>
          <Text style={styles.durationText}>{t.flights.duration(hours, mins)}</Text>
          <View style={styles.durationLine}>
            <View style={styles.durationDot} />
            <View style={styles.durationTrack} />
            {flight.stops > 0 && <View style={styles.stopDot} />}
            <View style={styles.durationTrack} />
            <View style={styles.durationDot} />
          </View>
        </View>

        {/* Arrival */}
        <View style={[styles.airportBlock, styles.alignEnd]}>
          <Text style={[styles.time, isRTL && styles.rtlText]}>{flight.arrivalTime}</Text>
          <Text style={[styles.iata, isRTL && styles.rtlText]}>{flight.destination}</Text>
          <Text style={[styles.timeLabel, isRTL && styles.rtlText]}>{t.flights.arrives}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Price + CTA */}
      <View style={[styles.priceRow, isRTL && styles.rowReverse]}>
        <View>
          <Text style={styles.price}>
            {t.common.sar} {flight.pricePerPerson.toLocaleString()}
          </Text>
          <Text style={styles.perPerson}>{t.flights.perPerson}</Text>
          {flight.seatsLeft != null && flight.seatsLeft <= 5 && (
            <Text style={styles.seatsLeft}>{flight.seatsLeft} seats left</Text>
          )}
        </View>

        <Pressable
          style={styles.bookBtn}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t.flights.bookFlight}
        >
          <Text style={styles.bookBtnText}>{t.flights.bookFlight}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── FlightSearchScreen ───────────────────────────────────────────────────────

export default function FlightSearchScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const tr    = t as unknown as Translations;
  const isRTL = I18nManager.isRTL;

  const [sortKey, setSortKey] = useState<SortKey>('cheapest');

  // Stub data — replace with useQuery call to /api/v1/flights/search
  const RAW_FLIGHTS: FlightOffer[] = useMemo(() => [
    {
      id: 'f1', carrier: 'Saudia', carrierCode: 'SV', flightNumber: 'SV823',
      origin: 'RUH', destination: 'JED',
      departureTime: '07:00', arrivalTime: '08:10', durationMins: 70,
      stops: 0, cabin: 'economy', pricePerPerson: 310, totalPrice: 310,
      currency: 'SAR', seatsLeft: 12, refundable: true, source: 'amadeus',
    },
    {
      id: 'f2', carrier: 'flynas', carrierCode: 'XY', flightNumber: 'XY201',
      origin: 'RUH', destination: 'JED',
      departureTime: '09:30', arrivalTime: '10:45', durationMins: 75,
      stops: 0, cabin: 'economy', pricePerPerson: 270, totalPrice: 270,
      currency: 'SAR', seatsLeft: 3, refundable: false, source: 'sabre',
    },
    {
      id: 'f3', carrier: 'Emirates', carrierCode: 'EK', flightNumber: 'EK820',
      origin: 'RUH', destination: 'JED',
      departureTime: '14:00', arrivalTime: '17:30', durationMins: 210,
      stops: 1, stopAirports: ['DXB'], cabin: 'economy', pricePerPerson: 480,
      totalPrice: 480, currency: 'SAR', refundable: true, source: 'amadeus',
    },
    {
      id: 'f4', carrier: 'Saudia', carrierCode: 'SV', flightNumber: 'SV101',
      origin: 'RUH', destination: 'JED',
      departureTime: '06:00', arrivalTime: '07:15', durationMins: 75,
      stops: 0, cabin: 'business', pricePerPerson: 1800, totalPrice: 1800,
      currency: 'SAR', refundable: true, source: 'amadeus',
    },
  ], []);

  const flights = useMemo(() => {
    return [...RAW_FLIGHTS].sort((a, b) =>
      sortKey === 'cheapest'
        ? a.pricePerPerson - b.pricePerPerson
        : a.durationMins - b.durationMins
    );
  }, [RAW_FLIGHTS, sortKey]);

  const sortOptions: { key: SortKey; label: string }[] = useMemo(() => [
    { key: 'cheapest', label: tr.flights.sortCheapest },
    { key: 'fastest',  label: tr.flights.sortFastest  },
  ], [tr]);

  const renderItem = useCallback(({ item }: { item: FlightOffer }) => (
    <FlightCard
      flight={item}
      t={tr}
      isRTL={isRTL}
      onPress={() => {
        // Navigate to booking flow with flight offer
        // navigation.navigate('BookingFlow', { flight: item });
      }}
    />
  ), [tr, isRTL]);

  const ListHeader = useMemo(() => (
    <View style={[styles.filterBar, isRTL && styles.rowReverse]}>
      <Text style={styles.countText}>{tr.flights.count(flights.length)}</Text>
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
      </View>
    </View>
  ), [flights.length, sortOptions, sortKey, tr, isRTL]);

  return (
    <View style={styles.root}>
      <FlatList
        data={flights}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✈️</Text>
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

  filterBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, flexWrap: 'wrap', gap: 8 },
  countText:   { fontSize: 14, fontWeight: '600', color: TEXT_DARK },
  chipRow:     { flexDirection: 'row', gap: 6 },
  chip:        { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  chipActive:  { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  chipText:    { fontSize: 12, color: TEXT_GRAY, fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // Card
  card:        { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },

  cardHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  carrierBadge:{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  carrierCode: { fontSize: 13, fontWeight: '800', color: TEXT_DARK },
  flex1:       { flex: 1 },
  carrierName: { fontSize: 14, fontWeight: '600', color: TEXT_DARK },
  flightNum:   { fontSize: 12, color: TEXT_GRAY },

  stopsBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  stopsBadgeText:  { fontSize: 11, fontWeight: '700' },

  routeRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  airportBlock:{ flex: 1 },
  alignEnd:    { alignItems: 'flex-end' },
  time:        { fontSize: 22, fontWeight: '800', color: TEXT_DARK },
  iata:        { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  timeLabel:   { fontSize: 11, color: TEXT_GRAY },

  durationCol:   { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  durationText:  { fontSize: 11, color: TEXT_GRAY, marginBottom: 4 },
  durationLine:  { flexDirection: 'row', alignItems: 'center', width: '100%' },
  durationDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: TEXT_GRAY },
  durationTrack: { flex: 1, height: 1, backgroundColor: BORDER },
  stopDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', marginHorizontal: 2 },

  divider:     { height: 1, backgroundColor: BORDER, marginBottom: 12 },

  priceRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price:       { fontSize: 20, fontWeight: '800', color: TEXT_DARK },
  perPerson:   { fontSize: 12, color: TEXT_GRAY },
  seatsLeft:   { fontSize: 11, color: '#DC2626', fontWeight: '600', marginTop: 2 },
  bookBtn:     { backgroundColor: BRAND_GREEN, borderRadius: 10, minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  bookBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  rowReverse:  { flexDirection: 'row-reverse' },
  rtlText:     { textAlign: 'right', writingDirection: 'rtl' },

  empty:       { padding: 48, alignItems: 'center' },
  emptyEmoji:  { fontSize: 52, marginBottom: 16 },
  emptyText:   { fontSize: 16, color: TEXT_GRAY, textAlign: 'center' },
});
