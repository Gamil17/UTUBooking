/**
 * MehramVerification — Hajj/Umrah Mahram compliance module
 *
 * Saudi Arabia requires female pilgrims under 45 without a Mahram (male guardian)
 * to travel in an official licensed group. This rule is enforced for Pakistani (PK)
 * and Indian (IN) market bookings where it is a Ministry-level requirement.
 *
 * Usage:
 *   1. shouldRequireMehram(country, bookingType) → show step in booking flow
 *   2. validateMehramData(data)                  → validate form submission
 *   3. buildMehramPayload(data)                  → DB-ready update payload
 *
 * References:
 *   Saudi Ministry of Hajj Official Regulations 2025
 *   Pakistan Ministry of Religious Affairs — Hajj Policy 2025
 *   Haj Committee of India — Guidelines for Haj 2025
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type BookingType = 'hajj' | 'umrah' | 'hotel' | 'flight' | 'car';

export type MehramOption = 'with_mahram' | 'authorized_group';

export interface MehramData {
  gender:                  'male' | 'female';
  age?:                    number;
  option?:                 MehramOption;
  companionName?:          string;
  companionRelationship?:  string;
  groupOperator?:          string;
}

export interface MehramValidationResult {
  valid:     boolean;
  blocked:   boolean;    // true = cannot proceed with booking at all
  reason?:   string;     // machine-readable error code
  message?:  string;     // English fallback; frontend uses i18n keys
}

export interface MehramDbPayload {
  mehram_required:       boolean;
  mehram_companion_name: string | null;
  mehram_relationship:   string | null;
  mehram_group_operator: string | null;
  mehram_verified_at:    Date;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Countries where Mehram verification must be collected */
const MEHRAM_COUNTRIES = new Set(['PK', 'IN']);

/** Booking types that trigger the Mehram step */
const MEHRAM_BOOKING_TYPES = new Set<BookingType>(['hajj', 'umrah']);

/** Saudi Ministry of Hajj age threshold (women 45+ may travel in official groups) */
export const MEHRAM_AGE_THRESHOLD = 45;

export const MAHRAM_RELATIONSHIPS = [
  'husband',
  'father',
  'brother',
  'son',
  'uncle',
  'grandfather',
] as const;

export type MahramRelationship = (typeof MAHRAM_RELATIONSHIPS)[number];

// ── Business rules ────────────────────────────────────────────────────────────

/**
 * Returns true if the Mehram step should be shown in the booking flow.
 * Only for PK/IN users booking Hajj or Umrah.
 */
export function shouldRequireMehram(
  userCountry: string,
  bookingType: BookingType,
): boolean {
  return (
    MEHRAM_COUNTRIES.has(userCountry?.toUpperCase()) &&
    MEHRAM_BOOKING_TYPES.has(bookingType?.toLowerCase() as BookingType)
  );
}

/**
 * Validates Mehram form data.
 *
 * Decision tree:
 *   Male traveler           → valid, not blocked
 *   Female + age ≥ 45       → valid, not blocked (Saudi exemption)
 *   Female + age < 45 + with_mahram + name + relationship → valid
 *   Female + age < 45 + authorized_group + operator       → valid
 *   Female + age < 45 + no option                         → blocked
 */
export function validateMehramData(data: MehramData): MehramValidationResult {
  if (!data.gender) {
    return {
      valid: false, blocked: false,
      reason: 'GENDER_REQUIRED',
      message: 'Please select your gender.',
    };
  }

  if (data.gender === 'male') {
    return { valid: true, blocked: false };
  }

  // Female pilgrim
  if (data.age === undefined || data.age === null) {
    return {
      valid: false, blocked: false,
      reason: 'AGE_REQUIRED',
      message: 'Please enter your age.',
    };
  }

  const age = Number(data.age);
  if (!Number.isFinite(age) || age < 1 || age > 120) {
    return {
      valid: false, blocked: false,
      reason: 'AGE_INVALID',
      message: 'Please enter a valid age (1–120).',
    };
  }

  // Saudi Ministry of Hajj exemption: women 45+ may travel in official groups
  if (age >= MEHRAM_AGE_THRESHOLD) {
    return { valid: true, blocked: false };
  }

  // Female under 45 — Mahram or official group required
  if (!data.option) {
    return {
      valid: false, blocked: true,
      reason: 'MEHRAM_REQUIRED',
      message:
        'Female pilgrims under 45 must travel with a Mahram or join a licensed group.',
    };
  }

  if (data.option === 'with_mahram') {
    if (!data.companionName?.trim()) {
      return {
        valid: false, blocked: false,
        reason: 'COMPANION_NAME_REQUIRED',
        message: "Please enter your Mahram's full name.",
      };
    }
    if (
      !data.companionRelationship ||
      !MAHRAM_RELATIONSHIPS.includes(data.companionRelationship as MahramRelationship)
    ) {
      return {
        valid: false, blocked: false,
        reason: 'RELATIONSHIP_REQUIRED',
        message: 'Please select your relationship to the Mahram.',
      };
    }
    return { valid: true, blocked: false };
  }

  if (data.option === 'authorized_group') {
    if (!data.groupOperator?.trim()) {
      return {
        valid: false, blocked: false,
        reason: 'GROUP_OPERATOR_REQUIRED',
        message: 'Please enter the name of your licensed tour operator.',
      };
    }
    return { valid: true, blocked: false };
  }

  return {
    valid: false, blocked: true,
    reason: 'INVALID_OPTION',
    message: 'Please select a valid travel arrangement.',
  };
}

/**
 * Builds the DB update payload from validated MehramData.
 * Pass to booking.repo.updateMehramData(bookingId, payload).
 */
export function buildMehramPayload(data: MehramData): MehramDbPayload {
  const age           = Number(data.age ?? 0);
  const needsMehram   = data.gender === 'female' && age < MEHRAM_AGE_THRESHOLD;

  return {
    mehram_required:       needsMehram,
    mehram_companion_name: data.companionName?.trim()         || null,
    mehram_relationship:   data.companionRelationship?.trim() || null,
    mehram_group_operator: data.groupOperator?.trim()         || null,
    mehram_verified_at:    new Date(),
  };
}
