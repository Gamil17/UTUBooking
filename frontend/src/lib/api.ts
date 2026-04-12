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
  // Optional enrichment fields
  reviewScore?:     number;
  propertyType?:    string;
  urgency?:         string;
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
  // Optional enrichment fields from CartTrawler
  fuelType?:          string;
  freeCancellation?:  boolean;
  hasAC?:             boolean;
  reviewCount?:       number;
  // Extended enrichment fields
  images?:            string[];
  mileageIncluded?:   string | number;
  bags?:              number;
  doors?:             number;
  fuelPolicy?:        string;
  pickupType?:        string;
  rating?:            number;
  reviewLabel?:       string;
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

// ─── Admin BFF client — hits Next.js /api/admin/* routes (cookie-authenticated) ─

/** Relative base so the browser sends the admin cookie automatically. */
const adminBff = axios.create({ baseURL: '/api/admin', timeout: 15_000 });

// ─── Admin pricing API — proxied through BFF (/api/admin/pricing/*) ──────────

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
  adminBff.get<{ status: string; page: number; limit: number; total: number; results: PricingRecommendation[] }>(
    '/pricing',
    { params: { view: 'recommendations', status, page } },
  ).then((r) => r.data);

export const acceptRecommendation = (id: string) =>
  adminBff.post<{ ok: boolean; hotelId: string; effectivePrice: number }>(
    `/pricing/recommendations/${id}/accept`,
    {},
  ).then((r) => r.data);

export const rejectRecommendation = (id: string, note?: string) =>
  adminBff.post<{ ok: boolean }>(
    `/pricing/recommendations/${id}/reject`,
    { note },
  ).then((r) => r.data);

export const getRevParMetrics = (market = 'all', period = '30d') =>
  adminBff.get<{ market: string; period: string; data: RevParRow[] }>(
    '/pricing',
    { params: { view: 'revpar', market, period } },
  ).then((r) => r.data);

export const getFunnelMetrics = (period = '7d') =>
  adminBff.get<{ period: string; data: FunnelRow[] }>(
    '/pricing',
    { params: { view: 'funnel', period } },
  ).then((r) => r.data);

// ─── Notification Service — proxied through BFF (/api/admin/notifications/*) ──

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

export interface TargetSegment {
  countries?:              string[];
  loyalty_tiers?:          string[];
  min_days_since_booking?: number;
  max_days_since_booking?: number;
}

export interface Campaign {
  id:                      string;
  name:                    string;
  subject_en:              string;
  subject_ar:              string | null;
  status:                  string;
  scheduled_for:           string | null;
  total_recipients:        number | null;
  sent_count:              number;
  failed_count:            number;
  opened_count:            number;
  click_count?:            number;
  target_segment?:         TargetSegment | null;
  open_rate_pct?:          number;
  click_rate_pct?:         number;
  click_to_open_rate_pct?: number;
  delivery_rate_pct?:      number;
  send_duration_seconds?:  number | null;
  segment_summary?:        TargetSegment | null;
  started_at?:             string | null;
  completed_at?:           string | null;
  created_at:              string;
}

export interface DealItem {
  title_en:    string;
  title_ar?:   string;
  price:       number;
  currency:    string;
  destination: string;
  cta_url:     string;
}

export interface EmailTemplate {
  id:          string;
  name:        string;
  description: string | null;
  subject_en:  string;
  subject_ar:  string | null;
  html_en:     string;
  html_ar:     string | null;
  variables:   string[];
  created_at:  string;
  updated_at:  string;
}

export const getIncompleteBookings = (page = 1, limit = 20) =>
  adminBff.get<{ data: IncompleteBookingRow[]; stats: IncompleteBookingStats; page: number; limit: number }>(
    '/notifications/incomplete',
    { params: { page, limit } },
  ).then((r) => r.data);

export const triggerRecoveryEmail = (bookingId: string) =>
  adminBff.post<{ queued: boolean; jobId: string }>(
    '/notifications/trigger-recovery',
    { bookingId },
  ).then((r) => r.data);

export const suppressBooking = (userId: string, bookingId: string | null, reason: string) =>
  adminBff.post<{ data: object }>(
    '/notifications/suppress',
    { userId, bookingId, reason },
  ).then((r) => r.data);

export const liftSuppression = (suppressionId: string) =>
  adminBff.post<{ data: object }>(
    `/notifications/suppress/${suppressionId}/lift`,
    {},
  ).then((r) => r.data);

export interface SuppressionRow {
  id:               string;
  user_id:          string | null;
  booking_id:       string | null;
  suppression_type: string;
  suppressed_by:    string | null;
  reason:           string | null;
  lifted_at:        string | null;
  created_at:       string;
  user_email:       string | null;
  user_name:        string | null;
}

export const getSuppressions = (params?: {
  page?: number; limit?: number;
  active?: boolean; email?: string; suppressionType?: string;
}) => {
  const qs = new URLSearchParams();
  if (params?.page           != null)  qs.set('page',            String(params.page));
  if (params?.limit          != null)  qs.set('limit',           String(params.limit));
  if (params?.active         != null)  qs.set('active',          String(params.active));
  if (params?.email)                   qs.set('email',           params.email);
  if (params?.suppressionType)         qs.set('suppressionType', params.suppressionType);
  return adminBff.get<{ data: SuppressionRow[]; total: number; page: number; limit: number }>(
    `/notifications/suppressions${qs.toString() ? `?${qs}` : ''}`,
  );
};

export const getEmailLog = (
  filters: { emailType?: string; deliveryStatus?: string; bookingRef?: string },
  page = 1,
  limit = 50,
) =>
  adminBff.get<{ data: EmailLogRow[]; page: number; limit: number }>(
    '/notifications/email-log',
    { params: { ...filters, page, limit } },
  ).then((r) => r.data);

export const getCampaigns = (page = 1, status?: string) =>
  adminBff.get<{ data: Campaign[]; page: number; limit: number }>(
    '/notifications/campaigns',
    { params: { page, status } },
  ).then((r) => r.data);

export const createCampaign = (payload: {
  name:            string;
  subjectEn:       string;
  subjectAr?:      string;
  scheduledFor?:   string;
  dealItems?:      DealItem[];
  targetSegment?:  TargetSegment;
}) =>
  adminBff.post<{ data: Campaign }>('/notifications/campaigns', payload).then((r) => r.data);

export const sendCampaignNow = (campaignId: string) =>
  adminBff.post<{ data: Campaign; queued: boolean }>(
    `/notifications/campaigns/${campaignId}/send`,
    {},
  ).then((r) => r.data);

export const deleteCampaign = (campaignId: string) =>
  adminBff.delete<{ data: Campaign }>(`/notifications/campaigns/${campaignId}`).then((r) => r.data);

export const duplicateCampaign = (campaignId: string) =>
  adminBff.post<{ data: Campaign }>(`/notifications/campaigns/${campaignId}/duplicate`, {}).then((r) => r.data);

export const getCampaignStats = (campaignId: string) =>
  adminBff.get<{ data: Campaign }>(`/notifications/campaigns/${campaignId}/stats`).then((r) => r.data);

export const getAudienceEstimate = (segment: TargetSegment) =>
  adminBff.get<{ estimated_recipients: number }>(
    '/notifications/campaigns/audience-estimate',
    { params: { segment: JSON.stringify(segment) } },
  ).then((r) => r.data);

// ─── Email Templates ──────────────────────────────────────────────────────────

export const getTemplates = () =>
  adminBff.get<{ data: EmailTemplate[] }>('/notifications/templates').then((r) => r.data);

export const getTemplate = (id: string) =>
  adminBff.get<{ data: EmailTemplate }>(`/notifications/templates/${id}`).then((r) => r.data);

export const createTemplate = (payload: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) =>
  adminBff.post<{ data: EmailTemplate }>('/notifications/templates', payload).then((r) => r.data);

export const updateTemplate = (id: string, payload: Partial<Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>>) =>
  adminBff.patch<{ data: EmailTemplate }>(`/notifications/templates/${id}`, payload).then((r) => r.data);

export const deleteTemplate = (id: string) =>
  adminBff.delete<{ ok: boolean }>(`/notifications/templates/${id}`).then((r) => r.data);

// ─── Admin: User Management ───────────────────────────────────────────────────

export interface AdminUser {
  id:           string;
  email:        string;
  name:         string | null;
  locale:       string;
  country:      string;
  created_at:   string;
  last_seen_at: string | null;
  status:       'active' | 'suspended';
  booking_count: number;
  total_spent:   number;
}

export interface AdminUsersResponse {
  data:  AdminUser[];
  total: number;
  page:  number;
  limit: number;
}

export const getAdminUsers = (
  params: { search?: string; status?: string; page?: number; limit?: number } = {},
) =>
  adminBff.get<AdminUsersResponse>('/users', { params: { limit: 25, ...params } }).then((r) => r.data);

export const suspendUser = (userId: string, reason: string) =>
  adminBff.post<{ data: AdminUser }>(`/users/${userId}/suspend`, { reason }).then((r) => r.data);

export const unsuspendUser = (userId: string) =>
  adminBff.post<{ data: AdminUser }>(`/users/${userId}/unsuspend`, {}).then((r) => r.data);

export const saveAdminNotes = (userId: string, notes: string) =>
  adminBff
    .patch<{ data: { id: string; admin_notes: string | null; admin_notes_updated_at: string | null } }>(
      `/users/${userId}`,
      { notes },
    )
    .then((r) => r.data);

// ─── Admin: Customer 360 Profile ─────────────────────────────────────────────

export interface CustomerBooking {
  id:               string;
  reference_no:     string;
  product_type:     'hotel' | 'flight' | 'car';
  status:           string;
  total_price:      number;
  currency:         string;
  created_at:       string;
  confirmed_at:     string | null;
  meta:             Record<string, unknown> | null;
  payment_id:       string | null;
  payment_method:   string | null;
  payment_status:   string | null;
  payment_amount:   number | null;
  payment_currency: string | null;
  paid_at:          string | null;
  refunded_at:      string | null;
  refund_amount:    number | null;
}

export interface CustomerLoyalty {
  tier:             string;
  points:           number;
  lifetime_points:  number;
  created_at:       string;
}

export interface CustomerEnquiry {
  id:          string;
  topic:       string;
  message:     string;
  booking_ref: string | null;
  status:      string;
  admin_notes: string | null;
  created_at:  string;
}

export interface AdminUserProfile {
  user:      AdminUser & {
    preferred_lang:          string;
    preferred_currency:      string;
    role:                    string;
    admin_notes:             string | null;
    admin_notes_updated_at:  string | null;
  };
  bookings:  CustomerBooking[];
  loyalty:   CustomerLoyalty | null;
  enquiries: CustomerEnquiry[];
}

export const getAdminUserProfile = (id: string) =>
  adminBff.get<{ data: AdminUserProfile }>(`/users/${id}`).then((r) => r.data);

// ─── Admin: Refunds ───────────────────────────────────────────────────────────

export interface RefundResult {
  payment_id:    string;
  booking_id:    string | null;
  status:        'refunded';
  refund_amount: number;
  currency:      string;
  refund_ref:    string | null;
  gateway:       string;
  manual:        boolean;
}

export const initiateRefund = (
  paymentId: string,
  payload: { amount?: number; reason?: 'requested_by_customer' | 'fraudulent' | 'duplicate' },
) =>
  adminBff
    .post<{ data: RefundResult }>(`/payments/${paymentId}/refund`, payload)
    .then((r) => r.data);

// ─── Admin: One-off email to customer ────────────────────────────────────────

export const sendEmailToUser = (payload: {
  email:    string;
  name:     string;
  subject:  string;
  bodyHtml: string;
}) =>
  adminBff
    .post<{ ok: boolean; messageId: string | null }>('/notifications/send-to-user', payload)
    .then((r) => r.data);

// ─── Admin: Contact Enquiry update (with assignment + priority) ───────────────

export interface ContactEnquiry {
  id:          string;
  name:        string;
  email:       string;
  topic:       string;
  message:     string;
  booking_ref: string | null;
  status:      'new' | 'read' | 'replied';
  admin_notes: string | null;
  assigned_to: string | null;
  priority:    'low' | 'normal' | 'high' | 'urgent';
  due_at:      string | null;
  created_at:  string;
  updated_at:  string;
}

export const updateEnquiry = (
  id: string,
  payload: {
    status?:     'new' | 'read' | 'replied';
    adminNotes?: string;
    assignedTo?: string;
    priority?:   'low' | 'normal' | 'high' | 'urgent';
    dueAt?:      string;
  },
) =>
  adminBff.patch<{ data: ContactEnquiry }>(`/contact/enquiries/${id}`, payload).then((r) => r.data);

// ─── Admin: Career Applications ───────────────────────────────────────────────

export type ApplicationStatus =
  | 'applied'
  | 'reviewing'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn';

export interface CareerApplication {
  id:             string;
  applicant_name: string;
  email:          string;
  phone:          string | null;
  position:       string;
  linkedin_url:   string | null;
  cover_letter?:  string;
  status:         ApplicationStatus;
  cv_filename:    string | null;
  cv_size_bytes:  number | null;
  cv_mime_type:   string | null;
  cv_s3_key:      string | null;
  admin_notes:    string | null;
  reviewed_by:    string | null;
  reviewed_at:    string | null;
  created_at:     string;
  updated_at:     string;
}

export interface CareerApplicationsResponse {
  data:  CareerApplication[];
  total: number;
  page:  number;
  limit: number;
}

export const getAdminApplications = (
  params: { search?: string; status?: string; position?: string; page?: number; limit?: number } = {},
) =>
  adminBff
    .get<CareerApplicationsResponse>('/careers/applications', { params: { limit: 25, ...params } })
    .then((r) => r.data);

export const getAdminApplication = (id: string) =>
  adminBff.get<{ data: CareerApplication }>(`/careers/applications/${id}`).then((r) => r.data);

export const updateApplicationStatus = (
  id: string,
  payload: { status: ApplicationStatus; adminNotes?: string; reviewedBy?: string },
) =>
  adminBff
    .patch<{ data: CareerApplication }>(`/careers/applications/${id}`, payload)
    .then((r) => r.data);

// ─── Admin: Platform Settings ─────────────────────────────────────────────────

export interface PlatformSettings {
  notifications: {
    recovery_delay_hours:    number;
    reminder_hours_before:   number;
    max_recovery_attempts:   number;
    price_alert_threshold:   number;
  };
  pricing: {
    hajj_surge_multiplier:   number;
    umrah_peak_multiplier:   number;
    demand_window_days:      number;
    min_confidence_to_apply: number;
  };
  maintenance: {
    mode:    boolean;
    message: string;
  };
}

export const getPlatformSettings = () =>
  adminBff.get<{ data: PlatformSettings }>('/settings').then((r) => r.data);

export const savePlatformSettings = (settings: PlatformSettings) =>
  adminBff.put<{ data: PlatformSettings }>('/settings', settings).then((r) => r.data);

// ─── Admin: Contact Enquiries ─────────────────────────────────────────────────

export type EnquiryStatus = 'new' | 'read' | 'replied';

export interface ContactEnquiriesResponse {
  data:  ContactEnquiry[];
  total: number;
  page:  number;
  limit: number;
}

export const getAdminContactEnquiries = (
  params: { search?: string; status?: string; topic?: string; priority?: string; page?: number; limit?: number } = {},
) =>
  adminBff
    .get<ContactEnquiriesResponse>('/contact/enquiries', { params: { limit: 25, ...params } })
    .then((r) => r.data);

export const updateEnquiryStatus = (id: string, status: EnquiryStatus, adminNotes?: string) =>
  adminBff
    .patch<{ data: ContactEnquiry }>(`/contact/enquiries/${id}/status`, { status, adminNotes })
    .then((r) => r.data);

// ─── Admin: Job Listings ──────────────────────────────────────────────────────

export interface JobListing {
  id:          string;
  title:       string;
  team:        string;
  location:    string;
  type:        string;
  description: string | null;
  is_active:   boolean;
  sort_order:  number;
  created_at:  string;
  updated_at:  string;
}

export interface JobListingsResponse {
  data:  JobListing[];
  total: number;
  page:  number;
  limit: number;
}

export const getAdminJobs = (
  params: { search?: string; active?: string; page?: number; limit?: number } = {},
) =>
  adminBff
    .get<JobListingsResponse>('/careers/jobs', { params: { limit: 50, ...params } })
    .then((r) => r.data);

export const createJob = (payload: Omit<JobListing, 'id' | 'is_active' | 'created_at' | 'updated_at'> & { is_active?: boolean }) =>
  adminBff.post<{ data: JobListing }>('/careers/jobs', payload).then((r) => r.data);

export const updateJob = (id: string, payload: Partial<Omit<JobListing, 'id' | 'created_at' | 'updated_at'>>) =>
  adminBff.patch<{ data: JobListing }>(`/careers/jobs/${id}`, payload).then((r) => r.data);

export const deleteJob = (id: string) =>
  adminBff.delete<{ data: { id: string; is_active: boolean } }>(`/careers/jobs/${id}`).then((r) => r.data);

// ─── Admin: Blog Posts ────────────────────────────────────────────────────────

export interface BlogPostSection {
  heading: string;
  body:    string;
}

export interface BlogPost {
  id:             string;
  slug:           string;
  category:       string;
  title:          string;
  excerpt:        string;
  published_date: string;
  read_time:      string;
  sections:       BlogPostSection[];
  is_published:   boolean;
  sort_order:     number;
  created_at:     string;
  updated_at:     string;
}

export interface BlogPostsResponse {
  data:  BlogPost[];
  total: number;
  page:  number;
  limit: number;
}

export const getAdminBlogPosts = (
  params: { search?: string; published?: string; page?: number; limit?: number } = {},
) =>
  adminBff
    .get<BlogPostsResponse>('/blog/posts', { params: { limit: 50, ...params } })
    .then((r) => r.data);

export const createBlogPost = (payload: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) =>
  adminBff.post<{ data: BlogPost }>('/blog/posts', payload).then((r) => r.data);

export const updateBlogPost = (id: string, payload: Partial<Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>>) =>
  adminBff.patch<{ data: BlogPost }>(`/blog/posts/${id}`, payload).then((r) => r.data);

export const deleteBlogPost = (id: string) =>
  adminBff.delete<{ data: { id: string; is_published: boolean } }>(`/blog/posts/${id}`).then((r) => r.data);

// ─── Payment monitoring ───────────────────────────────────────────────────────

export interface Payment {
  id:          string;
  booking_id:  string | null;
  amount:      number;
  currency:    string;
  method:      string;
  status:      'pending' | 'paid' | 'failed' | 'refunded';
  gateway_ref: string | null;
  paid_at:     string | null;
  created_at:  string;
}

export interface PaymentStats {
  total:            number;
  failed:           number;
  pending:          number;
  paid:             number;
  today_total:      number;
  today_failed:     number;
  success_rate_7d:  number | null;
  gateway_failures: { method: string; failures: number }[];
}

export interface PaymentsResponse {
  data:  Payment[];
  total: number;
  page:  number;
  limit: number;
}

export interface PaymentAuditEntry {
  id:         string;
  payment_id: string | null;
  booking_id: string | null;
  event:      string;
  gateway:    string;
  amount:     number | null;
  currency:   string;
  status:     string | null;
  meta:       Record<string, unknown>;
  created_at: string;
}

export const getAdminPaymentStats = () =>
  adminBff.get<{ data: PaymentStats }>('/payments?view=stats').then((r) => r.data);

export function getAdminPayments(p: {
  status?:  string;
  gateway?: string;
  from?:    string;
  to?:      string;
  page?:    number;
} = {}) {
  const qs = new URLSearchParams();
  if (p.status)  qs.set('status',  p.status);
  if (p.gateway) qs.set('gateway', p.gateway);
  if (p.from)    qs.set('from',    p.from);
  if (p.to)      qs.set('to',      p.to);
  if (p.page)    qs.set('page',    String(p.page));
  const query = qs.size ? `?${qs.toString()}` : '';
  return adminBff.get<PaymentsResponse>(`/payments${query}`).then((r) => r.data);
}

export const getPaymentAudit = (paymentId: string) =>
  adminBff.get<{ data: PaymentAuditEntry[] }>(`/payments/${paymentId}/audit`).then((r) => r.data);

// ─── Promo codes ──────────────────────────────────────────────────────────────

export interface PromoCode {
  id:               string;
  code:             string;
  title:            string;
  description:      string | null;
  discount_type:    'percent' | 'fixed';
  discount_value:   number;
  currency:         string;
  min_order_amount: number;
  max_uses:         number | null;
  uses_count:       number;
  expires_at:       string | null;
  is_active:        boolean;
  sort_order:       number;
  created_at:       string;
  updated_at:       string;
}

export interface ValidatePromoResult {
  valid:          boolean;
  code:           string;
  title:          string;
  discount_type:  'percent' | 'fixed';
  discount_value: number;
  currency:       string;
}

export interface PromoCodesResponse {
  data:  PromoCode[];
  total: number;
  page:  number;
  limit: number;
}

export const getAdminPromoCodes = (
  params: { search?: string; active?: string; page?: number; limit?: number } = {},
) =>
  adminBff.get<PromoCodesResponse>('/promo-codes', { params: { limit: 50, ...params } }).then((r) => r.data);

export const createPromoCode = (
  payload: Omit<PromoCode, 'id' | 'uses_count' | 'created_at' | 'updated_at'>,
) =>
  adminBff.post<{ data: PromoCode }>('/promo-codes', payload).then((r) => r.data);

