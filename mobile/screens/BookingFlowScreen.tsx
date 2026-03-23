/**
 * BookingFlowScreen — 3-step wizard: Guest Details → Payment → Confirmation.
 * Payment methods: STC Pay, Mada, Visa/Mastercard, Apple Pay.
 * WCAG 2.1 AA: roles, labels, states, 44 dp targets, high contrast.
 * Bilingual EN ↔ AR with RTL layout mirroring.
 */
import React, { useCallback, useMemo, useReducer } from 'react';
import {
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Lang, Translations } from '../i18n';
import type { HotelCardData } from './HotelResultsScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingFlow'>;
type Step  = 0 | 1 | 2;   // Details → Payment → Confirm
type PayMethod = 'stcPay' | 'mada' | 'visa' | 'applePay';

// ─── State ────────────────────────────────────────────────────────────────────
interface BookingState {
  step:        Step;
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string;
  nationality: string;
  /** Turkish Airlines Miles&Smiles frequent-flyer number (optional) */
  milesSmiles:  string;
  /** Garuda Indonesia GarudaMiles frequent-flyer number (optional, shown for id locale) */
  garudaMiles:  string;
  payMethod:   PayMethod;
  cardNumber:  string;
  expiry:      string;
  cvv:         string;
  termsOk:     boolean;
  processing:  boolean;
  confirmed:   boolean;
  bookingRef:  string;
}

type Action =
  | { type: 'SET'; field: keyof BookingState; value: string | boolean | Step | PayMethod }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'CONFIRM' }
  | { type: 'DONE'; ref: string };

const INITIAL: BookingState = {
  step: 0, firstName: '', lastName: '', email: '', phone: '',
  nationality: '', milesSmiles: '', garudaMiles: '', payMethod: 'stcPay', cardNumber: '', expiry: '',
  cvv: '', termsOk: false, processing: false, confirmed: false, bookingRef: '',
};

