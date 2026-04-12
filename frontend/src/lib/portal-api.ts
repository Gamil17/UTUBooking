/**
 * Portal API client — used by /pro/* pages.
 * Reads the access token from sessionStorage and attaches it as a Bearer token.
 * Throws on non-2xx responses (caller should catch).
 */

import { getPortalToken, clearPortalToken } from './portal-auth';

function authHeader(): Record<string, string> {
  const token = getPortalToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/pro${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401) {
    // Token expired or invalid — clear it so the layout redirects to /pro
    clearPortalToken();
    throw { error: 'SESSION_EXPIRED', message: 'Your session has expired. Please sign in again.' };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data as T;
}

function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

// ── Employee Directory ────────────────────────────────────────────────────────

export interface CorporateEmployee {
  id:                string;
  account_id:        string;
  employee_ref:      string | null;
  name:              string;
  email:             string;
  phone:             string | null;
  department:        string | null;
  job_title:         string | null;
  nationality:       string | null;
  passport_number:   string | null;
  passport_expiry:   string | null;  // ISO date
  date_of_birth:     string | null;  // ISO date
  gender:            'male' | 'female' | 'other' | null;
  meal_preference:   'standard' | 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten_free' | 'other';
  seat_preference:   'window' | 'aisle' | 'none';
  is_travel_manager: boolean;
  status:            'active' | 'inactive';
  notes:             string | null;
  created_at:        string;
  updated_at:        string;
}

export const getEmployees = (params?: {
  search?: string; status?: string; department?: string; page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.search)     qs.set('search',     params.search);
  if (params?.status)     qs.set('status',     params.status);
  if (params?.department) qs.set('department', params.department);
  if (params?.page)       qs.set('page',       String(params.page));
  if (params?.limit)      qs.set('limit',      String(params.limit));
  const q = qs.toString();
  return get<{ data: CorporateEmployee[]; total: number; page: number; limit: number }>(
    `/employees${q ? `?${q}` : ''}`
  );
};

export const createEmployee = (data: Partial<CorporateEmployee>) =>
  post<{ data: CorporateEmployee }>('/employees', data);

export const updateEmployee = (id: string, data: Partial<CorporateEmployee>) =>
  patch<{ data: CorporateEmployee }>(`/employees/${id}`, data);

export const deactivateEmployee = (id: string) =>
  del<{ data: CorporateEmployee }>(`/employees/${id}`);

// ── Corporate Bookings ────────────────────────────────────────────────────────

export type BookingType   = 'flight' | 'hotel' | 'car' | 'package';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed';
export type FlightClass   = 'economy' | 'premium_economy' | 'business' | 'first';

export interface CorporateBooking {
  id:                 string;
  account_id:         string;
  employee_id:        string;
  booked_by_user_id:  string;
  booking_ref:        string | null;
  booking_type:       BookingType;
  status:             BookingStatus;
  origin:             string | null;
  destination:        string;
  depart_date:        string;   // ISO date
  return_date:        string | null;
  flight_class:       FlightClass | null;
  hotel_stars:        number | null;
  estimated_cost_sar: number;
  actual_cost_sar:    number | null;
  currency:           string;
  policy_compliant:   boolean;
  policy_flags:       string[] | null;
  requires_approval:  boolean;
  approved_by:        string | null;
  approved_at:        string | null;
  purpose:            string | null;
  notes:              string | null;
  po_reference:       string | null;
  cost_center:        string | null;
  // Joined from corporate_employees
  employee_name:      string;
  employee_email:     string;
  employee_dept:      string | null;
  employee_nationality: string | null;
  created_at:         string;
  updated_at:         string;
}

export const getBookings = (params?: {
  status?: string; booking_type?: string; employee_id?: string;
  page?: number; limit?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.status)       qs.set('status',       params.status);
  if (params?.booking_type) qs.set('booking_type', params.booking_type);
  if (params?.employee_id)  qs.set('employee_id',  params.employee_id);
  if (params?.page)         qs.set('page',         String(params.page));
  if (params?.limit)        qs.set('limit',        String(params.limit));
  const q = qs.toString();
  return get<{ data: CorporateBooking[]; total: number; page: number; limit: number }>(
    `/bookings${q ? `?${q}` : ''}`
  );
};

export const createBooking = (data: {
  employee_id: string; booking_type: BookingType;
  origin?: string; destination: string;
  depart_date: string; return_date?: string;
  flight_class?: FlightClass; hotel_stars?: number;
  estimated_cost_sar?: number; currency?: string;
  purpose?: string; notes?: string;
  po_reference?: string; cost_center?: string;
}) => post<{ data: CorporateBooking; policy_flags: string[]; discount_applied_pct: number }>('/bookings', data);

export const updateBooking = (id: string, data: { purpose?: string; notes?: string }) =>
  patch<{ data: CorporateBooking }>(`/bookings/${id}`, data);

// ── Approvals ─────────────────────────────────────────────────────────────────

export const getPendingApprovals = (params?: { page?: number; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.page)  qs.set('page',  String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString();
  return get<{ data: CorporateBooking[]; total: number; page: number; limit: number }>(
    `/approvals${q ? `?${q}` : ''}`
  );
};

export const approveBooking = (id: string) =>
  post<{ data: CorporateBooking }>(`/approvals/${id}?action=approve`, {});

export const rejectBooking = (id: string, reason?: string) =>
  post<{ data: CorporateBooking }>(`/approvals/${id}?action=reject`, { reason });

// ── Group Travel ──────────────────────────────────────────────────────────────

export type TripGroupStatus = 'draft' | 'confirmed' | 'cancelled';

export interface CorporateTripGroup {
  id:                  string;
  account_id:          string;
  name:                string;
  description:         string | null;
  destination:         string;
  origin:              string | null;
  booking_type:        BookingType;
  flight_class:        FlightClass | null;
  depart_date:         string;   // ISO date
  return_date:         string | null;
  traveler_count:      number;
  total_spend_sar:     number;
  purpose:             string | null;
  status:              TripGroupStatus;
  created_by_user_id:  string | null;
  created_at:          string;
  updated_at:          string;
}

export interface PassportWarning {
  employee_id:     string;
  name:            string;
  passport_expiry: string;
}

export interface BulkBookingResult {
  group:               CorporateTripGroup;
  bookings:            (CorporateBooking & { employee_name: string; employee_email: string })[];
  policy_flags:        string[];
  passport_warnings:   PassportWarning[];
  discount_applied_pct: number;
  approval_required:   boolean;
}

export const getTripGroups = (params?: { status?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.page)   qs.set('page',   String(params.page));
  if (params?.limit)  qs.set('limit',  String(params.limit));
  const q = qs.toString();
  return get<{ data: CorporateTripGroup[]; total: number; page: number; limit: number }>(
    `/groups${q ? `?${q}` : ''}`
  );
};

export const getGroupBookings = (groupId: string) =>
  get<{ data: (CorporateBooking & { employee_name: string; employee_email: string; passport_expiry: string | null })[] }>(
    `/groups/${groupId}`
  );

export const createBulkBooking = (data: {
  name: string; description?: string;
  destination: string; origin?: string;
  booking_type: BookingType; flight_class?: FlightClass; hotel_stars?: number;
  depart_date: string; return_date?: string;
  estimated_cost_sar_per_person?: number; currency?: string;
  purpose?: string;
  employee_ids: string[];
}) => post<{ data: BulkBookingResult }>('/groups', data);

export const updateTripGroup = (id: string, data: { name?: string; status?: TripGroupStatus; purpose?: string }) =>
  patch<{ data: CorporateTripGroup }>(`/groups/${id}`, data);

export const cancelTripGroup = (id: string) =>
  del<{ data: { id: string; status: string } }>(`/groups/${id}`);

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export interface UpcomingTrip {
  id:                string;
  booking_type:      BookingType;
  origin:            string | null;
  destination:       string;
  depart_date:       string;
  return_date:       string | null;
  flight_class:      FlightClass | null;
  estimated_cost_sar: number;
  status:            BookingStatus;
  requires_approval: boolean;
  approval_status:   string;
  employee_name:     string;
  employee_dept:     string | null;
}

export interface TopDestination {
  destination:     string;
  booking_count:   number;
  total_spend_sar: number;
}

export interface ExpiringPassport {
  id:              string;
  name:            string;
  department:      string | null;
  passport_expiry: string;
}

export interface DashboardStats {
  budget: {
    annual_sar:  number;
    monthly_sar: number;
  };
  spend: {
    this_month_sar:       number;
    last_month_sar:       number;
    this_year_sar:        number;
    month_pct_of_budget:  number;
  };
  pending_approvals:     number;
  policy_compliance_pct: number;
  upcoming_trips:        UpcomingTrip[];
  top_destinations:      TopDestination[];
  expiring_passports:    ExpiringPassport[];
}

export const getDashboardStats = () =>
  get<{ data: DashboardStats }>('/stats');

// ── Account Settings ──────────────────────────────────────────────────────────

export interface AccountSettings {
  id:                      string;
  company_name:            string;
  industry:                string;
  country:                 string | null;
  tier:                    'enterprise' | 'premium' | 'standard';
  status:                  string;
  annual_travel_budget_sar: number;
  max_flight_class:        FlightClass;
  max_hotel_stars:         number;
  per_diem_sar:            number;
  preferred_airlines:      string[] | null;
  advance_booking_days:    number;
  discount_pct:            number;
  contract_start:          string | null;
  contract_end:            string | null;
  total_bookings:          number;
  total_spend_sar:         number;
  activated_at:            string | null;
  // Phase 7 — billing
  vat_number:              string | null;
  vat_country:             'SA' | 'AE' | 'OTHER' | null;
  billing_address:         string | null;
  billing_contact_name:    string | null;
  billing_contact_email:   string | null;
}

export const getAccountSettings = () =>
  get<{ data: AccountSettings }>('/account');

export const updateAccountSettings = (data: {
  max_flight_class?:       FlightClass;
  max_hotel_stars?:        number;
  per_diem_sar?:           number;
  advance_booking_days?:   number;
  preferred_airlines?:     string[] | null;
  vat_number?:             string;
  vat_country?:            'SA' | 'AE' | 'OTHER';
  billing_address?:        string;
  billing_contact_name?:   string;
  billing_contact_email?:  string;
}) => patch<{ data: AccountSettings }>('/account', data);

// ── Invoices ──────────────────────────────────────────────────────────────────

export interface InvoiceMonth {
  month:         string;   // 'YYYY-MM'
  booking_count: number;
  subtotal_sar:  number;
}

export interface InvoiceLineItem {
  id:             string;
  employee_name:  string;
  employee_dept:  string | null;
  booking_type:   BookingType;
  description:    string;
  depart_date:    string;
  return_date:    string | null;
  po_reference:   string | null;
  cost_center:    string | null;
  booking_ref:    string | null;
  amount_sar:     number;
  policy_flags:   string[] | null;
}

export interface MonthlyInvoice {
  invoice_number: string;
  period:         string;
  year_month:     string;
  issue_date:     string;
  due_date:       string;
  account: {
    id:                    string;
    company_name:          string;
    vat_number:            string | null;
    vat_country:           'SA' | 'AE' | 'OTHER';
    billing_address:       string | null;
    billing_contact_name:  string | null;
    billing_contact_email: string | null;
    tier:                  string;
    discount_pct:          number;
  };
  line_items:     InvoiceLineItem[];
  item_count:     number;
  subtotal_sar:   number;
  vat_rate_pct:   number;
  vat_amount_sar: number;
  total_sar:      number;
}

export const getInvoiceMonths = () =>
  get<{ data: InvoiceMonth[] }>('/invoices');

export const getMonthlyInvoice = (yearMonth: string) =>
  get<{ data: MonthlyInvoice }>(`/invoices/${yearMonth}`);

// ── Password Management ───────────────────────────────────────────────────────

export const changePortalPassword = (data: { current_password: string; new_password: string }) =>
  post<{ ok: true }>('/account/password', data);
