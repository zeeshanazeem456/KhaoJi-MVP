import type { OrderStatus, PaymentMethod, PaymentStatus } from "./types";

export const pkr = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  placed: "Placed",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready for pickup",
  picked_up: "On the way",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment: "bg-chai-line text-chai",
  placed: "bg-haldi text-chai",
  accepted: "bg-neel-light text-neel",
  preparing: "bg-neel-light text-neel",
  ready: "bg-neel text-white",
  picked_up: "bg-chili-light text-chili-dark",
  delivered: "bg-patti-light text-patti",
  rejected: "bg-chili text-white",
  cancelled: "bg-chai-line text-chai-muted",
};

/** The happy path, in order — used for the tracking timeline. */
export const FLOW: OrderStatus[] = ["placed", "accepted", "preparing", "ready", "picked_up", "delivered"];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Unpaid",
  paid: "Paid",
  failed: "Failed",
  refund_pending: "Refund due",
  refunded: "Refunded",
};

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

/** Turns a Supabase/Postgres error into a short message for the user. */
export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Something went wrong";
}

/** Select string for orders with everything the screens show. */
export const ORDER_SELECT =
  "*, restaurant:restaurants(id,name,cuisine), drop_point:drop_points(id,name), order_items(*), customer:profiles!orders_customer_id_fkey(full_name,phone), rider:profiles!orders_rider_id_fkey(full_name,phone)";