function reducer(state: BookingState, action: Action): BookingState {
  switch (action.type) {
    case 'SET':    return { ...state, [action.field]: action.value };
    case 'NEXT':   return { ...state, step: (Math.min(state.step + 1, 2)) as Step };
    case 'BACK':   return { ...state, step: (Math.max(state.step - 1, 0)) as Step };
    case 'CONFIRM':return { ...state, processing: true };
    case 'DONE':   return { ...state, processing: false, confirmed: true, bookingRef: action.ref };
    default:       return state;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
interface FieldProps {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  hint?:    string;
  keyType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  secure?:  boolean;
}
function Field({ label, value, onChange, hint, keyType = 'default', secure }: FieldProps) {
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
        secureTextEntry={secure}
        autoCapitalize="none"
        accessibilityLabel={label}
        accessibilityHint={hint}
      />
    </View>
  );
}

interface PayOptionProps {
  id:       PayMethod;
  label:    string;
  icon:     string;
  selected: boolean;
  onSelect: () => void;
}
function PayOption({ id, label, icon, selected, onSelect }: PayOptionProps) {
  return (
    <Pressable
      style={[styles.payOption, selected && styles.payOptionSelected]}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <Text style={styles.payIcon}>{icon}</Text>
      <Text style={[styles.payLabel, selected && styles.payLabelSelected]}>{label}</Text>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
interface StepBarProps {
  step:   Step;
  labels: string[];
}
function StepBar({ step, labels }: StepBarProps) {
  return (
    <View style={styles.stepBar} accessibilityRole="progressbar" accessibilityValue={{ now: step + 1, min: 1, max: 3 }}>
      {labels.map((label, i) => (
        <React.Fragment key={label}>
          <View style={styles.stepItem}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
              <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>
                {i < step ? '✓' : String(i + 1)}
              </Text>
            </View>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{label}</Text>
          </View>
          {i < labels.length - 1 && (
            <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── BookingFlowScreen ────────────────────────────────────────────────────────
export default function BookingFlowScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const tr    = t as unknown as Translations;
  const lang  = i18n.language as Lang;
  const isRTL = I18nManager.isRTL;

  const hotel: HotelCardData = route.params?.hotel ?? {
    id: 'preview', name: 'Swissotel Makkah', starRating: 5,
    pricePerNight: 1200, distanceHaramM: 100, badge: 'closest',
    freeCancellation: true, amenities: ['WiFi', 'Pool'],
  };
  const nights: number = route.params?.nights ?? 3;
  const total:  number = route.params?.total  ?? hotel.pricePerNight * nights * 1.15;

  const [state, dispatch] = useReducer(reducer, INITIAL);

  const stepLabels = useMemo(() => [
    tr.booking.steps.details,
    tr.booking.steps.payment,
    tr.booking.steps.confirm,
  ], [tr]);

  const payOptions: { id: PayMethod; label: string; icon: string }[] = useMemo(() => [
    { id: 'stcPay',  label: tr.booking.payment.stcPay,  icon: '💜' },
    { id: 'mada',    label: tr.booking.payment.mada,    icon: '💳' },
    { id: 'visa',    label: tr.booking.payment.visa,    icon: '🏦' },
    { id: 'applePay',label: tr.booking.payment.applePay,icon: '' },
  ], [tr]);

  const handleConfirm = useCallback(async () => {
    dispatch({ type: 'CONFIRM' });
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    dispatch({ type: 'DONE', ref: `UTU-${Math.random().toString(36).slice(2, 8).toUpperCase()}` });
  }, []);

  // ── Confirmation screen ──────────────────────────────────────────────────────
  if (state.confirmed) {
    return (
      <View style={styles.confirmRoot}>
        <Text style={styles.confirmEmoji}>✅</Text>
        <Text style={styles.confirmTitle}>{tr.booking.success}</Text>
        <Text style={styles.refLabel}>{tr.booking.refLabel}</Text>
        <Text style={styles.refValue}>{state.bookingRef}</Text>
        <Pressable
          style={styles.doneBtn}
          onPress={() => navigation.navigate('MyTrips')}
          accessibilityRole="button"
          accessibilityLabel={tr.trips.title}
        >
          <Text style={styles.doneBtnText}>{tr.trips.title}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Step bar */}
      <StepBar step={state.step} labels={stepLabels} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ── Step 0: Guest Details ── */}
        {state.step === 0 && (
          <View>
            <Text style={styles.sectionTitle}>{tr.booking.guest.heading}</Text>
            <View style={[styles.row, isRTL && styles.rowReverse]}>
              <View style={styles.flex1}>
                <Field label={tr.booking.guest.firstName} value={state.firstName} onChange={v => dispatch({ type: 'SET', field: 'firstName', value: v })} />
              </View>
              <View style={styles.spacer} />
              <View style={styles.flex1}>
                <Field label={tr.booking.guest.lastName} value={state.lastName} onChange={v => dispatch({ type: 'SET', field: 'lastName', value: v })} />
              </View>
            </View>
            <Field label={tr.booking.guest.email}       value={state.email}       onChange={v => dispatch({ type: 'SET', field: 'email',       value: v })} keyType="email-address" />
            <Field label={tr.booking.guest.phone}       value={state.phone}       onChange={v => dispatch({ type: 'SET', field: 'phone',       value: v })} hint={tr.booking.guest.phoneHint} keyType="phone-pad" />
            <Field label={tr.booking.guest.nationality} value={state.nationality} onChange={v => dispatch({ type: 'SET', field: 'nationality', value: v })} hint={tr.booking.guest.nationalityHint} />
            <Field label={tr.booking.guest.milesSmiles} value={state.milesSmiles} onChange={v => dispatch({ type: 'SET', field: 'milesSmiles', value: v })} hint={tr.booking.guest.milesSmilesHint} keyType="numeric" />
            {lang === 'id' && (
              <Field label={tr.booking.guest.garudaMiles} value={state.garudaMiles} onChange={v => dispatch({ type: 'SET', field: 'garudaMiles', value: v })} hint={tr.booking.guest.garudaMilesHint} keyType="numeric" />
            )}
          </View>
        )}

        {/* ── Step 1: Payment ── */}
        {state.step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>{tr.booking.payment.heading}</Text>
            {payOptions.map(opt => (
              <PayOption
                key={opt.id}
                id={opt.id}
                label={opt.label}
                icon={opt.icon}
                selected={state.payMethod === opt.id}
                onSelect={() => dispatch({ type: 'SET', field: 'payMethod', value: opt.id })}
              />
            ))}

            {/* Card fields — shown only for card methods */}
            {(state.payMethod === 'visa' || state.payMethod === 'mada') && (
              <View style={styles.cardFields}>
                <Field label={tr.booking.payment.cardNumber} value={state.cardNumber} onChange={v => dispatch({ type: 'SET', field: 'cardNumber', value: v })} keyType="numeric" />
                <View style={[styles.row, isRTL && styles.rowReverse]}>
                  <View style={styles.flex1}>
                    <Field label={tr.booking.payment.expiry} value={state.expiry} onChange={v => dispatch({ type: 'SET', field: 'expiry', value: v })} hint="MM/YY" />
                  </View>
                  <View style={styles.spacer} />
                  <View style={styles.flex1}>
                    <Field label={tr.booking.payment.cvv} value={state.cvv} onChange={v => dispatch({ type: 'SET', field: 'cvv', value: v })} keyType="numeric" secure />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Step 2: Confirm ── */}
        {state.step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>{tr.booking.summary.heading}</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>{tr.booking.summary.hotel}</Text>
                <Text style={styles.summaryVal}>{hotel.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>{tr.booking.summary.dates}</Text>
                <Text style={styles.summaryVal}>{tr.common.nights(nights)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>{tr.booking.summary.guests}</Text>
                <Text style={styles.summaryVal}>2</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalKey}>{tr.detail.total}</Text>
                <Text style={styles.totalVal}>{tr.common.sar} {total.toLocaleString()}</Text>
              </View>
            </View>

            {/* Terms */}
            <Pressable
              style={[styles.termsRow, isRTL && styles.rowReverse]}
              onPress={() => dispatch({ type: 'SET', field: 'termsOk', value: !state.termsOk })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: state.termsOk }}
              accessibilityLabel={tr.booking.terms}
            >
              <View style={[styles.checkbox, state.termsOk && styles.checkboxChecked]}>
                {state.termsOk && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>{tr.booking.terms}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* ── Navigation buttons ── */}
      <View style={[styles.navBar, isRTL && styles.rowReverse]}>
        {state.step > 0 && (
          <Pressable
            style={styles.backBtn}
            onPress={() => dispatch({ type: 'BACK' })}
            accessibilityRole="button"
            accessibilityLabel={tr.common.back}
          >
            <Text style={styles.backBtnText}>{tr.common.back}</Text>
          </Pressable>
        )}

        {state.step < 2 && (
          <Pressable
            style={styles.nextBtn}
            onPress={() => dispatch({ type: 'NEXT' })}
            accessibilityRole="button"
            accessibilityLabel={tr.common.confirm}
          >
            <Text style={styles.nextBtnText}>{tr.common.confirm}</Text>
          </Pressable>
        )}

        {state.step === 2 && (
          <Pressable
            style={[styles.nextBtn, (!state.termsOk || state.processing) && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={!state.termsOk || state.processing}
            accessibilityRole="button"
            accessibilityLabel={tr.booking.payNow(total)}
            accessibilityState={{ disabled: !state.termsOk || state.processing }}
          >
            <Text style={styles.nextBtnText}>
              {state.processing ? tr.booking.processing : tr.booking.payNow(total)}
            </Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const BRAND_GREEN = '#10B981';
const TEXT_DARK   = '#111827';
const TEXT_GRAY   = '#6B7280';
const BORDER      = '#E5E7EB';

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#F9FAFB' },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  // Step bar
  stepBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: BORDER },
  stepItem:       { alignItems: 'center', gap: 4 },
  stepDot:        { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  stepDotActive:  { backgroundColor: BRAND_GREEN },
  stepNum:        { fontSize: 13, fontWeight: '700', color: TEXT_GRAY },
  stepNumActive:  { color: '#FFFFFF' },
  stepLabel:      { fontSize: 11, color: TEXT_GRAY },
  stepLabelActive:{ color: BRAND_GREEN, fontWeight: '600' },
  stepLine:       { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 16 },
  stepLineActive: { backgroundColor: BRAND_GREEN },

  // Form
  sectionTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK, marginBottom: 16 },
  field:        { marginBottom: 14 },
  label:        { fontSize: 12, fontWeight: '600', color: TEXT_GRAY, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:        { borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: TEXT_DARK, minHeight: 44, backgroundColor: '#FFFFFF' },
  row:          { flexDirection: 'row' },
  rowReverse:   { flexDirection: 'row-reverse' },
  flex1:        { flex: 1 },
  spacer:       { width: 10 },

  // Payment options
  payOption:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 14, marginBottom: 10, minHeight: 60 },
  payOptionSelected: { borderColor: BRAND_GREEN, backgroundColor: '#F0FDF4' },
  payIcon:           { fontSize: 24, marginEnd: 12 },
  payLabel:          { flex: 1, fontSize: 15, color: TEXT_DARK },
  payLabelSelected:  { fontWeight: '600', color: BRAND_GREEN },
  radioOuter:        { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  radioOuterSelected:{ borderColor: BRAND_GREEN },
  radioInner:        { width: 12, height: 12, borderRadius: 6, backgroundColor: BRAND_GREEN },

  cardFields: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginTop: 4, borderWidth: 1, borderColor: BORDER },

  // Summary
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryKey:  { fontSize: 14, color: TEXT_GRAY },
  summaryVal:  { fontSize: 14, color: TEXT_DARK, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  totalRow:    { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  totalKey:    { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  totalVal:    { fontSize: 18, fontWeight: '800', color: BRAND_GREEN },

  // Terms
  termsRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8 },
  checkbox:    { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2 },
  checkboxChecked: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  checkmark:   { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  termsText:   { flex: 1, fontSize: 13, color: TEXT_GRAY, lineHeight: 20 },

  // Nav bar
  navBar:     { flexDirection: 'row', padding: 16, gap: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: BORDER },
  backBtn:    { flex: 1, minHeight: 52, borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  backBtnText:{ fontSize: 15, fontWeight: '600', color: TEXT_DARK },
  nextBtn:    { flex: 2, minHeight: 52, borderRadius: 12, backgroundColor: BRAND_GREEN, justifyContent: 'center', alignItems: 'center' },
  nextBtnText:{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  btnDisabled:{ backgroundColor: '#9CA3AF' },

  // Confirmation
  confirmRoot:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F9FAFB' },
  confirmEmoji: { fontSize: 72, marginBottom: 24 },
  confirmTitle: { fontSize: 26, fontWeight: '800', color: TEXT_DARK, marginBottom: 24, textAlign: 'center' },
  refLabel:     { fontSize: 13, color: TEXT_GRAY, marginBottom: 6 },
  refValue:     { fontSize: 22, fontWeight: '800', color: BRAND_GREEN, letterSpacing: 2, marginBottom: 40 },
  doneBtn:      { backgroundColor: BRAND_GREEN, borderRadius: 14, minHeight: 54, paddingHorizontal: 40, justifyContent: 'center', alignItems: 'center' },
  doneBtnText:  { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