export const updatePromoCode = (id: string, payload: Partial<Omit<PromoCode, 'id' | 'created_at' | 'updated_at'>>) =>
  adminBff.patch<{ data: PromoCode }>(`/promo-codes/${id}`, payload).then((r) => r.data);

export const deletePromoCode = (id: string) =>
  adminBff.delete<{ data: { id: string; code: string; is_active: boolean } }>(`/promo-codes/${id}`).then((r) => r.data);

// ─── Admin: Loyalty Program ───────────────────────────────────────────────────

export interface LoyaltyStats {
  total_members:            number;
  silver:                   number;
  gold:                     number;
  platinum:                 number;
  total_points_outstanding: number;
  total_lifetime_points:    number;
}

export interface LoyaltyMember {
  id:              string;
  user_id:         string;
  tier:            'bronze' | 'silver' | 'gold' | 'platinum';
  points:          number;
  lifetime_points: number;
  created_at:      string;
}

export interface LoyaltyMembersResponse {
  data:  LoyaltyMember[];
  total: number;
  page:  number;
  limit: number;
}

export interface LoyaltyLedgerEntry {
  id:         string;
  user_id:    string;
  booking_id: string | null;
  points:     number;
  action:     string;
  note:       string | null;
  created_at: string;
}

export interface LoyaltyReward {
  id:           string;
  name_en:      string;
  name_ar:      string | null;
  points_cost:  number;
  type:         string;
  discount_sar: number;
  valid_until:  string | null;
  is_active:    boolean;
  created_at:   string;
}

export interface LoyaltyRewardsResponse {
  data:  LoyaltyReward[];
  total: number;
  page:  number;
  limit: number;
}

export const getAdminLoyaltyStats = () =>
  adminBff.get<{ data: LoyaltyStats }>('/loyalty?view=stats').then((r) => r.data);

export const getAdminLoyaltyMembers = (
  params: { search?: string; tier?: string; page?: number; limit?: number } = {},
) => {
  const qs = new URLSearchParams({ view: 'members', limit: '50', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  return adminBff.get<LoyaltyMembersResponse>(`/loyalty?${qs.toString()}`).then((r) => r.data);
};

export const getAdminLoyaltyLedger = (userId: string) =>
  adminBff.get<{ data: LoyaltyLedgerEntry[] }>(`/loyalty/members/${userId}/ledger`).then((r) => r.data);

// ─────────────────────────────────────────────────────────────────────────────

export const getAdminLoyaltyRewards = (
  params: { active?: string; page?: number; limit?: number } = {},
) =>
  adminBff.get<LoyaltyRewardsResponse>('/loyalty/rewards', { params: { limit: 50, ...params } }).then((r) => r.data);

export const createLoyaltyReward = (
  payload: Omit<LoyaltyReward, 'id' | 'created_at'>,
) =>
  adminBff.post<{ data: LoyaltyReward }>('/loyalty/rewards', payload).then((r) => r.data);

export const updateLoyaltyReward = (id: string, payload: Partial<Omit<LoyaltyReward, 'id' | 'created_at'>>) =>
  adminBff.patch<{ data: LoyaltyReward }>(`/loyalty/rewards/${id}`, payload).then((r) => r.data);

export const deleteLoyaltyReward = (id: string) =>
  adminBff.delete<{ data: { id: string; is_active: boolean } }>(`/loyalty/rewards/${id}`).then((r) => r.data);

// ─── Inventory (admin service — hotels / flights / cars) ──────────────────────

export interface InventoryHotel {
  id:                 string;
  hotel_id:           string | null;
  name:               string;
  name_ar:            string | null;
  stars:              number | null;
  location:           string;
  distance_haram_m:   number | null;
  price_per_night:    number;
  currency:           string;
  is_hajj_package:    boolean;
  is_umrah_package:   boolean;
  is_halal_friendly:  boolean;
  is_active:          boolean;
  created_at:         string;
}

export interface InventoryFlight {
  id:               string;
  flight_num:       string;
  airline_code:     string;
  origin:           string;
  dest:             string;
  departure:        string;
  arrival:          string;
  cabin_class:      string;
  seats_available:  number;
  price:            number;
  currency:         string;
  is_active:        boolean;
}

export interface InventoryCar {
  id:               string;
  vendor_name:      string;
  vehicle_type:     string;
  model:            string;
  seats:            number;
  transmission:     string;
  pickup_location:  string;
  available_from:   string;
  available_to:     string;
  price_per_day:    number;
  currency:         string;
  is_active:        boolean;
}

export const getAdminInventoryHotels = (params: { search?: string; limit?: number; offset?: number } = {}) =>
  adminBff.get<{ total: number; rows: InventoryHotel[] }>('/inventory/hotels', { params }).then((r) => r.data);

export const toggleAdminInventoryHotel = (id: string) =>
  adminBff.patch<{ id: string; name: string; is_active: boolean }>(`/inventory/hotels/${id}/toggle`).then((r) => r.data);

export const getAdminInventoryFlights = (params: { limit?: number; offset?: number } = {}) =>
  adminBff.get<{ total: number; rows: InventoryFlight[] }>('/inventory/flights', { params }).then((r) => r.data);

export const getAdminInventoryCars = (params: { limit?: number; offset?: number } = {}) =>
  adminBff.get<{ total: number; rows: InventoryCar[] }>('/inventory/cars', { params }).then((r) => r.data);

// ─── Pending users (admin service) ───────────────────────────────────────────

export interface PendingUser {
  id:         string;
  email:      string;
  name:       string | null;
  country:    string | null;
  status:     string;
  created_at: string;
}

export const getAdminPendingUsers = (params: { limit?: number; offset?: number } = {}) =>
  adminBff.get<{ total: number; rows: PendingUser[] }>('/pending-users', { params }).then((r) => r.data);

export const approveUser = (id: string) =>
  adminBff.post<{ message: string; user: PendingUser }>(`/pending-users/${id}/approve`).then((r) => r.data);

export const rejectUser = (id: string, reason?: string) =>
  adminBff.post<{ message: string; user: PendingUser }>(`/pending-users/${id}/reject`, { reason }).then((r) => r.data);

// ─── Audit log (admin service) ────────────────────────────────────────────────

export interface AuditLogEntry {
  id:           string;
  action:       string;
  meta:         Record<string, unknown> | null;
  created_at:   string;
  admin_email:  string | null;
  admin_name:   string | null;
  target_email: string | null;
  target_name:  string | null;
}

export const getAdminAuditLog = (params: { limit?: number; offset?: number } = {}) =>
  adminBff.get<{ total: number; rows: AuditLogEntry[] }>('/audit-log', { params }).then((r) => r.data);

// ─── Country admins (admin service) ──────────────────────────────────────────

export interface CountryAdmin {
  id:            string;
  email:         string;
  name:          string | null;
  admin_country: string;
  status:        string;
  created_at:    string;
}

export const getAdminCountryAdmins = () =>
  adminBff.get<{ total: number; rows: CountryAdmin[] }>('/country-admins').then((r) => r.data);

export const assignCountryAdmin = (user_id: string, country: string) =>
  adminBff.post<{ message: string; user: CountryAdmin }>('/country-admins', { user_id, country }).then((r) => r.data);

export const removeCountryAdmin = (id: string) =>
  adminBff.delete<{ message: string; user: CountryAdmin }>(`/country-admins/${id}`).then((r) => r.data);

// ─── Platform stats (admin service overview) ──────────────────────────────────

export interface PlatformStats {
  users:    number;
  pending:  number;
  hotels:   number | null;
  flights:  number | null;
  cars:     number | null;
  revenue:  number | null;
}

export const getAdminPlatformStats = () =>
  adminBff.get<PlatformStats>('/platform-stats').then((r) => r.data);

// ─── Tenants (whitelabel service) ─────────────────────────────────────────────

export interface Tenant {
  id:                     string;
  slug:                   string;
  name:                   string;
  domain:                 string;
  custom_domain:          string | null;
  logo_url:               string | null;
  primary_color:          string;
  secondary_color:        string;
  currency:               string;
  locale:                 string;
  active:                 boolean;
  created_at:             string;
  updated_at:             string;
  commission_rates:       { hotel: number; flight: number; car: number };
  enabled_modules:        string[];
  hide_platform_branding: boolean;
  revenue_share_pct:      number;
}

export interface TenantAnalyticsRow {
  product_type: string;
  bookings:     number;
  gmv:          number;
  avg_order:    number;
}

export const getAdminTenants = (params: { search?: string; limit?: number; offset?: number } = {}) =>
  adminBff.get<{ total: number; rows: Tenant[] }>('/tenants', { params }).then((r) => r.data);

export const getAdminTenant = (id: string) =>
  adminBff.get<Tenant>(`/tenants/${id}`).then((r) => r.data);

export const createAdminTenant = (payload: Partial<Tenant> & { slug: string; name: string; domain: string }) =>
  adminBff.post<{ tenant: Tenant; config: Record<string, unknown> }>('/tenants', payload).then((r) => r.data);

export const updateAdminTenant = (id: string, payload: Partial<Tenant>) =>
  adminBff.patch<Tenant>(`/tenants/${id}`, payload).then((r) => r.data);

export const getAdminTenantAnalytics = (id: string, from: string, to: string) =>
  adminBff.get<{ tenant_id: string; from: string; to: string; breakdown: TenantAnalyticsRow[] }>(
    `/tenants/${id}/analytics`, { params: { from, to } }
  ).then((r) => r.data);

// ─── Admin bookings ───────────────────────────────────────────────────────────

export interface AdminBooking {
  id:              string;
  reference_no:    string;
  product_type:    'hotel' | 'flight' | 'car';
  status:          'pending' | 'confirmed' | 'cancelled' | 'refunded';
  total_price:     number;
  currency:        string;
  created_at:      string;
  confirmed_at:    string | null;
  user_email:      string | null;
  user_name:       string | null;
  meta:            Record<string, unknown>;
  payment_status:  string | null;
  payment_method:  string | null;
}

export interface BookingStats {
  total:             number;
  pending:           number;
  confirmed:         number;
  cancelled:         number;
  refunded:          number;
  hotels:            number;
  flights:           number;
  cars:              number;
  confirmed_revenue: number;
  gross_revenue:     number;
}

export const getAdminBookingStats = () =>
  adminBff.get<BookingStats>('/bookings?view=stats').then((r) => r.data);

export const getAdminBookings = (params: {
  search?: string;
  status?: string;
  product_type?: string;
  limit?: number;
  offset?: number;
} = {}) =>
  adminBff.get<{ total: number; rows: AdminBooking[] }>('/bookings', { params }).then((r) => r.data);

export const getAdminBooking = (id: string) =>
  adminBff.get<AdminBooking>(`/bookings/${id}`).then((r) => r.data);

export const updateAdminBookingStatus = (id: string, status: string) =>
  adminBff.patch<{ id: string; reference_no: string; status: string }>(`/bookings/${id}`, { status }).then((r) => r.data);

// ─── Admin: Wallet ────────────────────────────────────────────────────────────

export interface WalletCurrencyStat {
  currency:          string;
  wallet_count:      number;
  total_outstanding: number;
  avg_balance:       number;
}

export interface WalletStats {
  byCurrency:   WalletCurrencyStat[];
  transactions: {
    total:           number;
    topups:          number;
    debits:          number;
    conversions:     number;
    refunds:         number;
    total_topped_up: number;
  };
}

export interface WalletRow {
  id:         string;
  user_id:    string;
  currency:   string;
  balance:    number;
  updated_at: string;
  tx_count:   number;
}

export interface WalletTransaction {
  id:         string;
  amount:     number;
  type:       string;
  note:       string | null;
  created_at: string;
  user_id:    string;
  currency:   string;
}

export interface WalletCreditResult {
  walletId:   string;
  userId:     string;
  currency:   string;
  credited:   number;
  newBalance: number;
}

export const getAdminWalletStats = () =>
  adminBff.get<{ data: WalletStats }>('/wallet?view=stats').then((r) => r.data);

export const getAdminWalletBalances = (
  params: { search?: string; currency?: string; page?: number; limit?: number } = {},
) =>
  adminBff
    .get<{ data: WalletRow[]; total: number; page: number; limit: number }>(
      '/wallet?view=balances',
      { params },
    )
    .then((r) => r.data);

export const getAdminWalletTransactions = (
  params: { type?: string; page?: number; limit?: number } = {},
) =>
  adminBff
    .get<{ data: WalletTransaction[]; total: number; page: number; limit: number }>(
      '/wallet/transactions',
      { params },
    )
    .then((r) => r.data);

export const creditUserWallet = (payload: {
  userId:   string;
  currency: string;
  amount:   number;
  note?:    string;
}) =>
  adminBff.post<{ data: WalletCreditResult }>('/wallet/credit', payload).then((r) => r.data);

// ─── Marketing — Content Calendar ────────────────────────────────────────────

export type CalendarStatus = 'planned' | 'draft' | 'review' | 'approved' | 'published';

export interface CalendarEntry {
  id:           string;
  title:        string;
  keyword:      string | null;
  slug:         string | null;
  language:     string;
  status:       CalendarStatus;
  post_type:    string;
  publish_week: string | null;
  utm_campaign: string | null;
  file_path:    string | null;
  notes:        string | null;
  created_at:   string;
  updated_at:   string;
}

export interface DraftFile {
  filename:     string;
  title:        string;
  keyword:      string | null;
  language:     string;
  status:       string;
  utm_campaign: string | null;
  date:         string | null;
  word_count:   number;
  size_bytes:   number;
}

export const getCalendar = (
  params: { status?: string; language?: string; month?: string; page?: number } = {},
) =>
  adminBff
    .get<{ data: CalendarEntry[]; total: number; page: number; limit: number }>(
      '/marketing/calendar',
      { params },
    )
    .then((r) => r.data);

export const createCalendarEntry = (payload: Omit<CalendarEntry, 'id' | 'created_at' | 'updated_at'>) =>
  adminBff.post<{ data: CalendarEntry }>('/marketing/calendar', payload).then((r) => r.data);

export const updateCalendarEntry = (id: string, payload: Partial<CalendarEntry>) =>
  adminBff.patch<{ data: CalendarEntry }>(`/marketing/calendar/${id}`, payload).then((r) => r.data);

export const deleteCalendarEntry = (id: string) =>
  adminBff.delete<{ data: { id: string } }>(`/marketing/calendar/${id}`).then((r) => r.data);

export const getDraftFiles = () =>
  adminBff.get<{ data: DraftFile[]; total: number }>('/marketing/drafts').then((r) => r.data);

export const getDraftContent = (filename: string) =>
  adminBff
    .post<{ data: { filename: string; meta: Record<string, string>; body: string } }>(
      '/marketing/drafts',
      { filename },
    )
    .then((r) => r.data);

// ─── Marketing — Consent Log ──────────────────────────────────────────────────

export interface ConsentRow {
  user_id:      string;
  email:        string;
  country_code: string;
  consent_type: string;
  granted:      boolean;
  timestamp:    string;
}

export const getConsentLog = (params: {
  email?:   string;
  country?: string;
  status?:  'granted' | 'revoked' | 'all';
  page?:    number;
  limit?:   number;
} = {}) =>
  adminBff.get<{ data: ConsentRow[]; total: number; page: number; limit: number }>(
    '/marketing/consent',
    { params },
  ).then((r) => r.data);

// ─── Marketing — Unified Timeline ────────────────────────────────────────────

export interface TimelineItem {
  id:           string;
  title:        string;
  item_type:    'content' | 'campaign';
  status:       string;
  language:     string | null;
  publish_week: string | null;
  utm_campaign: string | null;
  scheduled_for: string | null;
  created_at:   string;
}

export const getMarketingTimeline = (params: { month?: string; page?: number; limit?: number } = {}) =>
  adminBff.get<{ data: TimelineItem[]; total: number; page: number; limit: number }>(
    '/marketing/timeline',
    { params },
  ).then((r) => r.data);

// ─── CRM ─────────────────────────────────────────────────────────────────────

export type DealStage = 'lead' | 'qualified' | 'demo' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type DealType  = 'b2b_whitelabel' | 'hotel_partner' | 'airline' | 'investor' | 'other';
export type ActivityType = 'call' | 'email' | 'demo' | 'meeting' | 'proposal_sent' | 'follow_up' | 'note' | 'won' | 'lost';
export type HotelPartnerStatus = 'not_contacted' | 'emailed' | 'replied' | 'meeting_scheduled' | 'signed' | 'live' | 'rejected';

export interface CrmDeal {
  id:                  string;
  title:               string;
  partner_name:        string;
  partner_country:     string | null;
  deal_type:           DealType;
  stage:               DealStage;
  value_amount:        number | null;
  value_currency:      string;
  deal_owner:          string | null;
  ceo_review_required: boolean;
  ceo_approved_at:     string | null;
  ceo_approved_by:     string | null;
  proposal_file_path:  string | null;
  notes:               string | null;
  next_action:         string | null;
  next_action_date:    string | null;
  contact_count:       number;
  activity_count:      number;
  created_at:          string;
  updated_at:          string;
}

export interface CrmContact {
  id:           string;
  deal_id:      string;
  name:         string;
  title:        string | null;
  email:        string | null;
  phone:        string | null;
  linkedin_url: string | null;
  notes:        string | null;
  created_at:   string;
}

export interface CrmActivity {
  id:           string;
  deal_id:      string;
  type:         ActivityType;
  summary:      string;
  performed_by: string | null;
  performed_at: string;
  created_at:   string;
}

export interface HotelPartner {
  id:               string;
  hotel_name:       string;
  city:             string | null;
  country:          string | null;
  distance_haram_m: number | null;
  stars:            number | null;
  contact_name:     string | null;
  contact_email:    string | null;
  outreach_status:  HotelPartnerStatus;
  notes:            string | null;
  created_at:       string;
  updated_at:       string;
}

// Deals
export const getCrmDeals = (params: { stage?: string; type?: string; search?: string; deal_owner?: string; page?: number; limit?: number } = {}) =>
  adminBff.get<{ data: CrmDeal[]; total: number; page: number; limit: number }>('/crm/deals', { params }).then(r => r.data);

export const getCrmDeal = (id: string) =>
  adminBff.get<{ data: CrmDeal & { contacts: CrmContact[]; activities: CrmActivity[] } }>(`/crm/deals/${id}`).then(r => r.data);

export const createCrmDeal = (payload: Partial<CrmDeal>) =>
  adminBff.post<{ data: CrmDeal }>('/crm/deals', payload).then(r => r.data);

export const updateCrmDeal = (id: string, payload: Partial<CrmDeal>) =>
  adminBff.patch<{ data: CrmDeal }>(`/crm/deals/${id}`, payload).then(r => r.data);

export const deleteCrmDeal = (id: string) =>
  adminBff.delete<{ data: { id: string } }>(`/crm/deals/${id}`).then(r => r.data);

// Contacts
export const addCrmContact = (dealId: string, payload: Partial<CrmContact>) =>
  adminBff.post<{ data: CrmContact }>(`/crm/deals/${dealId}/contacts`, payload).then(r => r.data);

export const deleteCrmContact = (contactId: string) =>
  adminBff.delete<{ data: { id: string } }>(`/crm/contacts/${contactId}`).then(r => r.data);

// Activities
export const getCrmActivities = (dealId: string) =>
  adminBff.get<{ data: CrmActivity[] }>(`/crm/deals/${dealId}/activities`).then(r => r.data);

export const logCrmActivity = (dealId: string, payload: { type: ActivityType; summary: string; performed_by?: string; performed_at?: string }) =>
  adminBff.post<{ data: CrmActivity }>(`/crm/deals/${dealId}/activities`, payload).then(r => r.data);

// Hotel Partners
export const getHotelPartners = (params: { status?: string; search?: string; page?: number; limit?: number } = {}) =>
  adminBff.get<{ data: HotelPartner[]; total: number; page: number; limit: number }>('/crm/hotel-partners', { params }).then(r => r.data);

export const createHotelPartner = (payload: Partial<HotelPartner>) =>
  adminBff.post<{ data: HotelPartner }>('/crm/hotel-partners', payload).then(r => r.data);

export const updateHotelPartner = (id: string, payload: Partial<HotelPartner>) =>
  adminBff.patch<{ data: HotelPartner }>(`/crm/hotel-partners/${id}`, payload).then(r => r.data);

export const deleteHotelPartner = (id: string) =>
  adminBff.delete<{ data: { id: string } }>(`/crm/hotel-partners/${id}`).then(r => r.data);

// ─── Proposal file browser ────────────────────────────────────────────────────

export interface ProposalFile {
  path:     string;
  size:     number;
  modified: string;
}

export interface ProposalContent {
  path:     string;
  content:  string;
  words:    number;
  size:     number;
  modified: string;
}

export const getProposalFiles = () =>
  adminBff.get<{ data: ProposalFile[]; total: number }>('/crm/proposals').then(r => r.data);

export const getProposalContent = (file: string) =>
  adminBff.get<{ data: ProposalContent }>(`/crm/proposals?file=${encodeURIComponent(file)}`).then(r => r.data);

// ─── CRM Stats + Overdue ──────────────────────────────────────────────────────

export interface CrmStats {
  pipeline_sar:         number;
  active_deals:         number;
  ceo_pending:          number;
  overdue_actions:      number;
  won_this_month_count: number;
  won_this_month_sar:   number;
  stages:               Record<string, number>;
  hotel_partners:       Record<string, number>;
  funnel?: {
    conversion_rates:   Record<string, number | null>;
    win_rate_pct:       number | null;
    avg_days_per_stage: Record<string, number | null>;
  };
}

export interface OverdueDeal {
  id:                   string;
  title:                string;
  partner_name:         string;
  stage:                string;
  deal_owner:           string | null;
  next_action:          string | null;
  next_action_date:     string;
  expected_close_date:  string | null;
  value_amount:         number | null;
  value_currency:       string;
  days_overdue:         number;
}

export const getCrmStats = () =>
  adminBff.get<{ data: CrmStats }>('/crm/stats').then(r => r.data);

export const getCrmOverdue = () =>
  adminBff.get<{ data: OverdueDeal[]; count: number }>('/crm/overdue').then(r => r.data);

// ─── CRM — new: stage history, change log, funnel ────────────────────────────

export interface CrmDealChange {
  id:         string;
  deal_id:    string;
  field:      string;
  old_value:  string | null;
  new_value:  string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface FunnelStage {
  stage:    string;
  count:    number;
  entries:  number;
  avg_days: number | null;
  min_days: number | null;
  max_days: number | null;
}

export interface CrmFunnel {
  stages:           FunnelStage[];
  conversion_rates: Record<string, number | null>;
  win_rate_pct:     number | null;
  won_count:        number;
  lost_count:       number;
}

export const getDealChanges = (dealId: string, limit?: number) =>
  adminBff.get<{ data: CrmDealChange[] }>(`/crm/deals/${dealId}/changes`, { params: limit ? { limit } : {} }).then(r => r.data);

export const getCrmFunnel = () =>
  adminBff.get<{ data: CrmFunnel }>('/crm/funnel').then(r => r.data);

// ─── CRM — Contacts directory ─────────────────────────────────────────────────

export interface CrmContactWithDeal extends CrmContact {
  deal_title:   string;
  deal_stage:   string;
  deal_partner: string;
}

export const getContacts = (params: { search?: string; page?: number; limit?: number } = {}) =>
  adminBff.get<{ data: CrmContactWithDeal[]; total: number; page: number; limit: number }>('/crm/contacts', { params }).then(r => r.data);

export const searchContacts = (params: { email?: string; name?: string; page?: number; limit?: number }) =>
  adminBff.get<{ data: CrmContactWithDeal[]; count: number }>('/crm/contacts/search', { params }).then(r => r.data);

// ─── CRM — Sales Reps + Quotas ────────────────────────────────────────────────

export interface SalesRep {
  id:        string;
  name:      string;
  email:     string | null;
  region:    string | null;
  is_active: boolean;
  quotas:    RepQuota[];
  created_at: string;
  updated_at: string;
}

export interface RepQuota {
  id:         string;
  rep_id:     string;
  year:       number;
  quarter:    number;
  target_sar: number;
  created_at: string;
}

export interface RepQuarterAttainment {
  quarter:          number;
  target_sar:       number;
  won_sar:          number;
  attainment_pct:   number | null;
  won_deals_count:  number;
}

export interface RepAttainment {
  rep:              SalesRep;
  year:             number;
  quarter:          number | 'all';
  target_sar:       number;
  won_sar:          number;
  attainment_pct:   number | null;
  won_deals_count:  number;
  by_quarter:       RepQuarterAttainment[];
}

export const getSalesReps = () =>
  adminBff.get<{ data: SalesRep[] }>('/crm/reps').then(r => r.data);

export const createSalesRep = (payload: { name: string; email?: string; region?: string }) =>
  adminBff.post<{ data: SalesRep }>('/crm/reps', payload).then(r => r.data);

export const updateSalesRep = (id: string, payload: Partial<Pick<SalesRep, 'name' | 'email' | 'region' | 'is_active'>>) =>
  adminBff.patch<{ data: SalesRep }>(`/crm/reps/${id}`, payload).then(r => r.data);

export const deleteSalesRep = (id: string) =>
  adminBff.delete<{ data: { id: string } }>(`/crm/reps/${id}`).then(r => r.data);

export const assignRepQuota = (repId: string, payload: { year: number; quarter: number; target_sar: number }) =>
  adminBff.post<{ data: RepQuota }>(`/crm/reps/${repId}/quotas`, payload).then(r => r.data);

export const getRepAttainment = (repId: string, params: { year?: number; quarter?: number } = {}) =>
  adminBff.get<{ data: RepAttainment }>(`/crm/reps/${repId}/attainment`, { params }).then(r => r.data);

// ─── Finance ──────────────────────────────────────────────────────────────────

export interface FinanceSummary {
  today_sar:           number;
  week_sar:            number;
  month_sar:           number;
  ytd_sar:             number;
  total_confirmed:     number;
  today_count:         number;
  month_count:         number;
  by_product:          { hotel: number; flight: number; car: number };
  by_currency:         Record<string, { count: number; revenue: number }>;
  refunds_month_count: number;
  refunds_month_sar:   number;
  reconciliation: {
    bookings_sar:    number;
    payments_sar:    number;
    discrepancy_pct: number;
    status:          'ok' | 'warning' | 'alert';
  };
}

export interface DailyRevenue {
  day:           string;
  booking_count: number;
  revenue_sar:   number;
}

export interface RefundRecord {
  id:            string;
  booking_id:    string;
  reference_no:  string | null;
  product_type:  string | null;
  amount:        number;
  currency:      string;
  refund_amount: number | null;
  gateway_ref:   string | null;
  user_email:    string | null;
  user_name:     string | null;
  refunded_at:   string;
}

export interface ReconciliationReport {
  confirmed_no_payment: {
    count:     number;
    total_sar: number;
    sample:    Array<{ id: string; reference_no: string; product_type: string; total_price: number; currency: string; created_at: string; user_email: string }>;
  };
  paid_no_confirmed: { count: number; total_sar: number };
  status: 'clean' | 'discrepancies_found';
}

export const getFinanceSummary = () =>
  adminBff.get<{ data: FinanceSummary }>('/finance?view=summary').then(r => r.data);

export const getFinanceDaily = (days = 30) =>
  adminBff.get<{ data: DailyRevenue[]; days: number }>(`/finance?view=daily&days=${days}`).then(r => r.data);

export const getFinanceRefunds = (page = 1, limit = 50) =>
  adminBff.get<{ data: RefundRecord[]; total: number; page: number }>(`/finance?view=refunds&page=${page}&limit=${limit}`).then(r => r.data);

export const getFinanceReconciliation = () =>
  adminBff.get<{ data: ReconciliationReport }>('/finance?view=reconciliation').then(r => r.data);

// ─── Hotel Partner Activities ─────────────────────────────────────────────────

export type HpActivityType = 'call' | 'email' | 'meeting' | 'follow_up' | 'note' | 'signed' | 'rejected';

export interface HpActivity {
  id:           string;
  partner_id:   string;
  type:         HpActivityType;
  summary:      string;
  performed_by: string | null;
  performed_at: string;
  created_at:   string;
}

export const getHpActivities = (partnerId: string) =>
  adminBff.get<{ data: HpActivity[] }>(`/crm/hotel-partners/${partnerId}/activities`).then(r => r.data);

export const logHpActivity = (partnerId: string, payload: { type: HpActivityType; summary: string; performed_by?: string }) =>
  adminBff.post<{ data: HpActivity }>(`/crm/hotel-partners/${partnerId}/activities`, payload).then(r => r.data);

// ─── HR Department ────────────────────────────────────────────────────────────

export type EmployeeStatus = 'active' | 'on_leave' | 'terminated';
export type EmploymentType = 'full_time' | 'part_time' | 'contractor' | 'intern';
export type LeaveType      = 'annual' | 'sick' | 'emergency' | 'maternity' | 'paternity' | 'unpaid';
export type LeaveStatus    = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface HrDepartment {
  id:             string;
  name:           string;
  employee_count: number;
  created_at:     string;
}

export interface HrEmployee {
  id:              string;
  full_name:       string;
  email:           string;
  phone?:          string;
  role:            string;
  department_id?:  string;
  department_name?: string;
  manager_id?:     string;
  manager_name?:   string;
  location?:       string;
  hire_date:       string;
  status:          EmployeeStatus;
  employment_type: EmploymentType;
  salary_sar?:     number;
  created_at:      string;
  updated_at:      string;
}

export interface HrLeaveRequest {
  id:           string;
  employee_id:  string;
  employee_name?: string;
  leave_type:   LeaveType;
  start_date:   string;
  end_date:     string;
  days:         number;
  reason?:      string;
  status:       LeaveStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  created_at:   string;
  updated_at:   string;
}

export interface HrStats {
  total:         number;
  active:        number;
  on_leave:      number;
  terminated:    number;
  contractors:   number;
  interns:       number;
  new_hires_30d: number;
  by_department: { name: string; count: number }[];
}

export const getHrStats = () =>
  adminBff.get<{ data: HrStats }>('/hr?view=stats');

export const getHrEmployees = (params?: {
  department_id?: string; status?: string; search?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'employees' });
  if (params?.department_id) qs.set('department_id', params.department_id);
  if (params?.status)        qs.set('status', params.status);
  if (params?.search)        qs.set('search', params.search);
  if (params?.page)          qs.set('page', String(params.page));
  if (params?.limit)         qs.set('limit', String(params.limit));
  return adminBff.get<{ data: HrEmployee[]; total: number; page: number; limit: number }>(`/hr?${qs}`);
};

export const createHrEmployee = (data: Partial<HrEmployee>) =>
  adminBff.post<{ data: HrEmployee }>('/hr/employees', data);

export const updateHrEmployee = (id: string, data: Partial<HrEmployee>) =>
  adminBff.patch<{ data: HrEmployee }>(`/hr/employees/${id}`, data);

export const deleteHrEmployee = (id: string) =>
  adminBff.delete<{ success: boolean }>(`/hr/employees/${id}`);

export const getHrDepartments = () =>
  adminBff.get<{ data: HrDepartment[] }>('/hr?view=departments');

export const createHrDepartment = (name: string) =>
  adminBff.post<{ data: HrDepartment }>('/hr/departments', { name });

export const updateHrDepartment = (id: string, name: string) =>
  adminBff.patch<{ data: HrDepartment }>(`/hr/departments/${id}`, { name });

export const deleteHrDepartment = (id: string) =>
  adminBff.delete<{ success: boolean }>(`/hr/departments/${id}`);

export const getHrLeave = (params?: {
  status?: string; employee_id?: string; month?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'leave' });
  if (params?.status)      qs.set('status', params.status);
  if (params?.employee_id) qs.set('employee_id', params.employee_id);
  if (params?.month)       qs.set('month', params.month);
  if (params?.page)        qs.set('page', String(params.page));
  if (params?.limit)       qs.set('limit', String(params.limit));
  return adminBff.get<{ data: HrLeaveRequest[]; total: number; page: number; limit: number }>(`/hr?${qs}`);
};

export const createHrLeave = (data: {
  employee_id: string; leave_type: LeaveType;
  start_date: string; end_date: string; reason?: string;
}) => adminBff.post<{ data: HrLeaveRequest }>('/hr/leave', data);

export const updateHrLeave = (id: string, data: {
  status?: LeaveStatus; reviewed_by?: string; admin_notes?: string;
}) => adminBff.patch<{ data: HrLeaveRequest }>(`/hr/leave/${id}`, data);

// ─── HR — Leave Balances (v2.0.1) ────────────────────────────────────────────

export interface HrLeaveBalance {
  id:             string;
  employee_id:    string;
  year:           number;
  leave_type:     'annual' | 'sick' | 'maternity' | 'paternity';
  allocated_days: number;
  used_days:      number;
  adjusted_days:  number;
}

export interface HrLeaveBalanceOverviewRow {
  id:                  string;
  full_name:           string;
  department_id?:      string;
  department_name?:    string;
  annual_remaining:    number;
  sick_remaining:      number;
  maternity_remaining: number;
  paternity_remaining: number;
}

export const getLeaveBalances = (employee_id: string, year: number) => {
  const qs = new URLSearchParams({ view: 'leave-balances', employee_id, year: String(year) });
  return adminBff.get<{ data: HrLeaveBalance[] }>(`/hr?${qs}`);
};

export const getLeaveBalancesOverview = (year: number, department_id?: string) => {
  const qs = new URLSearchParams({ view: 'leave-balances-overview', year: String(year) });
  if (department_id) qs.set('department_id', department_id);
  return adminBff.get<{ data: HrLeaveBalanceOverviewRow[] }>(`/hr?${qs}`);
};

export const adjustLeaveBalance = (id: string, adjusted_days: number) =>
  adminBff.patch<{ data: HrLeaveBalance }>(`/hr/leave-balances/${id}`, { adjusted_days });

export const seedLeaveBalances = (year: number) =>
  adminBff.post<{ seeded: number; employees: number; year: number }>('/hr/leave-balances', { year });

// ─── HR — Org Chart (v2.0.1) ─────────────────────────────────────────────────

export interface OrgChartNode {
  id:               string;
  full_name:        string;
  role:             string;
  department_id?:   string;
  department_name?: string;
  manager_id?:      string;
  depth:            number;
  children?:        OrgChartNode[];
}

export const getOrgChart = () =>
  adminBff.get<{ data: OrgChartNode[] }>('/hr?view=org-chart');

// ─── HR — Bulk Import (v2.0.1) ───────────────────────────────────────────────

export interface ImportEmployeeRow {
  full_name:         string;
  email:             string;
  role:              string;
  hire_date:         string;
  department_name?:  string;
  employment_type?:  string;
  location?:         string;
  phone?:            string;
  salary_sar?:       string;
}

export interface ImportResult {
  success: number;
  failed:  number;
  errors:  { row: number; field: string; message: string }[];
}

export const importEmployees = (employees: ImportEmployeeRow[]) =>
  adminBff.post<ImportResult>('/hr/employees/import', { employees });

// ─────────────────────────────────────────────────────────────────────────────
// Compliance Department — v2.1.0
// ─────────────────────────────────────────────────────────────────────────────

export type ErasureStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';
export type ComplianceLaw = 'GDPR' | 'CCPA' | 'LGPD' | 'PIPEDA' | 'KVKK';

export interface ErasureRequest {
  id: string;
  user_id: string;
  email_snapshot: string;
  requested_at: string;
  completed_at?: string;
  status: ErasureStatus;
  law: ComplianceLaw;
  reason?: string;
  dpo_notes?: string;
  _shard: string;
}

export interface DataExportRequest {
  id: string;
  user_id: string;
  requested_at: string;
  export_type: string;
  format: string;
  law: ComplianceLaw;
  generated_at?: string;
  download_url?: string;
  expires_at?: string;
  _shard: string;
}

export interface ComplianceStats {
  pending_erasures: number;
  in_progress_erasures: number;
  overdue_erasures: number;
  completed_erasures_30d: number;
  pending_exports: number;
  by_law: Record<string, { pending_erasures: number; pending_exports: number }>;
}

export const getComplianceStats = () =>
  adminBff.get<{ data: ComplianceStats }>('/compliance?view=stats');

export const getErasureRequests = (params?: {
  status?: string; law?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'erasures' });
  if (params?.status) qs.set('status', params.status);
  if (params?.law)    qs.set('law',    params.law);
  if (params?.page)   qs.set('page',   String(params.page));
  if (params?.limit)  qs.set('limit',  String(params.limit));
  return adminBff.get<{ data: ErasureRequest[]; total: number; page: number; limit: number }>(
    `/compliance?${qs}`
  );
};

