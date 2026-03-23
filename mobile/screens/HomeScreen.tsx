/**
 * HomeScreen — Search hub with Hotels / Flights / Cars tabs.
 * WCAG 2.1 AA: accessibilityRole, accessibilityLabel, accessibilityState, 44 dp touch targets.
 * Bilingual EN ↔ AR with full RTL layout mirroring via i18next + I18nManager.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { type Lang } from '../i18n';
import type { Translations } from '../i18n';
import LanguageToggle from '../components/LanguageToggle';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// ─── Types ────────────────────────────────────────────────────────────────────
type SearchTab = 'hotels' | 'flights' | 'cars';

interface HotelForm {
  destination: string;
  checkIn:     string;
  checkOut:    string;
  guests:      string;
  isUmrah:     boolean;
}
interface FlightForm {
  from:        string;
  to:          string;
  departDate:  string;
  returnDate:  string;
  passengers:  string;
  cabin:       'economy' | 'business';
}
interface CarForm {
  pickupCity:    string;
  pickupDate:    string;
  dropoffDate:   string;
  transmission:  'automatic' | 'manual';
}

function isoToday(offset = 0): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}
const TODAY    = isoToday(0);
const TOMORROW = isoToday(1);

// ─── Sub-components ───────────────────────────────────────────────────────────
interface LabeledInputProps {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  hint?:       string;
  keyType?:    'default' | 'numeric' | 'email-address';
}
function LabeledInput({ label, value, onChange, hint, keyType = 'default' }: LabeledInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={hint}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyType}
        accessibilityLabel={label}
        accessibilityHint={hint}
      />
    </View>
  );
}

interface SegmentProps<T extends string> {
  options:  readonly { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
  ariaLabel: string;
}
function Segment<T extends string>({ options, selected, onSelect, ariaLabel }: SegmentProps<T>) {
  return (
    <View style={styles.segment} accessibilityRole="tablist" accessibilityLabel={ariaLabel}>
      {options.map(opt => (
        <Pressable
          key={opt.value}
          style={[styles.segmentBtn, selected === opt.value && styles.segmentBtnActive]}
          onPress={() => onSelect(opt.value)}
          accessibilityRole="tab"
          accessibilityState={{ selected: selected === opt.value }}
          accessibilityLabel={opt.label}
        >
          <Text style={[styles.segmentText, selected === opt.value && styles.segmentTextActive]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Search form panels ───────────────────────────────────────────────────────
interface HotelPanelProps {
  form:      HotelForm;
  onChange:  (patch: Partial<HotelForm>) => void;
  onSearch:  () => void;
  t:         Translations['search']['hotel'];
  searchBtn: string;
}
function HotelPanel({ form, onChange, onSearch, t, searchBtn }: HotelPanelProps) {
  const cabinOptions = useMemo(() => [
    { value: 'economy' as const, label: t.isUmrah },
  ], [t]);

  return (
    <View>
      <LabeledInput
        label={t.destination}
        value={form.destination}
        onChange={v => onChange({ destination: v })}
        hint={t.destinationHint}
      />
      <View style={styles.row}>
        <View style={styles.flex1}>
          <LabeledInput
            label={t.checkIn}
            value={form.checkIn}
            onChange={v => onChange({ checkIn: v })}
            hint="YYYY-MM-DD"
          />
        </View>
        <View style={styles.spacer} />
        <View style={styles.flex1}>
          <LabeledInput
            label={t.checkOut}
            value={form.checkOut}
            onChange={v => onChange({ checkOut: v })}
            hint="YYYY-MM-DD"
          />
        </View>
      </View>
      <LabeledInput
        label={t.guests}
        value={form.guests}
        onChange={v => onChange({ guests: v })}
        hint={t.guestsHint}
        keyType="numeric"
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t.isUmrah}</Text>
        <Switch
          value={form.isUmrah}
          onValueChange={v => onChange({ isUmrah: v })}
          accessibilityLabel={t.isUmrah}
          trackColor={{ true: '#10B981', false: '#D1D5DB' }}
          thumbColor="#FFFFFF"
        />
      </View>
      <Pressable
        style={styles.searchBtn}
        onPress={onSearch}
        accessibilityRole="button"
        accessibilityLabel={searchBtn}
      >
        <Text style={styles.searchBtnText}>{searchBtn}</Text>
      </Pressable>
    </View>
  );
}

interface FlightPanelProps {
  form:     FlightForm;
  onChange: (patch: Partial<FlightForm>) => void;
  onSearch: () => void;
  t:        Translations['search']['flight'];
  searchBtn: string;
}
function FlightPanel({ form, onChange, onSearch, t, searchBtn }: FlightPanelProps) {
  const cabinOptions = useMemo(() => [
    { value: 'economy' as const, label: t.economy },
    { value: 'business' as const, label: t.business },
  ], [t]);

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <LabeledInput
            label={t.from}
            value={form.from}
            onChange={v => onChange({ from: v })}
            hint={t.fromHint}
          />
        </View>
        <View style={styles.spacer} />
        <View style={styles.flex1}>
          <LabeledInput
            label={t.to}
            value={form.to}
            onChange={v => onChange({ to: v })}
            hint={t.toHint}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <LabeledInput
            label={t.departDate}
            value={form.departDate}
            onChange={v => onChange({ departDate: v })}
            hint="YYYY-MM-DD"
          />
        </View>
        <View style={styles.spacer} />
        <View style={styles.flex1}>
          <LabeledInput
            label={t.returnDate}
            value={form.returnDate}
            onChange={v => onChange({ returnDate: v })}
            hint="YYYY-MM-DD"
          />
        </View>
      </View>
      <LabeledInput
        label={t.passengers}
        value={form.passengers}
        onChange={v => onChange({ passengers: v })}
        hint={t.passengersHint}
        keyType="numeric"
      />
      <View style={styles.field}>
        <Text style={styles.label}>{t.cabin}</Text>
        <Segment
          options={cabinOptions}
          selected={form.cabin}
          onSelect={v => onChange({ cabin: v })}
          ariaLabel={t.cabin}
        />
      </View>
      <Pressable
        style={styles.searchBtn}
        onPress={onSearch}
        accessibilityRole="button"
        accessibilityLabel={searchBtn}
      >
        <Text style={styles.searchBtnText}>{searchBtn}</Text>
      </Pressable>
    </View>
  );
}

interface CarPanelProps {
  form:     CarForm;
  onChange: (patch: Partial<CarForm>) => void;
  onSearch: () => void;
  t:        Translations['search']['car'];
  searchBtn: string;
}
function CarPanel({ form, onChange, onSearch, t, searchBtn }: CarPanelProps) {
  const txOptions = useMemo(() => [
    { value: 'automatic' as const, label: t.automatic },
    { value: 'manual'    as const, label: t.manual },
  ], [t]);

  return (
    <View>
      <LabeledInput
        label={t.pickupCity}
        value={form.pickupCity}
        onChange={v => onChange({ pickupCity: v })}
        hint={t.pickupHint}
      />
      <View style={styles.row}>
        <View style={styles.flex1}>
          <LabeledInput
            label={t.pickupDate}
            value={form.pickupDate}
            onChange={v => onChange({ pickupDate: v })}
            hint="YYYY-MM-DD"
          />
        </View>
        <View style={styles.spacer} />
        <View style={styles.flex1}>
          <LabeledInput
            label={t.dropoffDate}
            value={form.dropoffDate}
            onChange={v => onChange({ dropoffDate: v })}
            hint="YYYY-MM-DD"
          />
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>{t.transmission}</Text>
        <Segment
          options={txOptions}
          selected={form.transmission}
          onSelect={v => onChange({ transmission: v })}
          ariaLabel={t.transmission}
        />
      </View>
      <Pressable
        style={styles.searchBtn}
        onPress={onSearch}
        accessibilityRole="button"
        accessibilityLabel={searchBtn}
      >
        <Text style={styles.searchBtnText}>{searchBtn}</Text>
      </Pressable>
    </View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const tr = t as unknown as Translations;  // typed shorthand

  const isRTL = I18nManager.isRTL;
  const lang  = (i18n.language as Lang) ?? 'en';

  const [activeTab, setActiveTab] = useState<SearchTab>('hotels');

  const [hotelForm, setHotelForm] = useState<HotelForm>({
    destination: 'MCM',
    checkIn:     TODAY,
    checkOut:    TOMORROW,
    guests:      '2',
    isUmrah:     true,
  });
  const [flightForm, setFlightForm] = useState<FlightForm>({
    from:       'RUH',
    to:         'JED',
    departDate: TODAY,
    returnDate: '',
    passengers: '1',
    cabin:      'economy',
  });
  const [carForm, setCarForm] = useState<CarForm>({
    pickupCity:   'مكة',
    pickupDate:   TODAY,
    dropoffDate:  TOMORROW,
    transmission: 'automatic',
  });

  const handleHotelSearch = useCallback(() => {
    navigation.navigate('HotelResults', {
      destination: hotelForm.destination,
      checkIn:     hotelForm.checkIn,
      checkOut:    hotelForm.checkOut,
      guests:      Number(hotelForm.guests) || 1,
    });
  }, [navigation, hotelForm]);

  const handleFlightSearch = useCallback(() => {
    // Flights backend not yet live — no-op stub
  }, []);

  const handleCarSearch = useCallback(() => {
    // Cars backend not yet live — no-op stub
  }, []);

  const tabOptions = useMemo(() => [
    { value: 'hotels'  as const, label: tr.search.tabs.hotels },
    { value: 'flights' as const, label: tr.search.tabs.flights },
    { value: 'cars'    as const, label: tr.search.tabs.cars },
  ], [tr]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero ── */}
        <View style={styles.hero} accessibilityRole="header">
          <View style={styles.heroTop}>
            <Text style={styles.brand}>{tr.common.brand}</Text>
            <LanguageToggle current={lang} />
          </View>
          <Text style={[styles.tagline, isRTL && styles.rtlText]}>
            {tr.search.hero.tagline}
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.rtlText]}>
            {tr.search.hero.subtitle}
          </Text>
        </View>

        {/* ── Search card ── */}
        <View style={styles.card}>
          {/* Tab selector */}
          <Segment
            options={tabOptions}
            selected={activeTab}
            onSelect={setActiveTab}
            ariaLabel={tr.search.tabs.hotels}
          />

          {/* Form panels */}
          <View style={styles.formPanel}>
            {activeTab === 'hotels' && (
              <HotelPanel
                form={hotelForm}
                onChange={patch => setHotelForm(prev => ({ ...prev, ...patch }))}
                onSearch={handleHotelSearch}
                t={tr.search.hotel}
                searchBtn={tr.search.hotel.searchBtn}
              />
            )}
            {activeTab === 'flights' && (
              <FlightPanel
                form={flightForm}
                onChange={patch => setFlightForm(prev => ({ ...prev, ...patch }))}
                onSearch={handleFlightSearch}
                t={tr.search.flight}
                searchBtn={tr.search.flight.searchBtn}
              />
            )}
            {activeTab === 'cars' && (
              <CarPanel
                form={carForm}
                onChange={patch => setCarForm(prev => ({ ...prev, ...patch }))}
                onSearch={handleCarSearch}
                t={tr.search.car}
                searchBtn={tr.search.car.searchBtn}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const BRAND_GREEN = '#10B981';
const TEXT_DARK   = '#111827';
const TEXT_GRAY   = '#6B7280';
const BG_LIGHT    = '#F9FAFB';
const BORDER      = '#E5E7EB';

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG_LIGHT },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // Hero
  hero:      { backgroundColor: BRAND_GREEN, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32 },
  heroTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brand:     { fontSize: 22, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  tagline:   { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  subtitle:  { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  rtlText:   { textAlign: 'right', writingDirection: 'rtl' },

  // Card
  card:      { marginHorizontal: 16, marginTop: -20, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  formPanel: { marginTop: 16 },

  // Segment
  segment:          { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 3 },
  segmentBtn:       { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  segmentBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segmentText:      { fontSize: 13, fontWeight: '500', color: TEXT_GRAY },
  segmentTextActive:{ color: TEXT_DARK, fontWeight: '600' },

  // Form fields
  field:       { marginBottom: 12 },
  label:       { fontSize: 12, fontWeight: '600', color: TEXT_GRAY, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:       { borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: TEXT_DARK, minHeight: 44, backgroundColor: '#FFFFFF' },
  row:         { flexDirection: 'row' },
  flex1:       { flex: 1 },
  spacer:      { width: 10 },
  switchRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 12 },
  switchLabel: { fontSize: 14, color: TEXT_DARK, flex: 1, marginEnd: 8 },

  // Search button
  searchBtn:     { backgroundColor: BRAND_GREEN, borderRadius: 12, minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  searchBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
