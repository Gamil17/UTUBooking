/**
 * UTUBooking API client
 *
 * Thin axios wrapper that targets the backend API gateway.
 * Base URL is injected at build time via NEXT_PUBLIC_API_URL.
 *
 * For local dev (docker-compose):  http://localhost:80/api/v1
 * For production:                  https://api.utubooking.com/api/v1
 */

import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:80/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Auth token injection ─────────────────────────────────────────────────────
// Reads the access token from sessionStorage on every request so it always
// uses the latest token after a silent refresh.

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('utu_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HotelOffer {
  id:               string;
  name:             { en: string; ar: string | null };
  stars:            number | null;
  distanceHaramM:   number | null;
  address:          string;
  city:             string;
  images:           string[];
  amenities:        string[];
  pricePerNight:    number;
  totalPrice:       number;
  currency:         string;
  checkIn:          string;
  checkOut:         string;
  nights:           number;
  freeCancellation: boolean;
  rateKey:          string | null;
  source:           string;
}

export interface FlightOffer {
  id:              string;
  flightNum:       string;
  airlineCode:     string;
  originIata:      string;
  destinationIata: string;
  departureAt:     string;
  arrivalAt:       string;
  cabinClass:      string;
  price:           number;
  currency:        string;
  durationMinutes: number;
  stops:           number;
  isRefundable:    boolean;
  baggageIncluded: boolean;
}

export interface CarOffer {
  id:             string;
  vehicleType:    string;
  name:           string;
  category:       string;
  transmission:   string;
  seats:          number | null;
  pricePerDay:    number;
  totalPrice:     number;
  currency:       string;
  supplier:       string;
  pickupLocation: string;
}

export interface SearchResponse<T> {
  source: string;
  count:  number;
  page:   number;
  limit:  number;
  results: T[];
}

// ─── Shared search helper ─────────────────────────────────────────────────────
async function search<T>(endpoint: string, params: object): Promise<SearchResponse<T>> {
  const { data } = await api.get<SearchResponse<T>>(endpoint, { params });
  return data;
}

// ─── Hotel endpoints ──────────────────────────────────────────────────────────

export interface HotelSearchParams {
  location:  string;   // Hotelbeds destination code or IATA
  checkIn:   string;   // YYYY-MM-DD
  checkOut:  string;   // YYYY-MM-DD
  guests:    number;
  stars?:    number;
  priceMin?: number;
  priceMax?: number;
  currency?: string;   // default SAR
  isHajj?:   boolean;
  isUmrah?:  boolean;
  page?:     number;
  limit?:    number;
}

export const searchHotels = (params: HotelSearchParams) =>
  search<HotelOffer>('/hotels/search', params);

// ─── Flight endpoints ─────────────────────────────────────────────────────────

export interface FlightSearchParams {
  origin:       string;   // IATA airport code e.g. 'RUH'
  destination:  string;   // IATA airport code e.g. 'JED'
  date:         string;   // YYYY-MM-DD
  adults:       number;
  cabinClass?:  'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  currency?:    string;
  maxOffers?:   number;
  returnDate?:  string;   // YYYY-MM-DD — if provided, triggers round-trip search
}

export const searchFlights = (params: FlightSearchParams) =>
  search<FlightOffer>('/flights/search', params);

// ─── Car endpoints ────────────────────────────────────────────────────────────

export interface CarSearchParams {
  pickupLocation:  string;   // city or airport code
  dropoffLocation: string;
  pickupDate:      string;   // YYYY-MM-DD
  dropoffDate:     string;   // YYYY-MM-DD
  currency?:       string;
  transmission?:   'automatic' | 'manual';
}

export const searchCars = (params: CarSearchParams) =>
  search<CarOffer>('/cars/search', params);

// ─── Admin pricing API ────────────────────────────────────────────────────────
// All admin endpoints require Bearer ADMIN_SECRET.
// NEXT_PUBLIC_ADMIN_SECRET is safe to expose — it is not a user credential,
// it is an ops-only token that only authorises the pricing admin dashboard.