export const updateErasureRequest = (id: string, data: {
  status?: ErasureStatus; dpo_notes?: string; _shard: string;
}) => adminBff.patch<{ data: ErasureRequest }>(`/compliance/erasures/${id}`, data);

export const getDataExports = (params?: {
  law?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'exports' });
  if (params?.law)   qs.set('law',   params.law);
  if (params?.page)  qs.set('page',  String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  return adminBff.get<{ data: DataExportRequest[]; total: number; page: number; limit: number }>(
    `/compliance?${qs}`
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Legal Department — v2.2.0
// ─────────────────────────────────────────────────────────────────────────────

export type MatterStatus  = 'open' | 'in_progress' | 'closed' | 'on_hold';
export type MatterType    = 'dispute' | 'contract_review' | 'regulatory' | 'ip' | 'employment' | 'other';
export type MatterUrgency = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus    = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type TaskType      = 'license_renewal' | 'tax_filing' | 'audit_prep' | 'regulatory_report' | 'certification' | 'other';
export type DocStatus     = 'draft' | 'active' | 'expired' | 'terminated' | 'archived';
export type DocType       = 'contract' | 'nda' | 'license' | 'certificate' | 'filing' | 'opinion' | 'other';

export interface LegalMatter {
  id: string;
  title: string;
  description?: string;
  matter_type: MatterType;
  status: MatterStatus;
  urgency: MatterUrgency;
  jurisdiction?: string;
  assigned_to?: string;
  due_date?: string;
  closed_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LegalTask {
  id: string;
  title: string;
  task_type: TaskType;
  jurisdiction?: string;
  due_date?: string;
  completed_date?: string;
  status: TaskStatus;
  assigned_to?: string;
  notes?: string;
  recurrence?: string;
  created_at: string;
  updated_at: string;
}

export interface LegalDocument {
  id: string;
  title: string;
  doc_type: DocType;
  counterparty?: string;
  jurisdiction?: string;
  status: DocStatus;
  execution_date?: string;
  expiry_date?: string;
  file_url?: string;
  matter_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LegalStats {
  open_matters: number;
  critical_matters: number;
  overdue_tasks: number;
  due_soon_tasks: number;
  expiring_documents: number;
  total_active_documents: number;
  by_jurisdiction: Record<string, { open_matters: number; pending_tasks: number }>;
}

export const getLegalStats = () =>
  adminBff.get<{ data: LegalStats }>('/legal?view=stats');

export const getLegalMatters = (params?: {
  status?: string; type?: string; urgency?: string; jurisdiction?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'matters' });
  if (params?.status)       qs.set('status',       params.status);
  if (params?.type)         qs.set('type',         params.type);
  if (params?.urgency)      qs.set('urgency',      params.urgency);
  if (params?.jurisdiction) qs.set('jurisdiction', params.jurisdiction);
  if (params?.page)         qs.set('page',         String(params.page));
  if (params?.limit)        qs.set('limit',        String(params.limit));
  return adminBff.get<{ data: LegalMatter[]; total: number; page: number; limit: number }>(`/legal?${qs}`);
};

export const createLegalMatter = (data: Partial<LegalMatter>) =>
  adminBff.post<{ data: LegalMatter }>('/legal/matters', data);

export const updateLegalMatter = (id: string, data: Partial<LegalMatter>) =>
  adminBff.patch<{ data: LegalMatter }>(`/legal/matters/${id}`, data);

export const deleteLegalMatter = (id: string) =>
  adminBff.delete<{ data: { id: string; status: string } }>(`/legal/matters/${id}`);

export const getLegalTasks = (params?: {
  status?: string; type?: string; jurisdiction?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'tasks' });
  if (params?.status)       qs.set('status',       params.status);
  if (params?.type)         qs.set('type',         params.type);
  if (params?.jurisdiction) qs.set('jurisdiction', params.jurisdiction);
  if (params?.page)         qs.set('page',         String(params.page));
  if (params?.limit)        qs.set('limit',        String(params.limit));
  return adminBff.get<{ data: LegalTask[]; total: number; page: number; limit: number }>(`/legal?${qs}`);
};

export const createLegalTask = (data: Partial<LegalTask>) =>
  adminBff.post<{ data: LegalTask }>('/legal/tasks', data);

export const updateLegalTask = (id: string, data: Partial<LegalTask>) =>
  adminBff.patch<{ data: LegalTask }>(`/legal/tasks/${id}`, data);

export const deleteLegalTask = (id: string) =>
  adminBff.delete<{ success: boolean }>(`/legal/tasks/${id}`);

export const getLegalDocuments = (params?: {
  type?: string; status?: string; jurisdiction?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'documents' });
  if (params?.type)         qs.set('type',         params.type);
  if (params?.status)       qs.set('status',       params.status);
  if (params?.jurisdiction) qs.set('jurisdiction', params.jurisdiction);
  if (params?.page)         qs.set('page',         String(params.page));
  if (params?.limit)        qs.set('limit',        String(params.limit));
  return adminBff.get<{ data: LegalDocument[]; total: number; page: number; limit: number }>(`/legal?${qs}`);
};

export const createLegalDocument = (data: Partial<LegalDocument>) =>
  adminBff.post<{ data: LegalDocument }>('/legal/documents', data);

export const updateLegalDocument = (id: string, data: Partial<LegalDocument>) =>
  adminBff.patch<{ data: LegalDocument }>(`/legal/documents/${id}`, data);

export const deleteLegalDocument = (id: string) =>
  adminBff.delete<{ success: boolean }>(`/legal/documents/${id}`);

// ─── Finance v2.3.0 — Vendors, Invoices, Budgets, Expense Claims ─────────────

export type VendorStatus    = 'active' | 'inactive' | 'blocked';
export type VendorType      = 'payment_gateway' | 'hotel_supplier' | 'airline_gds' | 'saas' | 'professional_services' | 'infrastructure' | 'other';
export type InvoiceStatus   = 'pending' | 'approved' | 'paid' | 'overdue' | 'disputed' | 'cancelled';
export type BudgetStatus    = 'draft' | 'approved' | 'active' | 'closed';
export type ClaimStatus     = 'pending' | 'approved' | 'rejected' | 'paid';
export type FinanceCategory = 'hosting' | 'software' | 'salaries' | 'marketing' | 'legal' | 'travel' | 'other';

export interface FinanceVendor {
  id: string; name: string; vendor_type: VendorType;
  country?: string; currency: string; tax_id?: string;
  payment_terms?: string; bank_name?: string; iban?: string;
  swift_bic?: string; contact_email?: string; status: VendorStatus;
  notes?: string; created_at: string; updated_at: string;
}

export interface FinanceInvoice {
  id: string; invoice_no: string; vendor_id?: string; vendor_name: string;
  invoice_date: string; due_date?: string;
  amount: number; tax_amount: number; total_amount: number;
  currency: string; category: FinanceCategory; description?: string;
  status: InvoiceStatus; payment_date?: string; payment_ref?: string;
  file_url?: string; notes?: string; created_at: string; updated_at: string;
}

export interface FinanceBudget {
  id: string; title: string; period_type: 'annual' | 'quarterly' | 'monthly';
  year: number; quarter?: number; month?: number; status: BudgetStatus;
  total_sar: number; approved_by?: string; approved_at?: string;
  notes?: string; created_at: string; updated_at: string;
}

export interface FinanceBudgetLine {
  id: string; budget_id: string; department: string;
  category: FinanceCategory; amount_sar: number;
  notes?: string; created_at: string; updated_at: string;
}

export interface FinanceExpenseClaim {
  id: string; employee_id?: string; employee_name: string;
  claim_date: string; category: FinanceCategory;
  amount: number; currency: string; description: string;
  status: ClaimStatus; reviewed_by?: string; reviewed_at?: string;
  payment_date?: string; file_url?: string; admin_notes?: string;
  created_at: string; updated_at: string;
}

export const getFinanceVendors = (params?: { status?: string; type?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams({ view: 'vendors' });
  if (params?.status) qs.set('status', params.status);
  if (params?.type)   qs.set('type',   params.type);
  if (params?.page)   qs.set('page',   String(params.page));
  if (params?.limit)  qs.set('limit',  String(params.limit));
  return adminBff.get<{ data: FinanceVendor[]; total: number; page: number; limit: number }>(`/finance?${qs}`);
};

export const createFinanceVendor = (data: Partial<FinanceVendor>) =>
  adminBff.post<{ data: FinanceVendor }>('/finance/vendors', data);

export const updateFinanceVendor = (id: string, data: Partial<FinanceVendor>) =>
  adminBff.patch<{ data: FinanceVendor }>(`/finance/vendors/${id}`, data);

export const deleteFinanceVendor = (id: string) =>
  adminBff.delete<{ success: boolean; deactivated?: boolean }>(`/finance/vendors/${id}`);

export const getFinanceInvoices = (params?: { status?: string; vendor_id?: string; category?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams({ view: 'invoices' });
  if (params?.status)    qs.set('status',    params.status);
  if (params?.vendor_id) qs.set('vendor_id', params.vendor_id);
  if (params?.category)  qs.set('category',  params.category);
  if (params?.page)      qs.set('page',      String(params.page));
  if (params?.limit)     qs.set('limit',     String(params.limit));
  return adminBff.get<{ data: FinanceInvoice[]; total: number; page: number; limit: number }>(`/finance?${qs}`);
};

export const createFinanceInvoice = (data: Partial<FinanceInvoice>) =>
  adminBff.post<{ data: FinanceInvoice }>('/finance/invoices', data);

export const updateFinanceInvoice = (id: string, data: Partial<FinanceInvoice>) =>
  adminBff.patch<{ data: FinanceInvoice }>(`/finance/invoices/${id}`, data);

export const getFinanceBudgets = (params?: { year?: number; status?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams({ view: 'budgets' });
  if (params?.year)   qs.set('year',   String(params.year));
  if (params?.status) qs.set('status', params.status);
  if (params?.page)   qs.set('page',   String(params.page));
  if (params?.limit)  qs.set('limit',  String(params.limit));
  return adminBff.get<{ data: FinanceBudget[]; total: number; page: number; limit: number }>(`/finance?${qs}`);
};

export const createFinanceBudget = (data: Partial<FinanceBudget>) =>
  adminBff.post<{ data: FinanceBudget }>('/finance/budgets', data);

export const updateFinanceBudget = (id: string, data: Partial<FinanceBudget>) =>
  adminBff.patch<{ data: FinanceBudget }>(`/finance/budgets/${id}`, data);

export const getBudgetLines = (budgetId: string) =>
  adminBff.get<{ data: FinanceBudgetLine[] }>(`/finance/budgets/${budgetId}/lines`);

export const createBudgetLine = (budgetId: string, data: Partial<FinanceBudgetLine>) =>
  adminBff.post<{ data: FinanceBudgetLine }>(`/finance/budgets/${budgetId}/lines`, data);

export const updateBudgetLine = (id: string, data: Partial<FinanceBudgetLine>) =>
  adminBff.patch<{ data: FinanceBudgetLine }>(`/finance/budget-lines/${id}`, data);

export const deleteBudgetLine = (id: string) =>
  adminBff.delete<{ success: boolean }>(`/finance/budget-lines/${id}`);

export const getExpenseClaims = (params?: { status?: string; employee_id?: string; category?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams({ view: 'expense-claims' });
  if (params?.status)      qs.set('status',      params.status);
  if (params?.employee_id) qs.set('employee_id', params.employee_id);
  if (params?.category)    qs.set('category',    params.category);
  if (params?.page)        qs.set('page',        String(params.page));
  if (params?.limit)       qs.set('limit',       String(params.limit));
  return adminBff.get<{ data: FinanceExpenseClaim[]; total: number; page: number; limit: number }>(`/finance?${qs}`);
};

export const createExpenseClaim = (data: Partial<FinanceExpenseClaim>) =>
  adminBff.post<{ data: FinanceExpenseClaim }>('/finance/expense-claims', data);

export const updateExpenseClaim = (id: string, data: Partial<FinanceExpenseClaim>) =>
  adminBff.patch<{ data: FinanceExpenseClaim }>(`/finance/expense-claims/${id}`, data);

// ─────────────────────────────────────────────────────────────────────────────
// Ops Department
// ─────────────────────────────────────────────────────────────────────────────

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus   = 'open' | 'investigating' | 'resolved' | 'closed';
export type TicketPriority   = 'urgent' | 'high' | 'medium' | 'low';
export type TicketStatus     = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory   = 'booking' | 'payment' | 'technical' | 'account' | 'refund' | 'other';

export interface OpsStats {
  incidents: {
    open:          number;
    critical:      number;
    high:          number;
    resolved_24h:  number;
    sla_breaching: number;
  };
  tickets: {
    open:         number;
    urgent:       number;
    high:         number;
    resolved_24h: number;
  };
}

export interface OpsIncident {
  id:          string;
  title:       string;
  severity:    IncidentSeverity;
  status:      IncidentStatus;
  service:     string | null;
  description: string | null;
  impact:      string | null;
  started_at:  string;
  resolved_at: string | null;
  created_by:  string;
  created_at:  string;
  updated_at:  string;
}

export interface OpsSupportTicket {
  id:          string;
  user_email:  string | null;
  booking_ref: string | null;
  category:    TicketCategory;
  priority:    TicketPriority;
  status:      TicketStatus;
  subject:     string;
  description: string | null;
  assignee:    string | null;
  resolution:  string | null;
  created_at:  string;
  updated_at:  string;
}

export const getOpsStats = () =>
  adminBff.get<{ data: OpsStats }>('/ops?view=stats');

export const getOpsIncidents = (params?: { status?: string; severity?: string; service?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams({ view: 'incidents' });
  if (params?.status)   qs.set('status',   params.status);
  if (params?.severity) qs.set('severity', params.severity);
  if (params?.service)  qs.set('service',  params.service);
  if (params?.page)     qs.set('page',     String(params.page));
  if (params?.limit)    qs.set('limit',    String(params.limit));
  return adminBff.get<{ data: OpsIncident[]; total: number; page: number; limit: number }>(`/ops?${qs}`);
};

export const createOpsIncident = (data: Partial<OpsIncident>) =>
  adminBff.post<{ data: OpsIncident }>('/ops/incidents', data);

export const updateOpsIncident = (id: string, data: Partial<OpsIncident>) =>
  adminBff.patch<{ data: OpsIncident }>(`/ops/incidents/${id}`, data);

export const deleteOpsIncident = (id: string) =>
  adminBff.delete<{ data: { id: string } }>(`/ops/incidents/${id}`);

export const getOpsTickets = (params?: { status?: string; priority?: string; category?: string; search?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams({ view: 'tickets' });
  if (params?.status)   qs.set('status',   params.status);
  if (params?.priority) qs.set('priority', params.priority);
  if (params?.category) qs.set('category', params.category);
  if (params?.search)   qs.set('search',   params.search);
  if (params?.page)     qs.set('page',     String(params.page));
  if (params?.limit)    qs.set('limit',    String(params.limit));
  return adminBff.get<{ data: OpsSupportTicket[]; total: number; page: number; limit: number }>(`/ops?${qs}`);
};

export const createOpsTicket = (data: Partial<OpsSupportTicket>) =>
  adminBff.post<{ data: OpsSupportTicket }>('/ops/tickets', data);

export const updateOpsTicket = (id: string, data: Partial<OpsSupportTicket>) =>
  adminBff.patch<{ data: OpsSupportTicket }>(`/ops/tickets/${id}`, data);

export const deleteOpsTicket = (id: string) =>
  adminBff.delete<{ data: { id: string } }>(`/ops/tickets/${id}`);

// ─────────────────────────────────────────────────────────────────────────────
// Dev Department
// ─────────────────────────────────────────────────────────────────────────────

export type TaskType        = 'feature' | 'bug' | 'chore' | 'task' | 'spike';
export type TaskPriority    = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus      = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type SprintStatus    = 'planned' | 'active' | 'completed' | 'cancelled';
export type DeployEnv       = 'development' | 'staging' | 'production';
export type DeployStatus    = 'success' | 'failed' | 'rolled_back' | 'in_progress';

export interface DevStats {
  tasks: {
    open:                  number;
    in_progress:           number;
    in_review:             number;
    done_7d:               number;
    critical_open:         number;
    active_sprint_velocity: number;
  };
  active_sprint: {
    id:           string;
    name:         string;
    goal:         string | null;
    status:       SprintStatus;
    start_date:   string | null;
    end_date:     string | null;
    total_tasks:  number;
    done_tasks:   number;
    progress_pct: number;
  } | null;
  deployments: {
    deployments_24h: number;
    failed_24h:      number;
    prod_7d:         number;
  };
}

export interface DevSprint {
  id:                 string;
  name:               string;
  goal:               string | null;
  status:             SprintStatus;
  start_date:         string | null;
  end_date:           string | null;
  total_tasks:        number;
  done_tasks:         number;
  in_progress_tasks:  number;
  created_at:         string;
  updated_at:         string;
}

export interface DevTask {
  id:           string;
  sprint_id:    string | null;
  sprint_name:  string | null;
  title:        string;
  description:  string | null;
  type:         TaskType;
  priority:     TaskPriority;
  status:       TaskStatus;
  assignee:     string | null;
  story_points: number | null;
  service:      string | null;
  pr_url:       string | null;
  created_at:   string;
  updated_at:   string;
}

export interface DevDeployment {
  id:          string;
  service:     string;
  version:     string | null;
  environment: DeployEnv;
  status:      DeployStatus;
  deployed_by: string;
  notes:       string | null;
  deployed_at: string;
  created_at:  string;
  updated_at:  string;
}

export const getDevStats = () =>
  adminBff.get<{ data: DevStats }>('/dev?view=stats');

export const getDevSprints = (params?: { status?: string }) => {
  const qs = new URLSearchParams({ view: 'sprints' });
  if (params?.status) qs.set('status', params.status);
  return adminBff.get<{ data: DevSprint[] }>(`/dev?${qs}`);
};

export const createDevSprint = (data: Partial<DevSprint>) =>
  adminBff.post<{ data: DevSprint }>('/dev/sprints', data);

export const updateDevSprint = (id: string, data: Partial<DevSprint>) =>
  adminBff.patch<{ data: DevSprint }>(`/dev/sprints/${id}`, data);

export const deleteDevSprint = (id: string) =>
  adminBff.delete<{ data: { id: string } }>(`/dev/sprints/${id}`);

export const getDevTasks = (params?: { sprint_id?: string; status?: string; priority?: string; type?: string; assignee?: string; service?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams({ view: 'tasks' });
  if (params?.sprint_id) qs.set('sprint_id', params.sprint_id);
  if (params?.status)    qs.set('status',    params.status);
  if (params?.priority)  qs.set('priority',  params.priority);
  if (params?.type)      qs.set('type',      params.type);
  if (params?.assignee)  qs.set('assignee',  params.assignee);
  if (params?.service)   qs.set('service',   params.service);
  if (params?.page)      qs.set('page',      String(params.page));
  if (params?.limit)     qs.set('limit',     String(params.limit));
  return adminBff.get<{ data: DevTask[]; total: number; page: number; limit: number }>(`/dev?${qs}`);
};

export const createDevTask = (data: Partial<DevTask>) =>
  adminBff.post<{ data: DevTask }>('/dev/tasks', data);

export const updateDevTask = (id: string, data: Partial<DevTask>) =>
  adminBff.patch<{ data: DevTask }>(`/dev/tasks/${id}`, data);

export const deleteDevTask = (id: string) =>
  adminBff.delete<{ data: { id: string } }>(`/dev/tasks/${id}`);

export const getDevDeployments = (params?: { service?: string; environment?: string; status?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams({ view: 'deployments' });
  if (params?.service)     qs.set('service',     params.service);
  if (params?.environment) qs.set('environment', params.environment);
  if (params?.status)      qs.set('status',      params.status);
  if (params?.page)        qs.set('page',        String(params.page));
  if (params?.limit)       qs.set('limit',       String(params.limit));
  return adminBff.get<{ data: DevDeployment[]; total: number; page: number; limit: number }>(`/dev?${qs}`);
};

export const createDevDeployment = (data: Partial<DevDeployment>) =>
  adminBff.post<{ data: DevDeployment }>('/dev/deployments', data);

export const updateDevDeployment = (id: string, data: Partial<DevDeployment>) =>
  adminBff.patch<{ data: DevDeployment }>(`/dev/deployments/${id}`, data);

export const deleteDevDeployment = (id: string) =>
  adminBff.delete<{ data: { id: string } }>(`/dev/deployments/${id}`);

// ─────────────────────────────────────────────────────────────────────────────
// Products Department
// ─────────────────────────────────────────────────────────────────────────────

export type RoadmapStatus   = 'idea' | 'planned' | 'in_progress' | 'launched' | 'cancelled';
export type RoadmapPriority = 'critical' | 'high' | 'medium' | 'low';
export type ChangelogType   = 'release' | 'hotfix' | 'feature' | 'deprecation';

export interface ProductsStats {
  roadmap: {
    planned:     number;
    in_progress: number;
    launched:    number;
    ideas:       number;
    cancelled:   number;
  };
  flags: {
    total:           number;
    enabled:         number;
    partial_rollout: number;
  };
  changelog: {
    total:    number;
    published: number;
    last_30d: number;
  };
}

export interface RoadmapItem {
  id:          string;
  title:       string;
  description: string | null;
  status:      RoadmapStatus;
  priority:    RoadmapPriority;
  quarter:     string | null;
  tags:        string[];
  votes:       number;
  owner:       string | null;
  created_at:  string;
  updated_at:  string;
}

export interface FeatureFlag {
  id:           string;
  key:          string;
  description:  string | null;
  enabled:      boolean;
  rollout_pct:  number;
  environments: string[];
  owner:        string | null;
  expires_at:   string | null;
  created_at:   string;
  updated_at:   string;
}

export interface ChangelogEntry {
  id:           string;
  version:      string;
  title:        string;
  summary:      string | null;
  body:         string | null;
  type:         ChangelogType;
  published_at: string | null;
  created_at:   string;
  updated_at:   string;
}

export const getProductsStats = () =>
  adminBff.get<{ data: ProductsStats }>('/products?view=stats');

export const getRoadmap = (params?: { status?: string; quarter?: string; tag?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams({ view: 'roadmap' });
  if (params?.status)  qs.set('status',  params.status);
  if (params?.quarter) qs.set('quarter', params.quarter);
  if (params?.tag)     qs.set('tag',     params.tag);
  if (params?.page)    qs.set('page',    String(params.page));
  if (params?.limit)   qs.set('limit',   String(params.limit));
  return adminBff.get<{ data: RoadmapItem[]; total: number; page: number; limit: number }>(`/products?${qs}`);
};

export const createRoadmapItem = (data: Partial<RoadmapItem>) =>
  adminBff.post<{ data: RoadmapItem }>('/products/roadmap', data);

export const updateRoadmapItem = (id: string, data: Partial<RoadmapItem>) =>
  adminBff.patch<{ data: RoadmapItem }>(`/products/roadmap/${id}`, data);

export const deleteRoadmapItem = (id: string) =>
  adminBff.delete<{ data: { id: string } }>(`/products/roadmap/${id}`);

export const getFeatureFlags = (params?: { environment?: string; enabled?: boolean }) => {
  const qs = new URLSearchParams({ view: 'flags' });
  if (params?.environment !== undefined) qs.set('environment', params.environment);
  if (params?.enabled     !== undefined) qs.set('enabled',     String(params.enabled));
  return adminBff.get<{ data: FeatureFlag[] }>(`/products?${qs}`);
};

export const createFeatureFlag = (data: Partial<FeatureFlag>) =>
  adminBff.post<{ data: FeatureFlag }>('/products/flags', data);

export const updateFeatureFlag = (id: string, data: Partial<FeatureFlag>) =>
  adminBff.patch<{ data: FeatureFlag }>(`/products/flags/${id}`, data);

export const deleteFeatureFlag = (id: string) =>
  adminBff.delete<{ data: { id: string } }>(`/products/flags/${id}`);

export const getChangelog = (params?: { type?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams({ view: 'changelog' });
  if (params?.type)  qs.set('type',  params.type);
  if (params?.page)  qs.set('page',  String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  return adminBff.get<{ data: ChangelogEntry[]; total: number; page: number; limit: number }>(`/products?${qs}`);
};

export const createChangelogEntry = (data: Partial<ChangelogEntry>) =>
  adminBff.post<{ data: ChangelogEntry }>('/products/changelog', data);

export const updateChangelogEntry = (id: string, data: Partial<ChangelogEntry>) =>
  adminBff.patch<{ data: ChangelogEntry }>(`/products/changelog/${id}`, data);

export const deleteChangelogEntry = (id: string) =>
  adminBff.delete<{ data: { id: string } }>(`/products/changelog/${id}`);

// ─── Business Development ──────────────────────────────────────────────────────

export type PartnerType    = 'airline' | 'travel_agency' | 'gds' | 'corporate' | 'ota' | 'bank' | 'whitelabel' | 'other';
export type PartnerTier    = 'platinum' | 'gold' | 'silver' | 'standard';
export type PartnerStatus  = 'prospect' | 'contacted' | 'negotiating' | 'signed' | 'live' | 'paused' | 'churned';
export type AgreementType  = 'revenue_share' | 'white_label' | 'distribution' | 'referral' | 'api_integration' | 'other';
export type AgreementStatus = 'draft' | 'active' | 'expired' | 'terminated';
export type MarketStatus   = 'target' | 'researching' | 'pilot' | 'launched' | 'paused';
export type MarketRegion   = 'GCC' | 'MENA' | 'APAC' | 'EU' | 'US' | 'LATAM' | 'AFRICA' | 'OTHER';
export type MarketPriority = 'critical' | 'high' | 'medium' | 'low';
export type BdActivityType = 'call' | 'email' | 'demo' | 'meeting' | 'proposal' | 'negotiation' | 'signed' | 'note';

export interface BizDevStats {
  partners: {
    total: number; live: number; signed: number; negotiating: number; prospect: number;
    by_tier: { platinum: number; gold: number; silver: number; standard: number };
  };
  agreements: {
    total: number; active: number; draft: number; expired: number;
    active_value_sar: number; expiring_90d: number;
  };
  activities: { this_month: number };
  markets: { total: number; launched: number; pilot: number; researching: number; target: number };
}

export interface BizDevPartner {
  id: string; company_name: string; type: PartnerType; country?: string;
  tier: PartnerTier; status: PartnerStatus; contact_name?: string; contact_email?: string;
  contact_phone?: string; revenue_share_pct: number; owner?: string; notes?: string;
  last_contacted_at?: string; created_at: string; updated_at: string;
}

export interface BizDevAgreement {
  id: string; partner_id?: string; partner_name: string; title: string;
  type: AgreementType; value_sar: number; commission_pct: number;
  start_date?: string; end_date?: string; status: AgreementStatus;
  signed_by?: string; file_url?: string; notes?: string;
  days_until_expiry?: number; created_at: string; updated_at: string;
}

export interface BizDevActivity {
  id: string; partner_id?: string; partner_name: string; type: BdActivityType;
  summary: string; owner?: string; activity_at: string; created_at: string;
}

export interface BizDevMarket {
  id: string; country_code: string; country_name: string; region: MarketRegion;
  status: MarketStatus; priority: MarketPriority; target_launch_date?: string;
  partner_count: number; notes?: string; owner?: string; created_at: string; updated_at: string;
}

export const getBizDevStats = () =>
  adminBff.get<{ data: BizDevStats }>('/bizdev?view=stats');

export const getBizDevPartners = (params?: {
  type?: string; tier?: string; status?: string; country?: string;
  search?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'partners' });
  if (params?.type)    qs.set('type',    params.type);
  if (params?.tier)    qs.set('tier',    params.tier);
  if (params?.status)  qs.set('status',  params.status);
  if (params?.country) qs.set('country', params.country);
  if (params?.search)  qs.set('search',  params.search);
  if (params?.page)    qs.set('page',    String(params.page));
  if (params?.limit)   qs.set('limit',   String(params.limit));
  return adminBff.get<{ data: BizDevPartner[]; total: number; page: number; limit: number }>(`/bizdev?${qs}`);
};

export const createBizDevPartner = (data: Partial<BizDevPartner>) =>
  adminBff.post<{ data: BizDevPartner }>('/bizdev/partners', data);

export const updateBizDevPartner = (id: string, data: Partial<BizDevPartner>) =>
  adminBff.patch<{ data: BizDevPartner }>(`/bizdev/partners/${id}`, data);

export const deleteBizDevPartner = (id: string) =>
  adminBff.delete<{ success?: boolean; data?: BizDevPartner; message?: string }>(`/bizdev/partners/${id}`);

export const getPartnerActivities = (partnerId: string, params?: { page?: number; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.page)  qs.set('page',  String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return adminBff.get<{ data: BizDevActivity[]; total: number; page: number; limit: number }>(
    `/bizdev/partners/${partnerId}/activities${suffix}`
  );
};

export const createPartnerActivity = (partnerId: string, data: Partial<BizDevActivity>) =>
  adminBff.post<{ data: BizDevActivity }>(`/bizdev/partners/${partnerId}/activities`, data);

export const getBizDevAgreements = (params?: {
  status?: string; type?: string; partner_id?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'agreements' });
  if (params?.status)     qs.set('status',     params.status);
  if (params?.type)       qs.set('type',       params.type);
  if (params?.partner_id) qs.set('partner_id', params.partner_id);
  if (params?.page)       qs.set('page',       String(params.page));
  if (params?.limit)      qs.set('limit',      String(params.limit));
  return adminBff.get<{ data: BizDevAgreement[]; total: number; page: number; limit: number }>(`/bizdev?${qs}`);
};

export const getExpiringAgreements = (days = 90) =>
  adminBff.get<{ data: BizDevAgreement[]; days: number }>(`/bizdev?view=agreements-expiring&days=${days}`);

export const createBizDevAgreement = (data: Partial<BizDevAgreement>) =>
  adminBff.post<{ data: BizDevAgreement }>('/bizdev/agreements', data);

export const updateBizDevAgreement = (id: string, data: Partial<BizDevAgreement>) =>
  adminBff.patch<{ data: BizDevAgreement }>(`/bizdev/agreements/${id}`, data);

export const deleteBizDevAgreement = (id: string) =>
  adminBff.delete<{ success: boolean }>(`/bizdev/agreements/${id}`);

export const getBizDevMarkets = (params?: {
  status?: string; region?: string; priority?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'markets' });
  if (params?.status)   qs.set('status',   params.status);
  if (params?.region)   qs.set('region',   params.region);
  if (params?.priority) qs.set('priority', params.priority);
  if (params?.page)     qs.set('page',     String(params.page));
  if (params?.limit)    qs.set('limit',    String(params.limit));
  return adminBff.get<{ data: BizDevMarket[]; total: number; page: number; limit: number }>(`/bizdev?${qs}`);
};

export const createBizDevMarket = (data: Partial<BizDevMarket>) =>
  adminBff.post<{ data: BizDevMarket }>('/bizdev/markets', data);

export const updateBizDevMarket = (id: string, data: Partial<BizDevMarket>) =>
  adminBff.patch<{ data: BizDevMarket }>(`/bizdev/markets/${id}`, data);

// ── Affiliates ────────────────────────────────────────────────────────────────

export type AffiliatePlatform    = 'blog'|'youtube'|'instagram'|'twitter'|'telegram'|'tiktok'|'other';
export type AffiliateAudience    = 'under_1k'|'1k_10k'|'10k_100k'|'over_100k';
export type AffiliateAppStatus   = 'pending'|'reviewing'|'approved'|'rejected';
export type AffiliatePartnerTier = 'elite'|'pro'|'starter';
export type AffiliatePartnerStatus = 'active'|'paused'|'terminated';
export type AffiliatePayoutStatus  = 'pending'|'processing'|'paid'|'cancelled';

export interface AffiliateStats {
  applications: { total: number; pending: number; reviewing: number; approved: number; rejected: number };
  partners: {
    total: number; active: number; paused: number; terminated: number;
    by_tier: { elite: number; pro: number; starter: number };
    total_bookings: number; total_earned_sar: number; total_paid_sar: number;
  };
  payouts: { pending_count: number; pending_sar: number; paid_sar: number };
}

export interface AffiliateApplication {
  id: string; name: string; email: string; website: string|null;
  platform: AffiliatePlatform; audience_size: AffiliateAudience;
  message: string|null; status: AffiliateAppStatus;
  admin_notes: string|null; reviewed_by: string|null;
  reviewed_at: string|null; created_at: string; updated_at: string;
}

export interface AffiliatePartner {
  id: string; application_id: string|null; name: string; email: string;
  website: string|null; platform: AffiliatePlatform; audience_size: AffiliateAudience;
  tier: AffiliatePartnerTier; status: AffiliatePartnerStatus;
  commission_pct: number; referral_code: string|null;
  payout_method: string; payout_details: string|null;
  total_clicks: number; total_bookings: number;
  total_earned_sar: number; total_paid_sar: number;
  notes: string|null; joined_at: string; created_at: string; updated_at: string;
}

export interface AffiliatePayout {
  id: string; partner_id: string; partner_name: string;
  amount_sar: number; period_start: string; period_end: string;
  bookings_count: number; status: AffiliatePayoutStatus;
  payment_ref: string|null; notes: string|null;
  paid_at: string|null; created_at: string; updated_at: string;
}

export const getAffiliateStats = () =>
  adminBff.get<{ data: AffiliateStats }>('/affiliates?view=stats');

export const getAffiliateApplications = (params?: {
  status?: string; platform?: string; search?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'applications' });
  if (params?.status)   qs.set('status',   params.status);
  if (params?.platform) qs.set('platform', params.platform);
  if (params?.search)   qs.set('search',   params.search);
  if (params?.page)     qs.set('page',     String(params.page));
  if (params?.limit)    qs.set('limit',    String(params.limit));
  return adminBff.get<{ data: AffiliateApplication[]; total: number; page: number; limit: number }>(`/affiliates?${qs}`);
};

export const updateAffiliateApplication = (id: string, data: Partial<AffiliateApplication>) =>
  adminBff.patch<{ data: AffiliateApplication }>(`/affiliates/applications/${id}`, data);

export const approveAffiliateApplication = (id: string, data: {
  tier?: AffiliatePartnerTier; commission_pct?: number; payout_method?: string; notes?: string;
}) =>
  adminBff.post<{ data: AffiliatePartner }>(`/affiliates/applications/${id}?action=approve`, data);

export const getAffiliatePartners = (params?: {
  tier?: string; status?: string; platform?: string; search?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'partners' });
  if (params?.tier)     qs.set('tier',     params.tier);
  if (params?.status)   qs.set('status',   params.status);
  if (params?.platform) qs.set('platform', params.platform);
  if (params?.search)   qs.set('search',   params.search);
  if (params?.page)     qs.set('page',     String(params.page));
  if (params?.limit)    qs.set('limit',    String(params.limit));
  return adminBff.get<{ data: AffiliatePartner[]; total: number; page: number; limit: number }>(`/affiliates?${qs}`);
};

export const createAffiliatePartner = (data: Partial<AffiliatePartner>) =>
  adminBff.post<{ data: AffiliatePartner }>('/affiliates/partners', data);

export const updateAffiliatePartner = (id: string, data: Partial<AffiliatePartner>) =>
  adminBff.patch<{ data: AffiliatePartner }>(`/affiliates/partners/${id}`, data);

export const terminateAffiliatePartner = (id: string) =>
  adminBff.delete<{ data: AffiliatePartner }>(`/affiliates/partners/${id}`);

export const getAffiliatePayouts = (params?: {
  partner_id?: string; status?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'payouts' });
  if (params?.partner_id) qs.set('partner_id', params.partner_id);
  if (params?.status)     qs.set('status',     params.status);
  if (params?.page)       qs.set('page',       String(params.page));
  if (params?.limit)      qs.set('limit',      String(params.limit));
  return adminBff.get<{ data: AffiliatePayout[]; total: number; page: number; limit: number }>(`/affiliates?${qs}`);
};

export const createAffiliatePayout = (data: Partial<AffiliatePayout>) =>
  adminBff.post<{ data: AffiliatePayout }>('/affiliates/payouts', data);

export const updateAffiliatePayout = (id: string, data: Partial<AffiliatePayout>) =>
  adminBff.patch<{ data: AffiliatePayout }>(`/affiliates/payouts/${id}`, data);

// ── Corporate / Pro Business Travel ──────────────────────────────────────────

export type CorporateTier     = 'enterprise'|'premium'|'standard';
export type CorporateStatus   = 'prospect'|'active'|'paused'|'churned';
export type CorporateIndustry = 'government'|'finance'|'oil_gas'|'tech'|'healthcare'|
                                'education'|'ngo'|'retail'|'hospitality'|'other';
export type FlightClass       = 'first'|'business'|'premium_economy'|'economy';
export type ContactRole       = 'decision_maker'|'travel_manager'|'booker'|'finance'|'other';
export type EnquiryStatus     = 'new'|'contacted'|'qualified'|'converted'|'lost';

export interface CorporateStats {
  accounts: {
    total: number; active: number; prospect: number; paused: number; churned: number;
    by_tier: { enterprise: number; premium: number; standard: number };
    total_bookings: number; total_spend_sar: number;
  };
  enquiries: { total: number; new: number; contacted: number; qualified: number; converted: number; lost: number };
  contracts: { expiring_60d: number };
}

export interface CorporateAccount {
  id: string; company_name: string; industry: CorporateIndustry; country: string|null;
  tier: CorporateTier; status: CorporateStatus;
  annual_travel_budget_sar: number; max_flight_class: FlightClass;
  max_hotel_stars: number; per_diem_sar: number;
  preferred_airlines: string[]|null; advance_booking_days: number;
  owner: string|null; contract_start: string|null; contract_end: string|null;
  discount_pct: number; total_bookings: number; total_spend_sar: number;
  notes: string|null; last_activity_at: string|null;
  portal_user_id: string|null; activated_at: string|null;
  created_at: string; updated_at: string;
}

export interface CorporateContact {
  id: string; account_id: string; account_name: string;
  name: string; title: string|null; email: string|null; phone: string|null;
  role: ContactRole; is_primary: boolean; created_at: string; updated_at: string;
}

export interface CorporateEnquiry {
  id: string; account_id: string|null; company_name: string;
  contact_name: string; email: string; phone: string|null;
  traveler_count: number; destinations: string|null; travel_dates: string|null;
  message: string|null; status: EnquiryStatus;
  assigned_to: string|null; admin_notes: string|null; source: string;
  // Phase 6: enhanced application fields
  job_title: string|null; company_size: string|null;
  country: string|null; industry: string|null;
  estimated_monthly_budget_sar: number|null;
  hear_about_us: string|null;
  created_at: string; updated_at: string;
}

export const getCorporateStats = () =>
  adminBff.get<{ data: CorporateStats }>('/corporate?view=stats');

export const getCorporateAccounts = (params?: {
  tier?: string; status?: string; industry?: string; country?: string; search?: string;
  page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'accounts' });
  if (params?.tier)     qs.set('tier',     params.tier);
  if (params?.status)   qs.set('status',   params.status);
  if (params?.industry) qs.set('industry', params.industry);
  if (params?.country)  qs.set('country',  params.country);
  if (params?.search)   qs.set('search',   params.search);
  if (params?.page)     qs.set('page',     String(params.page));
  if (params?.limit)    qs.set('limit',    String(params.limit));
  return adminBff.get<{ data: CorporateAccount[]; total: number; page: number; limit: number }>(`/corporate?${qs}`);
};

export const createCorporateAccount = (data: Partial<CorporateAccount>) =>
  adminBff.post<{ data: CorporateAccount }>('/corporate/accounts', data);

export const updateCorporateAccount = (id: string, data: Partial<CorporateAccount>) =>
  adminBff.patch<{ data: CorporateAccount }>(`/corporate/accounts/${id}`, data);

export const deleteCorporateAccount = (id: string) =>
  adminBff.delete<{ data: CorporateAccount }>(`/corporate/accounts/${id}`);

export const activateCorporateAccount = (
  id: string,
  data: { email: string; password: string; name?: string },
) =>
  adminBff.post<{ data: CorporateAccount; portal_user: { id: string; email: string; role: string } }>(
    `/corporate/accounts/${id}/activate`,
    data,
  );

export const getCorporateContacts = (accountId: string) =>
  adminBff.get<{ data: CorporateContact[] }>(`/corporate/accounts/${accountId}/contacts`);

export const createCorporateContact = (accountId: string, data: Partial<CorporateContact>) =>
  adminBff.post<{ data: CorporateContact }>(`/corporate/accounts/${accountId}/contacts`, data);

export const updateCorporateContact = (accountId: string, cid: string, data: Partial<CorporateContact>) =>
  adminBff.patch<{ data: CorporateContact }>(`/corporate/accounts/${accountId}/contacts/${cid}`, data);

export const deleteCorporateContact = (accountId: string, cid: string) =>
  adminBff.delete<{ success: boolean }>(`/corporate/accounts/${accountId}/contacts/${cid}`);

export const getCorporateEnquiries = (params?: {
  status?: string; account_id?: string; search?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams({ view: 'enquiries' });
  if (params?.status)     qs.set('status',     params.status);
  if (params?.account_id) qs.set('account_id', params.account_id);
  if (params?.search)     qs.set('search',     params.search);
  if (params?.page)       qs.set('page',       String(params.page));
  if (params?.limit)      qs.set('limit',      String(params.limit));
  return adminBff.get<{ data: CorporateEnquiry[]; total: number; page: number; limit: number }>(`/corporate?${qs}`);
};

export const createCorporateEnquiry = (data: Partial<CorporateEnquiry>) =>
  adminBff.post<{ data: CorporateEnquiry }>('/corporate/enquiries', data);

export const updateCorporateEnquiry = (id: string, data: Partial<CorporateEnquiry>) =>
  adminBff.patch<{ data: CorporateEnquiry }>(`/corporate/enquiries/${id}`, data);

export const approveCorporateEnquiry = (id: string, notes?: string) =>
  adminBff.post<{ data: CorporateEnquiry; account: CorporateAccount; portal_user: { id: string; email: string } }>(
    `/corporate/enquiries/${id}/approve`, { notes }
  );

export const rejectCorporateEnquiry = (id: string, reason?: string) =>
  adminBff.post<{ data: CorporateEnquiry }>(`/corporate/enquiries/${id}/reject`, { reason });

// ── Corporate Bookings (admin view) ──────────────────────────────────────────

export type CorpBookingType   = 'flight' | 'hotel' | 'car' | 'package';
export type CorpBookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed';

export interface CorporateBookingAdmin {
  id: string; account_id: string; employee_id: string;
  booked_by_user_id: string; booking_ref: string|null;
  booking_type: CorpBookingType; status: CorpBookingStatus;
  origin: string|null; destination: string;
  depart_date: string; return_date: string|null;
  flight_class: string|null; hotel_stars: number|null;
  estimated_cost_sar: number; actual_cost_sar: number|null;
  currency: string; policy_compliant: boolean;
  policy_flags: string[]|null; requires_approval: boolean;
  approved_by: string|null; approved_at: string|null;
  purpose: string|null; notes: string|null;
  employee_name: string; employee_email: string;
  employee_dept: string|null; employee_nationality: string|null;
  created_at: string; updated_at: string;
}

export const getAdminCorporateBookings = (params?: {
  account_id?: string; status?: string; booking_type?: string;
  pending_approval?: boolean; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.account_id)       qs.set('account_id',       params.account_id);
  if (params?.status)           qs.set('status',           params.status);
  if (params?.booking_type)     qs.set('booking_type',     params.booking_type);
  if (params?.pending_approval) qs.set('pending_approval', 'true');
  if (params?.page)             qs.set('page',             String(params.page));
  if (params?.limit)            qs.set('limit',            String(params.limit));
  const q = qs.toString();
  return adminBff.get<{ data: CorporateBookingAdmin[]; total: number; page: number; limit: number }>(
    `/corporate/bookings${q ? `?${q}` : ''}`
  );
};

export const confirmCorporateBooking = (id: string, data: { booking_ref?: string; actual_cost_sar?: number }) =>
  adminBff.post<{ data: CorporateBookingAdmin }>(`/corporate/bookings/${id}?action=confirm`, data);

export const rejectCorporateBooking = (id: string, data: { reason?: string }) =>
  adminBff.post<{ data: CorporateBookingAdmin }>(`/corporate/bookings/${id}?action=reject`, data);

export const updateCorporateBooking = (id: string, data: Partial<CorporateBookingAdmin>) =>
  adminBff.patch<{ data: CorporateBookingAdmin }>(`/corporate/bookings/${id}`, data);

// ── Corporate Employees (admin view) ─────────────────────────────────────────

export type EmployeeStatus = 'active' | 'inactive';

export interface CorporateEmployee {
  id: string; account_id: string; employee_ref: string | null;
  name: string; email: string | null; phone: string | null;
  department: string | null; job_title: string | null;
  nationality: string | null;
  passport_number: string | null; passport_expiry: string | null;
  date_of_birth: string | null;
  is_travel_manager: boolean; status: EmployeeStatus;
  created_at: string; updated_at: string;
}

export const getAdminCorporateEmployees = (params?: {
  account_id?: string; status?: string; department?: string;
  search?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.account_id)  qs.set('account_id',  params.account_id);
  if (params?.status)      qs.set('status',       params.status);
  if (params?.department)  qs.set('department',   params.department);
  if (params?.search)      qs.set('search',       params.search);
  if (params?.page)        qs.set('page',         String(params.page));
  if (params?.limit)       qs.set('limit',        String(params.limit));
  const q = qs.toString();
  return adminBff.get<{ data: CorporateEmployee[]; total: number; page: number; limit: number }>(
    `/corporate/employees${q ? `?${q}` : ''}`
  );
};

export const updateAdminCorporateEmployee = (id: string, data: Partial<CorporateEmployee>) =>
  adminBff.patch<{ data: CorporateEmployee }>('/corporate/employees', { id, ...data });

// ── Corporate Trip Groups (admin view) ───────────────────────────────────────

export type TripGroupStatus = 'draft' | 'confirmed' | 'cancelled';

export interface AdminTripGroup {
  id: string; account_id: string; name: string;
  description: string | null; destination: string;
  origin: string | null; depart_date: string; return_date: string | null;
  status: TripGroupStatus; purpose: string | null;
  traveler_count: number; created_at: string; updated_at: string;
}

export const getAdminTripGroups = (params?: {
  account_id?: string; status?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.account_id) qs.set('account_id', params.account_id);
  if (params?.status)     qs.set('status',     params.status);
  if (params?.page)       qs.set('page',       String(params.page));
  if (params?.limit)      qs.set('limit',      String(params.limit));
  const q = qs.toString();
  return adminBff.get<{ data: AdminTripGroup[]; total: number; page: number; limit: number }>(
    `/corporate/trip-groups${q ? `?${q}` : ''}`
  );
};

// ── Revenue Management ────────────────────────────────────────────────────────
export type RevenueRuleType      = 'seasonal'|'event'|'demand'|'occupancy'|'manual';
export type RevenueAdjustment    = 'percent'|'absolute';
export type RevenueOverrideStatus = 'active'|'expired'|'cancelled';
export type RevenuePeriodType    = 'month'|'quarter'|'year';

export interface RevenueStats {
  active_rules:         number;
  blackouts_this_month: number;
  overrides_this_week:  number;
  pending_ai_recs:      number;
}

export interface RevenueRule {
  id: string; name: string; type: RevenueRuleType; applies_to: 'all'|'hotel';
  hotel_id: string|null; adjustment: RevenueAdjustment; value: number;
  start_date: string|null; end_date: string|null; priority: number;
  active: boolean; created_by: string; notes: string|null;
  created_at: string; updated_at: string;
}

export interface RevenueBlackout {
  id: string; name: string; hotel_id: string|null;
  start_date: string; end_date: string; reason: string|null;
  created_by: string; created_at: string; updated_at: string;
}

export interface RevenueOverride {
  id: string; hotel_id: string; hotel_name: string; override_date: string;
  price_sar: number; reason: string; approved_by: string;
  status: RevenueOverrideStatus; created_at: string; updated_at: string;
}

export interface RevenueTarget {
  id: string; period: string; period_type: RevenuePeriodType;
  target_revpar: number|null; target_occ_pct: number|null; target_adr: number|null;
  actual_revpar: number|null; notes: string|null; created_at: string; updated_at: string;
}

export interface AiPricingRecommendation {
  id: string; hotel_id: string; base_price: number; recommended_price: number;
  currency: string; confidence_score: number; reasoning: string;
  status: 'pending'|'accepted'|'rejected'; season: string;
  occupancy_pct: number; demand_count: number; created_at: string;
}

export const getRevenueStats       = () => adminBff.get<{ data: RevenueStats }>('/revenue?view=stats');
export const getRevenueRules       = (p?: Record<string,unknown>) => adminBff.get<{ data: RevenueRule[]; total: number }>('/revenue?view=rules', { params: p });
export const createRevenueRule     = (data: Partial<RevenueRule>) => adminBff.post<{ data: RevenueRule }>('/revenue/rules', data);
export const updateRevenueRule     = (id: string, data: Partial<RevenueRule>) => adminBff.patch<{ data: RevenueRule }>(`/revenue/rules/${id}`, data);
export const deleteRevenueRule     = (id: string) => adminBff.delete<{ data: { id: string } }>(`/revenue/rules/${id}`);
export const getRevenueBlackouts   = (p?: Record<string,unknown>) => adminBff.get<{ data: RevenueBlackout[]; total: number }>('/revenue?view=blackouts', { params: p });
export const createRevenueBlackout = (data: Partial<RevenueBlackout>) => adminBff.post<{ data: RevenueBlackout }>('/revenue/blackouts', data);
export const updateRevenueBlackout = (id: string, data: Partial<RevenueBlackout>) => adminBff.patch<{ data: RevenueBlackout }>(`/revenue/blackouts/${id}`, data);
export const deleteRevenueBlackout = (id: string) => adminBff.delete<{ data: { id: string } }>(`/revenue/blackouts/${id}`);
export const getRevenueOverrides   = (p?: Record<string,unknown>) => adminBff.get<{ data: RevenueOverride[]; total: number }>('/revenue?view=overrides', { params: p });
export const createRevenueOverride = (data: Partial<RevenueOverride>) => adminBff.post<{ data: RevenueOverride }>('/revenue/overrides', data);
export const updateRevenueOverride = (id: string, data: Partial<RevenueOverride>) => adminBff.patch<{ data: RevenueOverride }>(`/revenue/overrides/${id}`, data);
export const deleteRevenueOverride = (id: string) => adminBff.delete<{ data: { id: string } }>(`/revenue/overrides/${id}`);
export const getRevenueTargets     = (p?: Record<string,unknown>) => adminBff.get<{ data: RevenueTarget[] }>('/revenue?view=targets', { params: p });
export const createRevenueTarget   = (data: Partial<RevenueTarget>) => adminBff.post<{ data: RevenueTarget }>('/revenue/targets', data);
export const updateRevenueTarget   = (id: string, data: Partial<RevenueTarget>) => adminBff.patch<{ data: RevenueTarget }>(`/revenue/targets/${id}`, data);
export const getAiRecommendations  = (p?: Record<string,unknown>) => adminBff.get<{ data: AiPricingRecommendation[]; total: number }>('/revenue?view=ai-recommendations', { params: p });
export const acceptAiRecommendation = (recId: string) => adminBff.post<{ data: AiPricingRecommendation }>(`/revenue?action=accept&rec_id=${recId}`, {});
export const rejectAiRecommendation = (recId: string, reason?: string) => adminBff.post<{ data: AiPricingRecommendation }>(`/revenue?action=reject&rec_id=${recId}`, { reason });

// ── Customer Success ──────────────────────────────────────────────────────────
export type CsAccountType  = 'corporate'|'travel_agency'|'vip_individual'|'group_operator'|'government';
export type CsAccountTier  = 'enterprise'|'premium'|'standard';
export type CsAccountStatus = 'active'|'at_risk'|'churned'|'onboarding';
export type CsChurnRisk    = 'critical'|'high'|'medium'|'low';
export type CsTouchpointType = 'call'|'email'|'meeting'|'qbr'|'onboarding'|'renewal'|'escalation'|'note';
export type CsTouchpointOutcome = 'positive'|'neutral'|'negative';
export type CsEscalationPriority = 'critical'|'high'|'medium'|'low';
export type CsEscalationStatus = 'open'|'in_progress'|'resolved'|'closed';

export interface CsStats {
  active_accounts: number; at_risk: number; enterprise_count: number;
  open_escalations: number; avg_health_score: number;
}

export interface CsAccount {
  id: string; name: string; type: CsAccountType; tier: CsAccountTier;
  status: CsAccountStatus; country: string|null; contact_name: string|null;
  contact_email: string|null; contact_phone: string|null; owner: string|null;
  ltv_sar: number; nps_score: number|null; health_score: number;
  churn_risk: CsChurnRisk; renewal_date: string|null; notes: string|null;
  last_contacted_at: string|null; created_at: string; updated_at: string;
}

export interface CsTouchpoint {
  id: string; account_id: string; account_name: string;
  type: CsTouchpointType; summary: string; outcome: CsTouchpointOutcome;
  owner: string|null; touched_at: string; created_at: string;
}

export interface CsEscalation {
  id: string; account_id: string|null; account_name: string; subject: string;
  priority: CsEscalationPriority; status: CsEscalationStatus; owner: string|null;
  root_cause: string|null; resolution: string|null;
  opened_at: string; resolved_at: string|null; created_at: string; updated_at: string;
}

export const getCsStats           = () => adminBff.get<{ data: CsStats }>('/customer-success?view=stats');
export const getCsAccounts        = (p?: Record<string,unknown>) => adminBff.get<{ data: CsAccount[]; total: number }>('/customer-success?view=accounts', { params: p });
export const createCsAccount      = (data: Partial<CsAccount>) => adminBff.post<{ data: CsAccount }>('/customer-success/accounts', data);
export const updateCsAccount      = (id: string, data: Partial<CsAccount>) => adminBff.patch<{ data: CsAccount }>(`/customer-success/accounts/${id}`, data);
export const deleteCsAccount      = (id: string) => adminBff.delete<{ data: { id: string } }>(`/customer-success/accounts/${id}`);
export const getCsTouchpoints     = (accountId: string, p?: Record<string,unknown>) => adminBff.get<{ data: CsTouchpoint[]; total: number }>(`/customer-success/accounts/${accountId}/touchpoints`, { params: p });
export const createCsTouchpoint   = (accountId: string, data: Partial<CsTouchpoint>) => adminBff.post<{ data: CsTouchpoint }>(`/customer-success/accounts/${accountId}/touchpoints`, data);
export const getCsEscalations     = (p?: Record<string,unknown>) => adminBff.get<{ data: CsEscalation[]; total: number }>('/customer-success?view=escalations', { params: p });
export const createCsEscalation   = (data: Partial<CsEscalation>) => adminBff.post<{ data: CsEscalation }>('/customer-success/escalations', data);
export const updateCsEscalation   = (id: string, data: Partial<CsEscalation>) => adminBff.patch<{ data: CsEscalation }>(`/customer-success/escalations/${id}`, data);
export const deleteCsEscalation   = (id: string) => adminBff.delete<{ data: { id: string } }>(`/customer-success/escalations/${id}`);

// ── Procurement ───────────────────────────────────────────────────────────────
export type ProcurementSupplierType   = 'api_provider'|'gds'|'hotel_chain'|'airline'|'car_rental'|'insurance'|'technology'|'other';
export type ProcurementSupplierStatus = 'active'|'onboarding'|'suspended'|'terminated';
export type ProcurementContractType   = 'service'|'api'|'license'|'distribution'|'nda'|'framework'|'other';
export type ProcurementContractStatus = 'draft'|'active'|'expired'|'terminated'|'under_review';
export type ProcurementSlaUnit        = '%'|'ms'|'hours'|'days';
export type ProcurementSlaPeriod      = 'daily'|'weekly'|'monthly'|'quarterly';
export type ProcurementSlaStatus      = 'met'|'at_risk'|'breached'|'pending';
export type ProcurementPoStatus       = 'draft'|'approved'|'sent'|'delivered'|'paid'|'cancelled';

export interface ProcurementStats {
  active_suppliers: number; contracts_expiring_90d: number;
  breached_slas: number; pending_pos: number; total_annual_spend_sar: number;
}

export interface ProcurementSupplier {
  id: string; name: string; type: ProcurementSupplierType; status: ProcurementSupplierStatus;
  country: string|null; contact_name: string|null; contact_email: string|null;
  website: string|null; account_id: string|null; annual_value_sar: number;
  owner: string|null; notes: string|null; created_at: string; updated_at: string;
}

export interface ProcurementContract {
  id: string; supplier_id: string|null; supplier_name: string; title: string;
  type: ProcurementContractType; value_sar: number; start_date: string|null;
  end_date: string|null; auto_renews: boolean; status: ProcurementContractStatus;
  signed_by: string|null; file_url: string|null; notes: string|null;
  created_at: string; updated_at: string;
}

export interface ProcurementSla {
  id: string; supplier_id: string; supplier_name: string; metric: string;
  target_value: number; unit: ProcurementSlaUnit; measurement_period: ProcurementSlaPeriod;
  current_value: number|null; status: ProcurementSlaStatus;
  last_reviewed_at: string|null; notes: string|null; created_at: string; updated_at: string;
}

export interface ProcurementPurchaseOrder {
  id: string; supplier_id: string|null; supplier_name: string; po_number: string;
  description: string; amount_sar: number; status: ProcurementPoStatus;
  ordered_at: string; expected_at: string|null; approved_by: string|null;
  notes: string|null; created_at: string; updated_at: string;
}

export const getProcurementStats    = () => adminBff.get<{ data: ProcurementStats }>('/procurement?view=stats');
export const getProcurementSuppliers = (p?: Record<string,unknown>) => adminBff.get<{ data: ProcurementSupplier[]; total: number }>('/procurement?view=suppliers', { params: p });
export const createProcurementSupplier = (data: Partial<ProcurementSupplier>) => adminBff.post<{ data: ProcurementSupplier }>('/procurement/suppliers', data);
export const updateProcurementSupplier = (id: string, data: Partial<ProcurementSupplier>) => adminBff.patch<{ data: ProcurementSupplier }>(`/procurement/suppliers/${id}`, data);
export const deleteProcurementSupplier = (id: string) => adminBff.delete<{ data: { id: string } }>(`/procurement/suppliers/${id}`);
export const getProcurementContracts   = (p?: Record<string,unknown>) => adminBff.get<{ data: ProcurementContract[]; total: number }>('/procurement?view=contracts', { params: p });
export const getExpiringContracts      = (days?: number) => adminBff.get<{ data: ProcurementContract[] }>('/procurement?view=contracts-expiring', { params: { days } });
export const createProcurementContract = (data: Partial<ProcurementContract>) => adminBff.post<{ data: ProcurementContract }>('/procurement/contracts', data);
export const updateProcurementContract = (id: string, data: Partial<ProcurementContract>) => adminBff.patch<{ data: ProcurementContract }>(`/procurement/contracts/${id}`, data);
export const deleteProcurementContract = (id: string) => adminBff.delete<{ data: { id: string } }>(`/procurement/contracts/${id}`);
export const getProcurementSlas        = (p?: Record<string,unknown>) => adminBff.get<{ data: ProcurementSla[]; total: number }>('/procurement?view=slas', { params: p });
export const createProcurementSla      = (data: Partial<ProcurementSla>) => adminBff.post<{ data: ProcurementSla }>('/procurement/slas', data);
export const updateProcurementSla      = (id: string, data: Partial<ProcurementSla>) => adminBff.patch<{ data: ProcurementSla }>(`/procurement/slas/${id}`, data);
export const deleteProcurementSla      = (id: string) => adminBff.delete<{ data: { id: string } }>(`/procurement/slas/${id}`);
export const getProcurementPOs         = (p?: Record<string,unknown>) => adminBff.get<{ data: ProcurementPurchaseOrder[]; total: number }>('/procurement?view=purchase-orders', { params: p });
export const createProcurementPO       = (data: Partial<ProcurementPurchaseOrder>) => adminBff.post<{ data: ProcurementPurchaseOrder }>('/procurement/purchase-orders', data);
export const updateProcurementPO       = (id: string, data: Partial<ProcurementPurchaseOrder>) => adminBff.patch<{ data: ProcurementPurchaseOrder }>(`/procurement/purchase-orders/${id}`, data);
export const deleteProcurementPO       = (id: string) => adminBff.delete<{ data: { id: string } }>(`/procurement/purchase-orders/${id}`);

// ── Fraud & Risk ──────────────────────────────────────────────────────────────
export type FraudCaseStatus    = 'pending'|'reviewing'|'confirmed_fraud'|'false_positive'|'escalated';
export type FraudRuleType      = 'threshold'|'velocity'|'geo'|'device'|'card'|'pattern'|'ml';
export type FraudRuleAction    = 'flag'|'block'|'review'|'allow';
export type FraudSeverity      = 'critical'|'high'|'medium'|'low';
export type FraudWatchlistType = 'email'|'ip'|'card_bin'|'device_id'|'phone';
export type FraudDecision      = 'confirmed_fraud'|'false_positive'|'escalated';

export interface FraudStats {
  pending_cases: number; confirmed_fraud_sar: number; false_positive_rate: number;
  active_rules: number; watchlist_entries: number;
}

export interface FraudCase {
  id: string; booking_ref: string|null; user_id: string|null; user_email: string|null;
  amount_sar: number|null; payment_method: string|null; ip_address: string|null;
  country: string|null; risk_score: number; flags: string[]; status: FraudCaseStatus;
  assigned_to: string|null; decision_reason: string|null;
  decided_at: string|null; created_at: string; updated_at: string;
}

export interface FraudRule {
  id: string; name: string; type: FraudRuleType; description: string|null;
  condition: Record<string, unknown>; action: FraudRuleAction; severity: FraudSeverity;
  active: boolean; hit_count: number; created_by: string; created_at: string; updated_at: string;
}

export interface FraudDecisionRecord {
  id: string; case_id: string; booking_ref: string|null;
  decision: FraudDecision; reason: string; decided_by: string; decided_at: string;
}

export interface FraudWatchlistEntry {
  id: string; type: FraudWatchlistType; value: string; reason: string;
  severity: 'critical'|'high'|'medium'; added_by: string;
  expires_at: string|null; created_at: string;
}

export const getFraudStats      = () => adminBff.get<{ data: FraudStats }>('/fraud?view=stats');
export const getFraudCases      = (p?: Record<string,unknown>) => adminBff.get<{ data: FraudCase[]; total: number }>('/fraud?view=cases', { params: p });
export const createFraudCase    = (data: Partial<FraudCase>) => adminBff.post<{ data: FraudCase }>('/fraud/cases', data);
export const updateFraudCase    = (id: string, data: Partial<FraudCase>) => adminBff.patch<{ data: FraudCase }>(`/fraud/cases/${id}`, data);
export const deleteFraudCase    = (id: string) => adminBff.delete<{ data: { id: string } }>(`/fraud/cases/${id}`);
export const getFraudRules      = (p?: Record<string,unknown>) => adminBff.get<{ data: FraudRule[]; total: number }>('/fraud?view=rules', { params: p });
export const createFraudRule    = (data: Partial<FraudRule>) => adminBff.post<{ data: FraudRule }>('/fraud/rules', data);
export const updateFraudRule    = (id: string, data: Partial<FraudRule>) => adminBff.patch<{ data: FraudRule }>(`/fraud/rules/${id}`, data);
export const deleteFraudRule    = (id: string) => adminBff.delete<{ data: { id: string } }>(`/fraud/rules/${id}`);
export const getFraudWatchlist  = (p?: Record<string,unknown>) => adminBff.get<{ data: FraudWatchlistEntry[]; total: number }>('/fraud?view=watchlist', { params: p });
export const addToWatchlist     = (data: Partial<FraudWatchlistEntry>) => adminBff.post<{ data: FraudWatchlistEntry }>('/fraud/watchlist', data);
export const removeFromWatchlist = (id: string) => adminBff.delete<{ data: { id: string } }>(`/fraud/watchlist/${id}`);
export const getFraudDecisions  = (p?: Record<string,unknown>) => adminBff.get<{ data: FraudDecisionRecord[]; total: number }>('/fraud?view=decisions', { params: p });

// ── Analytics / BI ────────────────────────────────────────────────────────────
export type BiQueryType   = 'bookings'|'revenue'|'users'|'flights'|'hotels'|'cars'|'loyalty'|'funnel';
export type BiKpiCategory = 'revenue'|'bookings'|'users'|'conversion'|'retention'|'operations';
export type BiKpiUnit     = 'SAR'|'%'|'count'|'ms'|'days';
export type BiKpiPeriod   = 'daily'|'weekly'|'monthly'|'quarterly'|'annual';
export type BiAlertCondition = 'below_target'|'above_target'|'below_threshold'|'above_threshold';

export interface BiStats {
  on_target: number; off_target: number; active_alerts: number; reports_count: number;
}

export interface BiDashboard {
  id: string; name: string; description: string|null;
  config: Record<string, unknown>; is_default: boolean;
  created_by: string; created_at: string; updated_at: string;
}

export interface BiReport {
  id: string; name: string; description: string|null;
  query_type: BiQueryType; filters: Record<string, unknown>;
  schedule: string|null; last_run_at: string|null;
  created_by: string; created_at: string; updated_at: string;
}

export interface BiKpiTarget {
  id: string; name: string; category: BiKpiCategory; metric_key: string;
  target_value: number; current_value: number|null; unit: BiKpiUnit;
  period: BiKpiPeriod; owner: string|null; updated_at: string;
  hit_pct?: number;
}

export interface BiAlert {
  id: string; name: string; kpi_target_id: string|null;
  condition: BiAlertCondition; threshold: number|null;
  notify_email: string|null; active: boolean; last_fired_at: string|null; created_at: string;
}

export const getBiStats        = () => adminBff.get<{ data: BiStats }>('/analytics?view=stats');
export const getBiKpiTargets   = (p?: Record<string,unknown>) => adminBff.get<{ data: BiKpiTarget[] }>('/analytics?view=kpi-targets', { params: p });
export const getBiKpiSummary   = () => adminBff.get<{ data: BiKpiTarget[] }>('/analytics?view=kpi-summary');
export const createBiKpiTarget = (data: Partial<BiKpiTarget>) => adminBff.post<{ data: BiKpiTarget }>('/analytics/kpi-targets', data);
export const updateBiKpiTarget = (id: string, data: Partial<BiKpiTarget>) => adminBff.patch<{ data: BiKpiTarget }>(`/analytics/kpi-targets/${id}`, data);
export const deleteBiKpiTarget = (id: string) => adminBff.delete<{ data: { id: string } }>(`/analytics/kpi-targets/${id}`);
export const getBiDashboards   = () => adminBff.get<{ data: BiDashboard[] }>('/analytics?view=dashboards');
export const createBiDashboard = (data: Partial<BiDashboard>) => adminBff.post<{ data: BiDashboard }>('/analytics/dashboards', data);
export const updateBiDashboard = (id: string, data: Partial<BiDashboard>) => adminBff.patch<{ data: BiDashboard }>(`/analytics/dashboards/${id}`, data);
export const deleteBiDashboard = (id: string) => adminBff.delete<{ data: { id: string } }>(`/analytics/dashboards/${id}`);
export const getBiReports      = (p?: Record<string,unknown>) => adminBff.get<{ data: BiReport[]; total: number }>('/analytics?view=reports', { params: p });
export const createBiReport    = (data: Partial<BiReport>) => adminBff.post<{ data: BiReport }>('/analytics/reports', data);
export const updateBiReport    = (id: string, data: Partial<BiReport>) => adminBff.patch<{ data: BiReport }>(`/analytics/reports/${id}`, data);
export const deleteBiReport    = (id: string) => adminBff.delete<{ data: { id: string } }>(`/analytics/reports/${id}`);
export const getBiAlerts       = (p?: Record<string,unknown>) => adminBff.get<{ data: BiAlert[] }>('/analytics?view=alerts', { params: p });
export const createBiAlert     = (data: Partial<BiAlert>) => adminBff.post<{ data: BiAlert }>('/analytics/alerts', data);
export const updateBiAlert     = (id: string, data: Partial<BiAlert>) => adminBff.patch<{ data: BiAlert }>(`/analytics/alerts/${id}`, data);

// ─── Workflow Engine (/api/admin/workflow/*) ──────────────────────────────────

export type WfDefinitionStatus = 'draft' | 'active' | 'archived';
export type WfInstanceStatus   = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled' | 'overdue';
export type WfStepStatus       = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'escalated' | 'skipped' | 'overdue';
export type WfStepType         = 'action' | 'approval' | 'condition' | 'notification' | 'ai_check';
export type WfDecision         = 'approve' | 'reject' | 'escalate';
export type WfSlaHealth        = 'on_track' | 'due_soon' | 'overdue' | 'no_sla';

export interface WfStepDef {
  id:                       string;
  name:                     string;
  type:                     WfStepType;
  assignee_role?:           string;
  assignee_email?:          string;
  sla_hours?:               number;
  escalate_to_role?:        string;
  on_approve?:              string;   // step id of next step on approval
  on_reject?:               string;   // step id if rejected (rare — usually closes instance)
  auto_approve_condition?:  { field: string; op: 'lt'|'lte'|'gt'|'gte'|'eq'; value: number } | null;
}

export interface WfDefinition {
  id:              string;
  name:            string;
  department:      string;
  trigger_event:   string;
  description:     string | null;
  version:         string;
  status:          WfDefinitionStatus;
  steps:           WfStepDef[];
  approval_chain:  string[];
  created_by:      string;
  approved_by:     string | null;
  approved_at:     string | null;
  parent_id:       string | null;
  created_at:      string;
  updated_at:      string;
}

export interface WfInstance {
  id:                  string;
  definition_id:       string;
  definition_version:  string;
  trigger_event:       string;
  trigger_ref:         string | null;
  trigger_ref_type:    string | null;
  status:              WfInstanceStatus;
  initiated_by:        string;
  current_step_index:  number;
  context:             Record<string, unknown>;
  outcome_note:        string | null;
  started_at:          string;
  completed_at:        string | null;
  created_at:          string;
  updated_at:          string;
  // joined
  workflow_name?:      string;
  department?:         string;
  definition_steps?:   WfStepDef[];
}

export interface WfStepLog {
  id:               string;
  instance_id:      string;
  step_id:          string;
  step_name:        string;
  step_type:        WfStepType;
  assignee_role:    string | null;
  assignee_id:      string | null;
  assignee_email:   string | null;
  status:           WfStepStatus;
  sla_hours:        number | null;
  sla_deadline:     string | null;
  decision:         WfDecision | 'auto_approved' | null;
  decision_by:      string | null;
  decision_at:      string | null;
  comments:         string | null;
  escalated_to:     string | null;
  reminder_sent:    boolean;
  activated_at:     string | null;
  created_at:       string;
  updated_at:       string;
  // computed
  sla_health?:      WfSlaHealth;
  sla_minutes_remaining?: number | null;
}

export interface WfEvent {
  id:          string;
  instance_id: string;
  step_log_id: string | null;
  event_type:  string;
  actor:       string;
  meta:        Record<string, unknown> | null;
  created_at:  string;
  step_name?:  string;
}

export interface WfTaskInboxRow extends WfStepLog {
  instance_id:       string;
  trigger_event:     string;
  trigger_ref:       string | null;
  trigger_ref_type:  string | null;
  context:           Record<string, unknown>;
  initiated_by:      string;
  instance_status:   WfInstanceStatus;
  started_at:        string;
  workflow_name:     string;
  department:        string;
}

export interface WfTaskStats {
  pending:        number;
  overdue:        number;
  escalated:      number;
  completed_week: number;
}

export interface WfDashboardData {
  active_by_department: { department: string; count: number }[];
  instances_by_status:  { status: string; count: number }[];
  sla_health:           { no_sla: number; on_track: number; due_soon: number; overdue: number };
  recently_completed:   WfInstance[];
  generated_at:         string;
}

// ── Definitions ───────────────────────────────────────────────────────────────

export const getWfDefinitions = (p?: { department?: string; status?: WfDefinitionStatus; trigger_event?: string; limit?: number; offset?: number }) =>
  adminBff.get<{ total: number; rows: WfDefinition[] }>('/workflow/definitions', { params: p }).then(r => r.data);

export const getWfDefinition = (id: string) =>
  adminBff.get<{ data: WfDefinition }>(`/workflow/definitions/${id}`).then(r => r.data.data);

export const createWfDefinition = (data: { name: string; department: string; trigger_event: string; description?: string; steps: WfStepDef[]; approval_chain?: string[] }) =>
  adminBff.post<{ data: WfDefinition }>('/workflow/definitions', data).then(r => r.data.data);

export const updateWfDefinition = (id: string, data: Partial<{ name: string; department: string; trigger_event: string; description: string; steps: WfStepDef[]; approval_chain: string[] }>) =>
  adminBff.patch<{ data: WfDefinition }>(`/workflow/definitions/${id}`, data).then(r => r.data.data);

export const approveWfDefinition = (id: string) =>
  adminBff.post<{ data: WfDefinition }>(`/workflow/definitions/${id}/approve`).then(r => r.data.data);

export const archiveWfDefinition = (id: string) =>
  adminBff.post<{ data: WfDefinition }>(`/workflow/definitions/${id}/archive`).then(r => r.data.data);

export const newWfDefinitionVersion = (id: string) =>
  adminBff.post<{ data: WfDefinition }>(`/workflow/definitions/${id}/new-version`).then(r => r.data.data);

export const getWfDefinitionVersions = (id: string) =>
  adminBff.get<{ rows: Pick<WfDefinition,'id'|'version'|'status'|'created_by'|'approved_by'|'approved_at'|'created_at'|'updated_at'>[] }>(`/workflow/definitions/${id}/versions`).then(r => r.data.rows);

// ── Instances ─────────────────────────────────────────────────────────────────

export const getWfInstances = (p?: { status?: WfInstanceStatus; department?: string; trigger_event?: string; initiated_by?: string; limit?: number; offset?: number }) =>
  adminBff.get<{ total: number; rows: WfInstance[] }>('/workflow/instances', { params: p }).then(r => r.data);

export const getWfInstance = (id: string) =>
  adminBff.get<{ data: WfInstance & { step_logs: WfStepLog[] } }>(`/workflow/instances/${id}`).then(r => r.data.data);

export const getWfInstanceEvents = (id: string) =>
  adminBff.get<{ rows: WfEvent[] }>(`/workflow/instances/${id}/events`).then(r => r.data.rows);

export const launchWfInstance = (data: { trigger_event: string; trigger_ref?: string; trigger_ref_type?: string; context?: Record<string, unknown> }) =>
  adminBff.post<{ data: WfInstance }>('/workflow/instances/launch', data).then(r => r.data.data);

export const cancelWfInstance = (id: string, reason?: string) =>
  adminBff.post<{ message: string }>(`/workflow/instances/${id}/cancel`, { reason }).then(r => r.data);

// ── Approvals ─────────────────────────────────────────────────────────────────

export const wfDecide = (data: { instance_id: string; step_log_id: string; decision: WfDecision; comments?: string }) =>
  adminBff.post<{ message: string; result: { status: string } }>('/workflow/approvals/decide', data).then(r => r.data);

export const getMyWfPendingApprovals = (p?: { limit?: number; offset?: number }) =>
  adminBff.get<{ total: number; rows: (WfStepLog & { instance_id: string; trigger_event: string; context: Record<string,unknown>; workflow_name: string; department: string; sla_health: WfSlaHealth })[] }>('/workflow/approvals/pending', { params: p }).then(r => r.data);

export const getMyWfApprovalHistory = (p?: { limit?: number; offset?: number }) =>
  adminBff.get<{ total: number; rows: (WfStepLog & { workflow_name: string; department: string; instance_status: WfInstanceStatus })[] }>('/workflow/approvals/history', { params: p }).then(r => r.data);

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const getWfTaskInbox = (p?: { status?: string; limit?: number; offset?: number }) =>
  adminBff.get<{ total: number; rows: WfTaskInboxRow[]; meta: { user: string; fetched: string } }>('/workflow/tasks/inbox', { params: p }).then(r => r.data);

export const getWfTaskStats = () =>
  adminBff.get<{ data: WfTaskStats }>('/workflow/tasks/stats').then(r => r.data.data);

export const getWfDashboard = () =>
  adminBff.get<{ data: WfDashboardData }>('/workflow/tasks/dashboard').then(r => r.data.data);

export const getWfOverdue = (p?: { limit?: number; offset?: number }) =>
  adminBff.get<{ total: number; rows: (WfStepLog & { workflow_name: string; department: string; hours_overdue: number })[] }>('/workflow/tasks/overdue', { params: p }).then(r => r.data);

// ── AI Recommendation ─────────────────────────────────────────────────────────

export interface WfRecommendation {
  recommended_decision: 'approve' | 'reject' | 'investigate';
  confidence:           'high' | 'medium' | 'low';
  context_summary:      string;
  rationale:            string;
  risk_factors:         string[];
  policy_notes:         string[];
}

export interface WfRecommendationResponse {
  step_log_id:   string;
  workflow_name: string;
  step_name:     string;
  department:    string;
  recommendation: WfRecommendation;
  generated_at:  string;
}

export const getWfRecommendation = (stepLogId: string) =>
  adminBff.get<WfRecommendationResponse>(`/workflow/tasks/${stepLogId}/recommend`).then(r => r.data);

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface WfAnalyticsOverview {
  total_instances:         number;
  active:                  number;
  approved:                number;
  rejected:                number;
  cancelled:               number;
  completed_30d:           number;
  completed_7d:            number;
  approval_rate_pct:       number | null;
  avg_completion_hours:    number | null;
  median_completion_hours: number | null;
  p90_completion_hours:    number | null;
  sla_breach_rate_pct:     number;
  total_steps_with_sla:    number;
  sla_breached:            number;
}

export interface WfAnalyticsByDefinition {
  definition_id:        string;
  workflow_name:        string;
  department:           string;
  trigger_event:        string;
  total_runs:           number;
  approved:             number;
  rejected:             number;
  cancelled:            number;
  active:               number;
  approval_rate_pct:    number | null;
  avg_completion_hours: number | null;
  bottleneck_step:      string | null;
  bottleneck_avg_hours: number | null;
}

export interface WfAnalyticsByDepartment {
  department:           string;
  total_runs:           number;
  active:               number;
  approved:             number;
  rejected:             number;
  overdue:              number;
  approval_rate_pct:    number | null;
  avg_completion_hours: number | null;
}

export interface WfAnalyticsBottleneck {
  step_name:        string;
  workflow_name:    string;
  department:       string;
  total_decisions:  number;
  avg_wait_hours:   number;
  max_wait_hours:   number;
  p90_wait_hours:   number;
  escalation_count: number;
  approvals:        number;
  rejections:       number;
}

export interface WfAnalyticsTrendPoint {
  month:     string;
  completed: number;
  approved:  number;
  rejected:  number;
}

export const getWfAnalyticsOverview    = () =>
  adminBff.get<{ data: WfAnalyticsOverview }>('/workflow/analytics/overview').then(r => r.data.data);

export const getWfAnalyticsByDefinition = (limit = 50) =>
  adminBff.get<{ data: WfAnalyticsByDefinition[] }>('/workflow/analytics/by-definition', { params: { limit } }).then(r => r.data.data);

export const getWfAnalyticsByDepartment = () =>
  adminBff.get<{ data: WfAnalyticsByDepartment[] }>('/workflow/analytics/by-department').then(r => r.data.data);

export const getWfAnalyticsBottlenecks = (limit = 10) =>
  adminBff.get<{ data: WfAnalyticsBottleneck[] }>('/workflow/analytics/bottlenecks', { params: { limit } }).then(r => r.data.data);

export const getWfAnalyticsTrend = () =>
  adminBff.get<{ data: WfAnalyticsTrendPoint[] }>('/workflow/analytics/trend').then(r => r.data.data);

// ─── Admin AI Assistant ───────────────────────────────────────────────────────

export interface AiChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface AiChatResponse {
  response:        string;
  tool_calls_made: string[];
}

export const adminAiChat = (
  message: string,
  history: AiChatMessage[] = [],
): Promise<AiChatResponse> =>
  fetch('/api/admin/ai-assistant', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, history }),
  }).then(r => r.json());

// ─── AI Daily Briefings ───────────────────────────────────────────────────────

export interface DailyBriefing {
  id:            string;
  briefing_date: string;
  content_md:    string;
  tool_calls:    string[];
  generated_at:  string;
  /** Only on list view — first 300 chars */
  preview?:      string;
  tool_count?:   number;
}

export interface DailyBriefingListResponse {
  data:   DailyBriefing[];
  total:  number;
  limit:  number;
  offset: number;
}

export const listDailyBriefings = (limit = 20, offset = 0): Promise<DailyBriefingListResponse> =>
  fetch(`/api/admin/briefings?limit=${limit}&offset=${offset}`, { cache: 'no-store' })
    .then(r => r.json());

export const getDailyBriefing = (id: string): Promise<{ data: DailyBriefing }> =>
  fetch(`/api/admin/briefings/${id}`, { cache: 'no-store' }).then(r => r.json());

export const generateDailyBriefing = (): Promise<{ data: DailyBriefing; message: string }> =>
  fetch('/api/admin/briefings/generate', { method: 'POST', cache: 'no-store' }).then(r => r.json());

// ─── AI Document Generator ────────────────────────────────────────────────────

export type AiDocumentType =
  | 'offer_letter'
  | 'expense_rejection'
  | 'deal_proposal_email'
  | 'supplier_contract_summary'
  | 'welcome_email'
  | 'performance_improvement_plan'
  | 'nda_draft'
  | 'po_justification';

export interface AiDocument {
  id:           string;
  type:         AiDocumentType;
  title:        string;
  content_md:   string;
  context_json: Record<string, string>;
  created_by:   string;
  created_at:   string;
  /** List-view only — first 200 chars */
  preview?:     string;
}

export interface AiDocumentListResponse {
  data:   AiDocument[];
  total:  number;
  limit:  number;
  offset: number;
}

export const listAiDocuments = (limit = 20, offset = 0, type?: string): Promise<AiDocumentListResponse> => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (type) params.set('type', type);
  return fetch(`/api/admin/documents?${params}`, { cache: 'no-store' }).then(r => r.json());
};

export const generateAiDocument = (
  type: AiDocumentType,
  fields: Record<string, string>,
): Promise<{ data: AiDocument }> =>
  fetch('/api/admin/documents', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ type, fields }),
  }).then(r => r.json());

