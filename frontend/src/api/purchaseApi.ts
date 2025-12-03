import { apiRequest } from "@/lib/queryClient";

export type PaymentMethod = "phone_transfer" | "invoice";
export type PurchaseStatus = "pending" | "approved" | "rejected";

export interface Purchase {
  id: number;
  user_id: number;
  user_name?: string | null;
  user_email?: string | null;
  movie_id: number;
  movie_title?: string | null;
  amount: string;
  currency: string;
  discount_percent?: string | null;
  payment_method: PaymentMethod;
  status: PurchaseStatus;
  customer_comment?: string | null;
  admin_comment?: string | null;
  delivery_url?: string | null;
  delivery_token?: string | null;
  processed_by?: number | null;
  processed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface PurchaseListResponse {
  items: Purchase[];
  total: number;
}

export interface PurchaseCreatePayload {
  movie_id: number;
  movie_title?: string | null;
  amount: number;
  currency?: string;
  payment_method: PaymentMethod;
  discount_percent?: number | null;
  customer_comment?: string | null;
}

export interface PurchaseAdminDecision {
  status: Exclude<PurchaseStatus, "pending">;
  admin_comment?: string | null;
  delivery_url?: string | null;
  delivery_token?: string | null;
}

function ensureOk(res: Response) {
  if (!res.ok) {
    throw new Error(`${res.status}`);
  }
  return res;
}

export async function createPurchase(payload: PurchaseCreatePayload): Promise<Purchase> {
  const res = await apiRequest("POST", "/api/purchases", payload);
  return ensureOk(res).json();
}

export async function listMyPurchases(status?: PurchaseStatus): Promise<Purchase[]> {
  const params = new URLSearchParams();
  if (status) params.set("status_filter", status);
  const url = params.toString() ? `/api/purchases/my?${params}` : "/api/purchases/my";
  const res = await apiRequest("GET", url);
  return ensureOk(res).json();
}

export interface AdminPurchaseQuery {
  status_filter?: PurchaseStatus;
  user_id_filter?: number;
  movie_id_filter?: number;
  limit?: number;
  offset?: number;
}

export async function listAdminPurchases(query: AdminPurchaseQuery = {}): Promise<PurchaseListResponse> {
  const params = new URLSearchParams();
  if (query.status_filter) params.set("status_filter", query.status_filter);
  if (typeof query.user_id_filter === "number") params.set("user_id_filter", String(query.user_id_filter));
  if (typeof query.movie_id_filter === "number") params.set("movie_id_filter", String(query.movie_id_filter));
  if (typeof query.limit === "number") params.set("limit", String(query.limit));
  if (typeof query.offset === "number") params.set("offset", String(query.offset));
  const url = params.toString() ? `/api/payment/admin/purchases?${params}` : "/api/payment/admin/purchases";
  const res = await apiRequest("GET", url);
  return ensureOk(res).json();
}

export async function updateAdminPurchase(
  purchaseId: number,
  payload: PurchaseAdminDecision,
): Promise<Purchase> {
  const res = await apiRequest("PATCH", `/api/payment/admin/purchases/${purchaseId}`, payload);
  return ensureOk(res).json();
}

export interface PaymentSettings {
  phone_payment_number: string;
  invoice_details: string;
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const res = await apiRequest("GET", "/api/payment/settings");
  return ensureOk(res).json();
}

