/**
 * LoyaltyScreen — Points balance, tier badge, progress to next tier, rewards catalog.
 *
 * Tiers:   Silver  0–4,999 pts  (#9CA3AF)
 *          Gold    5,000–19,999 (#F59E0B)
 *          Platinum 20,000+     (#06B6D4)
 *
 * Earn:    1 SAR = 10 pts
 * Redeem:  1,000 pts = SAR 10 off
 */
import React, { useMemo, useReducer } from 'react';
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

// ─── Brand palette ────────────────────────────────────────────────────────────
const BRAND_GREEN = '#10B981';
const TEXT_DARK   = '#111827';
const TEXT_GRAY   = '#6B7280';
const BORDER      = '#E5E7EB';
const BG_LIGHT    = '#F9FAFB';

const TIER_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  silver:   { bg: '#F3F4F6', text: '#6B7280', label: 'silver' },
  gold:     { bg: '#FEF3C7', text: '#92400E', label: 'gold' },
  platinum: { bg: '#CFFAFE', text: '#0E7490', label: 'platinum' },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Reward {
  id: string;
  name_en: string;
  name_ar: string;
  points_cost: number;
  type: string;
  discount_sar: number | null;
}

interface LoyaltyState {
  points: number;
  lifetimePoints: number;
  tier: 'silver' | 'gold' | 'platinum';
  nextTierAt: number | null;
  redeemedIds: string[];
}

type Action = { type: 'REDEEM'; rewardId: string; cost: number };

// ─── Stub data (replace with useQuery once API is live) ───────────────────────
const STUB_ACCOUNT: LoyaltyState = {
  points:        3_450,
  lifetimePoints: 8_450,
  tier:          'gold',
  nextTierAt:    20_000,
  redeemedIds:   [],
};

const STUB_REWARDS: Reward[] = [
  { id: 'r1', name_en: 'SAR 10 Off Next Booking',   name_ar: 'خصم 10 ر.س على الحجز التالي',   points_cost: 1_000, type: 'discount',   discount_sar: 10  },
  { id: 'r2', name_en: 'SAR 25 Off Next Booking',   name_ar: 'خصم 25 ر.س على الحجز التالي',   points_cost: 2_500, type: 'discount',   discount_sar: 25  },
  { id: 'r3', name_en: 'SAR 50 Off Next Booking',   name_ar: 'خصم 50 ر.س على الحجز التالي',   points_cost: 5_000, type: 'discount',   discount_sar: 50  },
  { id: 'r4', name_en: 'Free Room Upgrade',          name_ar: 'ترقية غرفة مجانية',              points_cost: 8_000, type: 'upgrade',    discount_sar: null },
  { id: 'r5', name_en: 'One Free Night (up to SAR 200)', name_ar: 'ليلة مجانية (حتى 200 ر.س)', points_cost: 15_000, type: 'free_night', discount_sar: 200 },
];

// ─── Reducer ──────────────────────────────────────────────────────────────────
function loyaltyReducer(state: LoyaltyState, action: Action): LoyaltyState {
  if (action.type === 'REDEEM') {
    return {
      ...state,
      points:      state.points - action.cost,
      redeemedIds: [...state.redeemedIds, action.rewardId],
    };
  }
  return state;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadge({ tier, label }: { tier: string; label: string }) {
  const style = TIER_STYLE[tier] ?? TIER_STYLE.silver;
  return (
    <View
      style={[styles.tierBadge, { backgroundColor: style.bg }]}
      accessibilityRole="text"
      accessibilityLabel={`Tier: ${label}`}
    >
      <Text style={[styles.tierBadgeText, { color: style.text }]}>{label}</Text>
    </View>
  );
}

function ProgressBar({ current, max }: { current: number; max: number }) {
  const pct = Math.min(current / max, 1);
  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: current }}
    >
      <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
    </View>
  );
}

interface RewardCardProps {
  reward: Reward;
  userPoints: number;
  isRedeemed: boolean;
  isRTL: boolean;
  onRedeem: () => void;
  redeemLabel: string;
  insufficientLabel: string;
  ptsLabel: (n: number) => string;
}