// ─── AI Career Application Screening ─────────────────────────────────────────

export type ScreeningRecommendation = 'strong_yes' | 'yes' | 'maybe' | 'no';

export interface ScreeningResult {
  id:                  string;
  application_id:      string;
  applicant_name:      string;
  position:            string;
  overall_score:       number;
  recommendation:      ScreeningRecommendation;
  summary:             string;
  strengths:           string[];
  concerns:            string[];
  interview_questions: string[];
  culture_fit_notes:   string | null;
  generated_at:        string;
}

/** Returns existing screening or null (404 → null) */
export const getScreening = (applicationId: string): Promise<ScreeningResult | null> =>
  fetch(`/api/admin/screening/${applicationId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then(j => j.data ?? null));

/** Run a fresh AI screening for an application */
export const screenApplication = (applicationId: string): Promise<{ data: ScreeningResult }> =>
  fetch(`/api/admin/screening/${applicationId}`, {
    method: 'POST',
    cache:  'no-store',
  }).then(r => r.json());
export const deleteBiAlert     = (id: string) => adminBff.delete<{ data: { id: string } }>(`/analytics/alerts/${id}`);

// ─── AI Deal Intelligence ─────────────────────────────────────────────────────

export type DealRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DealAnalysis {
  id:                  string;
  deal_id:             string;
  deal_title:          string;
  partner_name:        string;
  health_score:        number;
  win_probability:     number;
  risk_level:          DealRiskLevel;
  summary:             string;
  strengths:           string[];
  key_risks:           string[];
  stall_factors:       string[];
  recommended_actions: string[];
  competitive_notes:   string | null;
  time_sensitivity:    string | null;
  generated_at:        string;
}

/** Returns existing deal analysis or null (404 → null) */
export const getDealAnalysis = (dealId: string): Promise<DealAnalysis | null> =>
  fetch(`/api/admin/deal-intelligence/${dealId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: DealAnalysis }) => j.data ?? null));

