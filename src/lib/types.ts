export type Role = "customer" | "restaurant" | "rider" | "admin";
export type AccountStatus = "pending" | "approved" | "blocked";
export type OrderStatus =
  | "pending_payment"
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "picked_up"
  | "delivered"
  | "rejected"
  | "cancelled";
export type PaymentMethod = "cod" | "jazzcash" | "easypaisa";
export type PaymentStatus = "pending" | "paid" | "failed" | "refund_pending" | "refunded";

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
  status: AccountStatus;
  hostel: string | null;
  is_online: boolean;
  created_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  cuisine: string;
  image_url: string | null;
  campus: string;
  commission_rate: number;
  is_active: boolean;
  is_open: boolean;
  est_delivery_mins: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  is_available: boolean;
}

export interface DropPoint {
  id: string;
  name: string;
  campus: string;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  order_no: number;
  customer_id: string;
  restaurant_id: string;
  rider_id: string | null;
  drop_point_id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  commission_rate: number;
  commission_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  note: string;
  prep_mins: number | null;
  reject_reason: string | null;
  created_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
}

/** Order with the joined data most screens need. */
export interface OrderFull extends Order {
  restaurant?: Pick<Restaurant, "id" | "name" | "cuisine"> | null;
  drop_point?: Pick<DropPoint, "id" | "name"> | null;
  order_items?: OrderItem[];
  customer?: Pick<Profile, "full_name" | "phone"> | null;
  rider?: Pick<Profile, "full_name" | "phone"> | null;
}

export interface AppSettings {
  id: number;
  delivery_fee: number;
  rider_base_pay: number;
  peak_bonus: number;
  peak_start: string;
  peak_end: string;
  daily_target: number;
  daily_target_bonus: number;
  payments_mode: "sandbox" | "live";
}

export interface RiderEarning {
  id: string;
  rider_id: string;
  order_id: string;
  base_pay: number;
  bonus: number;
  bonus_reason: string | null;
  cash_collected: number;
  created_at: string;
}