const adminHeader = () => ({
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''}`,
});

export interface PricingRecommendation {
  id:                string;
  hotel_id:          string;
  base_price:        number;
  recommended_price: number;
  currency:          string;
  confidence_score:  number;
  reasoning:         string;
  status:            'pending' | 'accepted' | 'rejected';
  admin_note:        string | null;
  season:            'hajj' | 'umrah_peak' | 'normal';
  occupancy_pct:     number | null;
  demand_count:      number | null;
  check_in:          string | null;
  check_out:         string | null;
  created_at:        string;
  decided_at:        string | null;
}

export interface RevParRow {
  market:              string;
  bookings:            number;
  avg_revenue:         number;
  avg_effective_price: number;
  hotels:              number;
}

export interface FunnelRow {
  event_type:  string;
  country:     string;
  device_type: string;
  count:       number;
}

export const getPricingRecommendations = (status = 'pending', page = 1) =>
  api.get<{ status: string; page: number; limit: number; total: number; results: PricingRecommendation[] }>(
    '/pricing/recommendations',
    { params: { status, page }, headers: adminHeader() },
  ).then((r) => r.data);

export const acceptRecommendation = (id: string) =>
  api.post<{ ok: boolean; hotelId: string; effectivePrice: number }>(
    `/pricing/recommendations/${id}/accept`,
    {},
    { headers: adminHeader() },
  ).then((r) => r.data);

export const rejectRecommendation = (id: string, note?: string) =>
  api.post<{ ok: boolean }>(
    `/pricing/recommendations/${id}/reject`,
    { note },
    { headers: adminHeader() },
  ).then((r) => r.data);

export const getRevParMetrics = (market = 'all', period = '30d') =>
  api.get<{ market: string; period: string; data: RevParRow[] }>(
    '/pricing/metrics/revpar',
    { params: { market, period }, headers: adminHeader() },
  ).then((r) => r.data);

export const getFunnelMetrics = (period = '7d') =>
  api.get<{ period: string; data: FunnelRow[] }>(
    '/pricing/metrics/funnel',
    { params: { period }, headers: adminHeader() },
  ).then((r) => r.data);

// ─── Notification Service ─────────────────────────────────────────────────────

const NOTIF = process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL ?? 'http://localhost:3002';

const notifApi = axios.create({
  baseURL: `${NOTIF}/api/admin/notifications`,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

notifApi.interceptors.request.use((config) => {
  config.headers['Authorization'] = `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''}`;
  return config;
});

export interface IncompleteBookingRow {
  booking_id:    string;
  reference_no:  string;
  user_id:       string;
  email:         string;
  name_en:       string;
  product_type:  string;
  check_in:      string | null;
  total_price:   number;
  currency:      string;
  email_count:   number;
  last_sent_at:  string | null;
  suppressed:    boolean;
}

export interface IncompleteBookingStats {
  total_pending:    number;
  recovery_active:  number;
  suppressed:       number;
  recovered_today:  number;
}

export interface EmailLogRow {
  id:                  string;
  recipient_email:     string;
  email_type:          string;
  email_category:      string;
  booking_ref:         string | null;
  sendgrid_message_id: string | null;
  locale:              string;
  subject:             string;
  delivery_status:     string;
  attempt_number:      number | null;
  sent_at:             string;
}

export interface Campaign {
  id:               string;
  name:             string;
  subject_en:       string;
  subject_ar:       string | null;
  status:           string;
  scheduled_for:    string | null;
  total_recipients: number | null;
  sent_count:       number;
  failed_count:     number;
  opened_count:     number;
  open_rate_pct?:   number;
  created_at:       string;
}

export interface DealItem {
  title_en:    string;
  title_ar?:   string;
  price:       number;
  currency:    string;
  destination: string;
  cta_url:     string;
}

export const getIncompleteBookings = (page = 1, limit = 20) =>
  notifApi.get<{ data: IncompleteBookingRow[]; stats: IncompleteBookingStats; page: number; limit: number }>(
    '/incomplete-bookings',
    { params: { page, limit } },
  ).then((r) => r.data);

export const triggerRecoveryEmail = (bookingId: string) =>
  notifApi.post<{ queued: boolean; jobId: string }>(
    '/trigger-recovery',
    { bookingId },
  ).then((r) => r.data);

export const suppressBooking = (userId: string, bookingId: string | null, reason: string) =>
  notifApi.post<{ data: object }>(
    '/suppress',
    { userId, bookingId, reason },
  ).then((r) => r.data);

export const liftSuppression = (suppressionId: string) =>
  notifApi.post<{ data: object }>(
    `/suppress/${suppressionId}/lift`,
    {},
  ).then((r) => r.data);

export const getEmailLog = (
  filters: { emailType?: string; deliveryStatus?: string; bookingRef?: string },
  page = 1,
  limit = 50,
) =>
  notifApi.get<{ data: EmailLogRow[]; page: number; limit: number }>(
    '/email-log',
    { params: { ...filters, page, limit } },
  ).then((r) => r.data);

export const getCampaigns = (page = 1, status?: string) =>
  notifApi.get<{ data: Campaign[]; page: number; limit: number }>(
    '/campaigns',
    { params: { page, status } },
  ).then((r) => r.data);

export const createCampaign = (payload: {
  name:          string;
  subjectEn:     string;
  subjectAr?:    string;
  scheduledFor?: string;
  dealItems?:    DealItem[];
}) =>
  notifApi.post<{ data: Campaign }>('/campaigns', payload).then((r) => r.data);

export const sendCampaignNow = (campaignId: string) =>
  notifApi.post<{ data: Campaign; queued: boolean }>(
    `/campaigns/${campaignId}/send`,
    {},
  ).then((r) => r.data);

export const deleteCampaign = (campaignId: string) =>
  notifApi.delete<{ data: Campaign }>(`/campaigns/${campaignId}`).then((r) => r.data);

export const getCampaignStats = (campaignId: string) =>
  notifApi.get<{ data: Campaign }>(`/campaigns/${campaignId}/stats`).then((r) => r.data);