/** Run a fresh AI analysis for a deal */
export const analyzeDeal = (dealId: string): Promise<{ data: DealAnalysis }> =>
  fetch(`/api/admin/deal-intelligence/${dealId}`, {
    method: 'POST',
    cache:  'no-store',
  }).then(r => r.json());

// ─── AI Support Ticket Triage ─────────────────────────────────────────────────

export type TicketSentiment = 'positive' | 'neutral' | 'frustrated' | 'angry';

export interface SupportTriage {
  id:                  string;
  ticket_id:           string;
  ticket_subject:      string;
  sentiment:           TicketSentiment;
  urgency_override:    TicketPriority;
  category_suggestion: TicketCategory;
  summary:             string;
  root_cause:          string | null;
  draft_response:      string;
  escalation_flag:     boolean;
  escalation_reason:   string | null;
  resolution_steps:    string[];
  pattern_note:        string | null;
  generated_at:        string;
}

/** Returns existing triage or null (404 → null) */
export const getSupportTriage = (ticketId: string): Promise<SupportTriage | null> =>
  fetch(`/api/admin/support-triage/${ticketId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: SupportTriage }) => j.data ?? null));

/** Run a fresh AI triage for a support ticket */
export const triageTicket = (ticketId: string): Promise<{ data: SupportTriage }> =>
  fetch(`/api/admin/support-triage/${ticketId}`, {
    method: 'POST',
    cache:  'no-store',
  }).then(r => r.json());

// ─── AI Expense Claim Analyzer ────────────────────────────────────────────────

export type ExpenseRecommendation = 'approve' | 'reject' | 'query';

export interface ExpenseAnalysis {
  id:               string;
  claim_id:         string;
  employee_name:    string;
  recommendation:   ExpenseRecommendation;
  confidence:       number;
  policy_flags:     string[];
  anomaly_flags:    string[];
  summary:          string;
  justification:    string;
  suggested_notes:  string | null;
  generated_at:     string;
}

/** Returns existing expense analysis or null (404 → null) */
export const getExpenseAnalysis = (claimId: string): Promise<ExpenseAnalysis | null> =>
  fetch(`/api/admin/expense-analyzer/${claimId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: ExpenseAnalysis }) => j.data ?? null));