function RewardCard({
  reward, userPoints, isRedeemed, isRTL, onRedeem, redeemLabel, insufficientLabel, ptsLabel,
}: RewardCardProps) {
  const canRedeem = !isRedeemed && userPoints >= reward.points_cost;
  const name = isRTL ? reward.name_ar : reward.name_en;

  return (
    <View style={styles.card} accessibilityRole="article">
      <View style={[styles.cardRow, isRTL && styles.rowReverse]}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{name}</Text>
          <Text style={styles.cardCost}>{ptsLabel(reward.points_cost)}</Text>
        </View>
        <Pressable
          onPress={onRedeem}
          disabled={!canRedeem}
          style={[
            styles.redeemBtn,
            canRedeem ? styles.redeemBtnActive : styles.redeemBtnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={canRedeem ? `${redeemLabel}: ${name}` : insufficientLabel}
          accessibilityState={{ disabled: !canRedeem }}
        >
          <Text style={[styles.redeemBtnText, !canRedeem && styles.redeemBtnTextDisabled]}>
            {isRedeemed ? '✓' : redeemLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function LoyaltyScreen() {
  const { t, i18n } = useTranslation();
  const tr = t as unknown as Translations;
  const isRTL = I18nManager.isRTL;

  const [state, dispatch] = useReducer(loyaltyReducer, STUB_ACCOUNT);

  const tierLabel = tr.loyalty.tier[state.tier as keyof typeof tr.loyalty.tier];
  const atTop = state.tier === 'platinum';

  const progressLabel = useMemo(() => {
    if (atTop) return tr.loyalty.atTopTier;
    if (state.nextTierAt != null) {
      const remaining = state.nextTierAt - state.lifetimePoints;
      return tr.loyalty.nextTier(Math.max(0, remaining));
    }
    return '';
  }, [atTop, state.nextTierAt, state.lifetimePoints, tr, i18n.language]);

  return (
    <FlatList
      data={STUB_REWARDS}
      keyExtractor={(r) => r.id}
      style={styles.screen}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View>
          {/* ── Tier hero card ── */}
          <View style={styles.heroCard}>
            <View style={[styles.heroRow, isRTL && styles.rowReverse]}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroPointsLabel}>{tr.loyalty.yourPoints(state.points)}</Text>
                <TierBadge tier={state.tier} label={tierLabel} />
              </View>
              <View style={styles.heroRight}>
                <Text style={styles.earnRateText}>{tr.loyalty.earnRate}</Text>
                <Text style={styles.earnRateText}>{tr.loyalty.redeemRate}</Text>
              </View>
            </View>

            {/* Progress bar */}
            {!atTop && state.nextTierAt != null && (
              <View style={styles.progressSection}>
                <ProgressBar current={state.lifetimePoints} max={state.nextTierAt} />
                <Text style={styles.progressLabel}>{progressLabel}</Text>
              </View>
            )}
            {atTop && (
              <Text style={styles.progressLabel}>{progressLabel}</Text>
            )}
          </View>

          {/* ── Rewards heading ── */}
          <Text style={styles.sectionTitle}>{tr.loyalty.rewards}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <RewardCard
          reward={item}
          userPoints={state.points}
          isRedeemed={state.redeemedIds.includes(item.id)}
          isRTL={isRTL}
          redeemLabel={tr.loyalty.redeem}
          insufficientLabel={tr.loyalty.notEnoughPoints}
          ptsLabel={tr.loyalty.pts}
          onRedeem={() => {
            if (state.points >= item.points_cost && !state.redeemedIds.includes(item.id)) {
              dispatch({ type: 'REDEEM', rewardId: item.id, cost: item.points_cost });
            }
          }}
        />
      )}
      ListEmptyComponent={
        <Text style={styles.emptyText}>{tr.loyalty.noRewards}</Text>
      }
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: BG_LIGHT },
  content: { padding: 16, paddingBottom: 32 },

  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  rowReverse: { flexDirection: 'row-reverse' },
  heroLeft:   { gap: 8 },
  heroRight:  { alignItems: 'flex-end', gap: 4 },

  heroPointsLabel: {
    fontSize: 28,
    fontWeight: '800',
    color: BRAND_GREEN,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tierBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  earnRateText: {
    fontSize: 12,
    color: TEXT_GRAY,
  },

  progressSection: { gap: 6 },
  progressTrack: {
    height: 8,
    backgroundColor: BORDER,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: BRAND_GREEN,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: TEXT_GRAY,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 12,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardInfo:  { flex: 1, gap: 4 },
  cardName:  { fontSize: 15, fontWeight: '600', color: TEXT_DARK },
  cardCost:  { fontSize: 13, color: TEXT_GRAY },

  redeemBtn: {
    minHeight: 44,
    minWidth: 90,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  redeemBtnActive: {
    backgroundColor: BRAND_GREEN,
  },
  redeemBtnDisabled: {
    backgroundColor: BORDER,
  },
  redeemBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  redeemBtnTextDisabled: {
    color: TEXT_GRAY,
  },

  emptyText: {
    textAlign: 'center',
    color: TEXT_GRAY,
    fontSize: 15,
    marginTop: 32,
  },
});