/** Run a fresh AI analysis for an expense claim */
export const analyzeExpenseClaim = (claimId: string): Promise<{ data: ExpenseAnalysis }> =>
  fetch(`/api/admin/expense-analyzer/${claimId}`, {
    method: 'POST',
    cache:  'no-store',
  }).then(r => r.json());

// ─── AI Fraud Risk Scorer ─────────────────────────────────────────────────────

export type FraudThreatLevel = 'critical' | 'high' | 'medium' | 'low';
export type FraudVerdict     = 'block' | 'escalate' | 'review' | 'clear';

export interface FraudScore {
  id:                   string;
  case_id:              string;
  booking_ref:          string | null;
  threat_level:         FraudThreatLevel;
  verdict:              FraudVerdict;
  confidence:           number;
  evidence_summary:     string;
  key_indicators:       string[];
  mitigating_factors:   string[];
  recommended_action:   string;
  watchlist_should_add: boolean;
  watchlist_type:       string | null;
  watchlist_reason:     string | null;
  pattern_note:         string | null;
  generated_at:         string;
}

/** Returns existing fraud score or null (404 → null) */
export const getFraudScore = (caseId: string): Promise<FraudScore | null> =>
  fetch(`/api/admin/fraud-scorer/${caseId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: FraudScore }) => j.data ?? null));

/** Run a fresh AI fraud score for a case */
export const scoreFraudCase = (caseId: string): Promise<{ data: FraudScore }> =>
  fetch(`/api/admin/fraud-scorer/${caseId}`, {
    method: 'POST',
    cache:  'no-store',
  }).then(r => r.json());

// ─── AI Contract & Legal Document Reviewer ───────────────────────────────────

export type ContractRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ContractReview {
  id:               string;
  doc_id:           string;
  doc_title:        string | null;
  doc_type:         string | null;
  risk_level:       ContractRiskLevel;
  overall_summary:  string;
  risk_flags:       string[];
  missing_clauses:  string[];
  compliance_notes: string[];
  expiry_alert:     string | null;
  recommendations:  string[];
  generated_at:     string;
}

/** Returns existing contract review or null (404 → null) */
export const getContractReview = (docId: string): Promise<ContractReview | null> =>
  fetch(`/api/admin/contract-review/${docId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: ContractReview }) => j.data ?? null));

/** Run a fresh AI review for a legal document */
export const reviewContract = (docId: string): Promise<{ data: ContractReview }> =>
  fetch(`/api/admin/contract-review/${docId}`, {
    method: 'POST',
    cache:  'no-store',
  }).then(r => r.json());

// ─── AI KPI Root Cause Analyzer ──────────────────────────────────────────────

export interface KpiRecommendedAction {
  department: string;
  action:     string;
}

export interface KpiAnalysis {
  id:                   string;
  alert_id:             string;
  kpi_name:             string | null;
  alert_severity:       string | null;
  root_cause_dept:      string;
  root_cause_summary:   string;
  confidence:           'high' | 'medium' | 'low';
  contributing_factors: string[];
  ruling_out:           string[];
  recommended_actions:  KpiRecommendedAction[];
  escalate_to:          string[];
  monitoring_signals:   string[];
  generated_at:         string;
}

/** Returns existing KPI analysis or null (404 → null) */
export const getKpiAnalysis = (alertId: string): Promise<KpiAnalysis | null> =>
  fetch(`/api/admin/kpi-analyzer/${alertId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: KpiAnalysis }) => j.data ?? null));

/** Run a fresh AI KPI root cause analysis for a BI alert */
export const analyzeKpiAlert = (alertId: string): Promise<{ data: KpiAnalysis }> =>
  fetch(`/api/admin/kpi-analyzer/${alertId}`, {
    method: 'POST',
    cache:  'no-store',
  }).then(r => r.json());

// ─── AI DSR Auto-Fulfillment ──────────────────────────────────────────────────

export interface DsrShardSummary {
  shard:        string;
  has_data:     boolean;
  record_count: number;
  tables_found: string[];
}

export interface DsrFulfillment {
  id:                     string;
  dsr_id:                 string;
  email_snapshot:         string | null;
  request_type:           string | null;
  law:                    string | null;
  cover_letter_md:        string;
  data_summary:           string;
  categories_found:       string[];
  shard_summary:          DsrShardSummary[];
  retention_notes:        string[];
  recommended_redactions: string[];
  sla_status:             'on_track' | 'at_risk' | 'overdue';
  response_deadline:      string | null;
  total_records_found:    number;
  generated_at:           string;
}

/** Returns existing DSR fulfillment package or null (404 → null) */
export const getDsrFulfillment = (dsrId: string): Promise<DsrFulfillment | null> =>
  fetch(`/api/admin/dsr-fulfillment/${dsrId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: DsrFulfillment }) => j.data ?? null));

/** Compile AI DSR fulfillment package (fans out across 8 shards — may take up to 60s) */
export const compileDsrFulfillment = (dsrId: string): Promise<{ data: DsrFulfillment }> =>
  fetch(`/api/admin/dsr-fulfillment/${dsrId}`, {
    method: 'POST',
    cache:  'no-store',
  }).then(r => r.json());

// ─── AI Workflow Builder ──────────────────────────────────────────────────────

export interface WorkflowBuilderDraft {
  name:           string;
  department:     string;
  trigger_event:  string;
  description:    string;
  approval_chain: string[];
  steps:          WfStepDef[];
  builder_notes:  string[];
}

/** Generate a draft workflow definition from a plain English description */
export const generateWorkflowDraft = (payload: {
  description: string;
  department?: string;
  context?:    string;
}): Promise<{ data: WorkflowBuilderDraft; message: string }> =>
  fetch('/api/admin/workflow-builder', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
    cache:   'no-store',
  }).then(r => r.json());

// ─── AI HR Performance Review Analyzer ───────────────────────────────────────

export type PerfHealth = 'strong' | 'healthy' | 'concerning' | 'critical';

export interface PerfTopPerformer   { employee_name: string; rating: number; strength: string }
export interface PerfDevelopmentNeed { employee_name: string; rating: number; concern: string }

export interface PerformanceAnalysis {
  id:                     string;
  department_id:          string;
  department_name:        string | null;
  overall_health:         PerfHealth;
  team_summary:           string;
  review_period:          string | null;
  total_reviewed:         number;
  top_performers:         PerfTopPerformer[];
  development_needs:      PerfDevelopmentNeed[];
  team_strengths:         string[];
  development_priorities: string[];
  manager_recommendations: string[];
  risk_flags:             string[];
  generated_at:           string;
}

export const getPerformanceAnalysis = (departmentId: string): Promise<PerformanceAnalysis | null> =>
  fetch(`/api/admin/performance-analyzer/${departmentId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: PerformanceAnalysis }) => j.data ?? null));

export const analyzePerformance = (departmentId: string): Promise<{ data: PerformanceAnalysis }> =>
  fetch(`/api/admin/performance-analyzer/${departmentId}`, { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Vendor Due Diligence ──────────────────────────────────────────────────

export type VendorRiskLevel       = 'low' | 'medium' | 'high' | 'critical';
export type VendorApproveRec      = 'approve' | 'approve_with_conditions' | 'defer' | 'reject';

export interface VendorDiligence {
  id:                     string;
  vendor_id:              string;
  vendor_name:            string | null;
  risk_level:             VendorRiskLevel;
  overall_score:          number;
  executive_summary:      string;
  risk_flags:             string[];
  missing_compliance:     string[];
  financial_health_note:  string | null;
  payment_history_note:   string | null;
  sla_performance_note:   string | null;
  recommendations:        string[];
  approve_recommendation: VendorApproveRec;
  generated_at:           string;
}

export const getVendorDiligence = (vendorId: string): Promise<VendorDiligence | null> =>
  fetch(`/api/admin/vendor-diligence/${vendorId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: VendorDiligence }) => j.data ?? null));

export const runVendorDiligence = (vendorId: string): Promise<{ data: VendorDiligence }> =>
  fetch(`/api/admin/vendor-diligence/${vendorId}`, { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI CRM Deal Coach ────────────────────────────────────────────────────────

export type DealMomentum      = 'accelerating' | 'steady' | 'stalled' | 'declining';
export type DealRelationship  = 'strong' | 'warm' | 'cold' | 'at_risk';

export interface DealNextAction { action: string; owner: string; timeline: string }

export interface DealCoaching {
  id:                    string;
  deal_id:               string;
  deal_title:            string | null;
  partner_name:          string | null;
  stage:                 string | null;
  momentum:              DealMomentum;
  win_probability_pct:   number;
  stage_assessment:      string;
  relationship_health:   DealRelationship;
  risks:                 string[];
  opportunities:         string[];
  next_best_actions:     DealNextAction[];
  competitive_intel_gap: string | null;
  coaching_summary:      string;
  red_flags:             string[];
  generated_at:          string;
}

export const getDealCoaching = (dealId: string): Promise<DealCoaching | null> =>
  fetch(`/api/admin/deal-coach/${dealId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: DealCoaching }) => j.data ?? null));

export const coachDeal = (dealId: string): Promise<{ data: DealCoaching }> =>
  fetch(`/api/admin/deal-coach/${dealId}`, { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Campaign Analyzer ─────────────────────────────────────────────────────

export interface CampaignTopEntry    { name: string; channel: string; status: string; why: string }
export interface CampaignUnderperformer { name: string; channel: string; issue: string; recommendation: string }
export interface CampaignChannelInsight { channel: string; assessment: string; opportunity: string }

export interface CampaignAnalysis {
  id:                string;
  snapshot_key:      string;
  total_campaigns:   number;
  active_campaigns:  number;
  overall_health:    'excellent' | 'good' | 'fair' | 'poor';
  executive_summary: string;
  top_campaigns:     CampaignTopEntry[];
  underperformers:   CampaignUnderperformer[];
  channel_insights:  CampaignChannelInsight[];
  budget_assessment: string | null;
  content_gaps:      string[];
  quick_wins:        string[];
  recommendations:   string[];
  risk_flags:        string[];
  generated_at:      string;
}

export const getCampaignAnalysis = (): Promise<CampaignAnalysis | null> =>
  fetch('/api/admin/campaign-analyzer', { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: CampaignAnalysis }) => j.data ?? null));

export const analyzeCampaigns = (): Promise<{ data: CampaignAnalysis }> =>
  fetch('/api/admin/campaign-analyzer', { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Account Health ────────────────────────────────────────────────────────

export interface AccountNextTouchpoint { action: string; type: string; timeline: string; owner: string }

export interface AccountHealth {
  id:                 string;
  account_id:         string;
  account_name:       string | null;
  churn_risk:         'critical' | 'high' | 'medium' | 'low';
  health_score:       number;
  engagement_trend:   'improving' | 'stable' | 'declining' | 'at_risk';
  executive_summary:  string;
  strengths:          string[];
  concerns:           string[];
  next_touchpoints:   AccountNextTouchpoint[];
  renewal_alert:      string | null;
  escalation_summary: string | null;
  recommendations:    string[];
  red_flags:          string[];
  generated_at:       string;
}

export const getAccountHealth = (accountId: string): Promise<AccountHealth | null> =>
  fetch(`/api/admin/account-health/${accountId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: AccountHealth }) => j.data ?? null));

export const analyzeAccountHealth = (accountId: string): Promise<{ data: AccountHealth }> =>
  fetch(`/api/admin/account-health/${accountId}`, { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Procurement Risk ──────────────────────────────────────────────────────

export interface ProcExpiringContract { supplier: string; title: string; end_date: string; days_left: number; action_needed: string }
export interface ProcSlaBreachRisk    { supplier: string; metric: string; gap: string; impact: string }
export interface ProcHighRiskSupplier { name: string; risk: string; reason: string }

export interface ProcurementRisk {
  id:                        string;
  snapshot_key:              string;
  total_suppliers:           number;
  total_contracts:           number;
  overall_risk:              'low' | 'medium' | 'high' | 'critical';
  executive_summary:         string;
  expiring_contracts:        ProcExpiringContract[];
  sla_breach_risks:          ProcSlaBreachRisk[];
  high_risk_suppliers:       ProcHighRiskSupplier[];
  spend_concentration:       string | null;
  consolidation_opportunities: string[];
  compliance_gaps:           string[];
  quick_wins:                string[];
  recommendations:           string[];
  generated_at:              string;
}

export const getProcurementRisk = (): Promise<ProcurementRisk | null> =>
  fetch('/api/admin/procurement-risk', { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: ProcurementRisk }) => j.data ?? null));

export const analyzeProcurementRisk = (): Promise<{ data: ProcurementRisk }> =>
  fetch('/api/admin/procurement-risk', { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Roadmap Advisor ───────────────────────────────────────────────────────

export interface RoadmapPriorityAdjustment { title: string; current_priority: string; suggested_priority: string; reason: string }
export interface RoadmapQuickWin           { title: string; why: string; effort: 'low' | 'medium' }
export interface RoadmapStrategicBet       { title: string; market_opportunity: string; quarter: string }

export interface RoadmapAdvice {
  id:                   string;
  snapshot_key:         string;
  total_items:          number;
  roadmap_health:       'excellent' | 'good' | 'fair' | 'poor';
  executive_summary:    string;
  priority_adjustments: RoadmapPriorityAdjustment[];
  quick_wins:           RoadmapQuickWin[];
  strategic_bets:       RoadmapStrategicBet[];
  tech_debt_flags:      string[];
  feature_flag_risks:   string[];
  next_release_rec:     string | null;
  market_alignment:     string | null;
  recommendations:      string[];
  generated_at:         string;
}

export const getRoadmapAdvice = (): Promise<RoadmapAdvice | null> =>
  fetch('/api/admin/roadmap-advisor', { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: RoadmapAdvice }) => j.data ?? null));

export const analyzeRoadmap = (): Promise<{ data: RoadmapAdvice }> =>
  fetch('/api/admin/roadmap-advisor', { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Sprint Health ─────────────────────────────────────────────────────────

export interface SprintBlocker    { task: string; assignee: string; risk: string; suggested_action: string }
export interface SprintDailyAction { action: string; owner: string; urgency: 'today' | 'this_week' }

export interface SprintHealth {
  id:                string;
  sprint_id:         string;
  sprint_name:       string | null;
  health_status:     'on_track' | 'at_risk' | 'behind' | 'critical';
  velocity_trend:    'accelerating' | 'stable' | 'slowing' | 'blocked';
  completion_pct:    number;
  executive_summary: string;
  blockers:          SprintBlocker[];
  risks:             string[];
  achievements:      string[];
  deployment_health: string | null;
  scope_creep_flag:  boolean;
  recommendations:   string[];
  daily_actions:     SprintDailyAction[];
  generated_at:      string;
}

export const getSprintHealth = (sprintId: string): Promise<SprintHealth | null> =>
  fetch(`/api/admin/sprint-health/${sprintId}`, { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: SprintHealth }) => j.data ?? null));

export const analyzeSprintHealth = (sprintId: string): Promise<{ data: SprintHealth }> =>
  fetch(`/api/admin/sprint-health/${sprintId}`, { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI BizDev Advisor ────────────────────────────────────────────────────────

export interface BizDevTopPartner      { name: string; type: string; why: string; opportunity: string }
export interface BizDevAtRiskPartner   { name: string; risk: string; action: string; urgency: 'immediate' | 'this_week' | 'this_month' }
export interface BizDevExpiringAgreement { partner: string; title: string; days_left: number; renewal_strategy: string }
export interface BizDevMarketExpansion { country: string; region: string; rationale: string; partner_type_needed: string }

export interface BizDevAdvice {
  id:                    string;
  snapshot_key:          string;
  total_partners:        number;
  total_agreements:      number;
  pipeline_health:       'excellent' | 'good' | 'fair' | 'poor';
  executive_summary:     string;
  top_partners:          BizDevTopPartner[];
  at_risk_partners:      BizDevAtRiskPartner[];
  expiring_agreements:   BizDevExpiringAgreement[];
  market_expansion_rec:  BizDevMarketExpansion[];
  pipeline_gaps:         string[];
  quick_wins:            string[];
  strategic_priorities:  string[];
  recommendations:       string[];
  generated_at:          string;
}

export const getBizDevAdvice = (): Promise<BizDevAdvice | null> =>
  fetch('/api/admin/bizdev-advisor', { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: BizDevAdvice }) => j.data ?? null));

export const analyzeBizDev = (): Promise<{ data: BizDevAdvice }> =>
  fetch('/api/admin/bizdev-advisor', { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Booking Insights ──────────────────────────────────────────────────────

export interface BookingAnomaly        { type: 'spike' | 'drop' | 'pattern'; description: string; severity: 'high' | 'medium' | 'low'; likely_cause: string }
export interface BookingProductEntry   { product: 'hotel' | 'flight' | 'car'; assessment: string; opportunity: string }
export interface BookingRevenueOpp     { opportunity: string; estimated_impact: string; effort: 'low' | 'medium' | 'high' }

export interface BookingInsights {
  id:                    string;
  snapshot_key:          string;
  total_bookings:        number;
  revenue_sar:           number;
  cancellation_rate_pct: number;
  booking_health:        'excellent' | 'good' | 'fair' | 'poor';
  executive_summary:     string;
  anomalies:             BookingAnomaly[];
  product_breakdown:     BookingProductEntry[];
  conversion_insights:   string | null;
  cancellation_patterns: string | null;
  revenue_opportunities: BookingRevenueOpp[];
  seasonal_forecast:     string | null;
  risk_flags:            string[];
  recommendations:       string[];
  generated_at:          string;
}

export const getBookingInsights = (): Promise<BookingInsights | null> =>
  fetch('/api/admin/booking-insights', { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: BookingInsights }) => j.data ?? null));

export const analyzeBookings = (): Promise<{ data: BookingInsights }> =>
  fetch('/api/admin/booking-insights', { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Loyalty Advisor ───────────────────────────────────────────────────────

export interface LoyaltyTierHealth     { tier: string; assessment: string; action: string }
export interface LoyaltyChurnSegment   { segment: string; size_estimate: string; risk: string; re_engagement_tactic: string }
export interface LoyaltyRewardRec      { reward: string; rationale: string; gulf_relevance: string }

export interface LoyaltyAdvice {
  id:                    string;
  snapshot_key:          string;
  total_members:         number;
  points_outstanding:    number;
  programme_health:      'excellent' | 'good' | 'fair' | 'poor';
  executive_summary:     string;
  tier_health:           LoyaltyTierHealth[];
  churn_risk_segments:   LoyaltyChurnSegment[];
  redemption_insights:   string | null;
  liability_assessment:  string | null;
  engagement_gaps:       string[];
  quick_wins:            string[];
  reward_recommendations: LoyaltyRewardRec[];
  recommendations:       string[];
  generated_at:          string;
}

export const getLoyaltyAdvice = (): Promise<LoyaltyAdvice | null> =>
  fetch('/api/admin/loyalty-advisor', { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: LoyaltyAdvice }) => j.data ?? null));

export const analyzeLoyalty = (): Promise<{ data: LoyaltyAdvice }> =>
  fetch('/api/admin/loyalty-advisor', { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Inventory Advisor ─────────────────────────────────────────────────────

export interface InventoryInsightItem  { finding: string; priority: 'critical' | 'high' | 'medium' | 'low'; action: string }
export interface InventoryCoverageGap  { gap: string; location_or_route: string; impact: string; fix: string }

export interface InventoryAdvice {
  id:                   string;
  snapshot_key:         string;
  total_hotels:         number;
  total_flights:        number;
  total_cars:           number;
  inventory_health:     'excellent' | 'good' | 'fair' | 'poor';
  executive_summary:    string;
  hotel_insights:       InventoryInsightItem[];
  flight_insights:      InventoryInsightItem[];
  car_insights:         InventoryInsightItem[];
  coverage_gaps:        InventoryCoverageGap[];
  pricing_flags:        string[];
  hajj_umrah_readiness: string | null;
  quick_wins:           string[];
  recommendations:      string[];
  generated_at:         string;
}

export const getInventoryAdvice = (): Promise<InventoryAdvice | null> =>
  fetch('/api/admin/inventory-advisor', { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: InventoryAdvice }) => j.data ?? null));

export const analyzeInventory = (): Promise<{ data: InventoryAdvice }> =>
  fetch('/api/admin/inventory-advisor', { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Legal Advisor ─────────────────────────────────────────────────────────

export interface LegalCriticalMatter   { title: string; type: string; jurisdiction: string; risk: string; recommended_action: string; urgency: 'immediate' | 'this_week' | 'this_month' }
export interface LegalJurisdictionRisk { jurisdiction: string; risk: string; open_matters: number; action: string }
export interface LegalOverdueTask      { task: string; days_overdue: number; consequence: string; action: string }
export interface LegalContractAlert    { doc_type: string; count_expiring: number; risk: string; action: string }

export interface LegalAdvice {
  id:                  string;
  snapshot_key:        string;
  total_matters:       number;
  open_matters:        number;
  overdue_tasks:       number;
  legal_health:        'excellent' | 'good' | 'fair' | 'poor';
  executive_summary:   string;
  critical_matters:    LegalCriticalMatter[];
  jurisdiction_risks:  LegalJurisdictionRisk[];
  overdue_tasks_list:  LegalOverdueTask[];
  contract_alerts:     LegalContractAlert[];
  compliance_gaps:     string[];
  quick_wins:          string[];
  recommendations:     string[];
  generated_at:        string;
}

export const getLegalAdvice = (): Promise<LegalAdvice | null> =>
  fetch('/api/admin/legal-advisor', { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: LegalAdvice }) => j.data ?? null));

export const analyzeLegal = (): Promise<{ data: LegalAdvice }> =>
  fetch('/api/admin/legal-advisor', { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Compliance Advisor ────────────────────────────────────────────────────

export interface ComplianceSlaBreachItem  { regulation: string; breach_type: string; count: number; risk: string; action: string }
export interface ComplianceRegulationRisk { regulation: string; risk_level: 'critical' | 'high' | 'medium' | 'low'; issue: string; remediation: string }

export interface ComplianceAdvice {
  id:                      string;
  snapshot_key:            string;
  total_erasure_requests:  number;
  overdue_erasures:        number;
  total_data_exports:      number;
  compliance_health:       'excellent' | 'good' | 'fair' | 'poor';
  executive_summary:       string;
  sla_breaches:            ComplianceSlaBreachItem[];
  regulation_risks:        ComplianceRegulationRisk[];
  erasure_backlog:         string | null;
  export_patterns:         string | null;
  breach_assessment:       string | null;
  quick_wins:              string[];
  recommendations:         string[];
  generated_at:            string;
}

export const getComplianceAdvice = (): Promise<ComplianceAdvice | null> =>
  fetch('/api/admin/compliance-advisor', { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: ComplianceAdvice }) => j.data ?? null));

export const analyzeCompliance = (): Promise<{ data: ComplianceAdvice }> =>
  fetch('/api/admin/compliance-advisor', { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Ops Advisor ───────────────────────────────────────────────────────────

export interface OpsCriticalIncident { title: string; severity: string; service: string; age_hours: number; risk: string; recommended_action: string }
export interface OpsSlaRisk          { type: 'incident' | 'ticket'; segment: string; count: number; breach_risk: string; action: string }

export interface OpsAdvice {
  id:                   string;
  snapshot_key:         string;
  total_incidents:      number;
  open_incidents:       number;
  open_tickets:         number;
  ops_health:           'excellent' | 'good' | 'fair' | 'poor';
  executive_summary:    string;
  critical_incidents:   OpsCriticalIncident[];
  sla_risks:            OpsSlaRisk[];
  ticket_backlog:       string | null;
  incident_patterns:    string | null;
  platform_risk_flags:  string[];
  quick_wins:           string[];
  recommendations:      string[];
  generated_at:         string;
}

export const getOpsAdvice = (): Promise<OpsAdvice | null> =>
  fetch('/api/admin/ops-advisor', { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: OpsAdvice }) => j.data ?? null));

export const analyzeOps = (): Promise<{ data: OpsAdvice }> =>
  fetch('/api/admin/ops-advisor', { method: 'POST', cache: 'no-store' })
    .then(r => r.json());

// ─── AI Fraud Advisor ─────────────────────────────────────────────────────────

export interface FraudThreatVector   { vector: string; severity: 'critical' | 'high' | 'medium' | 'low'; trend: 'increasing' | 'stable' | 'decreasing'; evidence: string; countermeasure: string }
export interface FraudRuleGap        { gap: string; fraud_type: string; risk: string; rule_to_add: string }
export interface FraudHighRiskPattern { pattern: string; volume: string; loss_exposure: string; detection_status: 'covered' | 'gap' | 'partial' }

export interface FraudAdvice {
  id:                      string;
  snapshot_key:            string;
  total_cases:             number;
  confirmed_fraud:         number;
  pending_review:          number;
  fraud_health:            'excellent' | 'good' | 'fair' | 'poor';
  executive_summary:       string;
  threat_vectors:          FraudThreatVector[];
  rule_gaps:               FraudRuleGap[];
  high_risk_patterns:      FraudHighRiskPattern[];
  watchlist_assessment:    string | null;
  false_positive_analysis: string | null;
  platform_risk_flags:     string[];
  quick_wins:              string[];
  recommendations:         string[];
  generated_at:            string;
}

export const getFraudAdvice = (): Promise<FraudAdvice | null> =>
  fetch('/api/admin/fraud-advisor', { cache: 'no-store' })
    .then(r => r.status === 404 ? null : r.json().then((j: { data?: FraudAdvice }) => j.data ?? null));

export const analyzeFraud = (): Promise<{ data: FraudAdvice }> =>
  fetch('/api/admin/fraud-advisor', { method: 'POST', cache: 'no-store' })
    .then(r => r.json());
