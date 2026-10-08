-- =====================================================================
-- KhaoJi MVP — database schema (Supabase / Postgres)
-- Run this whole file once in Supabase Dashboard → SQL Editor.
-- Then run seed.sql for demo data.
-- =====================================================================

-- ---------- Enums ----------------------------------------------------
create type user_role      as enum ('customer', 'restaurant', 'rider', 'admin');
create type account_status as enum ('pending', 'approved', 'blocked');
create type order_status   as enum (
  'pending_payment',  -- wallet order waiting for payment (hidden from restaurant)
  'placed', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered',
  'rejected', 'cancelled'
);
create type payment_method as enum ('cod', 'jazzcash', 'easypaisa');
create type payment_status as enum ('pending', 'paid', 'failed', 'refund_pending', 'refunded');

-- ---------- Tables ---------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text not null default '',
  role        user_role not null default 'customer',
  status      account_status not null default 'approved',
  hostel      text,                         -- customer's default drop area
  is_online   boolean not null default false, -- riders only
  created_at  timestamptz not null default now()
);

create table public.restaurants (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null unique references public.profiles(id) on delete cascade,
  name              text not null,
  description       text not null default '',
  cuisine           text not null default '',
  image_url         text,
  campus            text not null default 'FAST Islamabad',
  commission_rate   numeric(5,2) not null default 10.00 check (commission_rate between 0 and 100),
  is_active         boolean not null default false,  -- set true by admin approval
  is_open           boolean not null default false,  -- restaurant's own open/closed toggle
  est_delivery_mins int not null default 30,
  created_at        timestamptz not null default now()
);

create table public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  description   text not null default '',
  category      text not null default 'Main',
  price         int not null check (price >= 0),       -- PKR
  is_available  boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.drop_points (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  campus     text not null default 'FAST Islamabad',
  lat        double precision,
  lng        double precision,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- One-row settings table (fees, rider pay, bonus rules)
create table public.app_settings (
  id                 int primary key default 1 check (id = 1),
  delivery_fee       int not null default 60,
  rider_base_pay     int not null default 80,
  peak_bonus         int not null default 30,
  peak_start         time not null default '12:00',
  peak_end           time not null default '15:00',
  daily_target       int not null default 10,
  daily_target_bonus int not null default 300,
  payments_mode      text not null default 'sandbox' check (payments_mode in ('sandbox', 'live'))
);

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_no          bigint generated always as identity,
  customer_id       uuid not null references public.profiles(id),
  restaurant_id     uuid not null references public.restaurants(id),
  rider_id          uuid references public.profiles(id),
  drop_point_id     uuid not null references public.drop_points(id),
  status            order_status not null default 'placed',
  subtotal          int not null,
  delivery_fee      int not null,
  total             int not null,
  commission_rate   numeric(5,2) not null,
  commission_amount int not null,
  payment_method    payment_method not null default 'cod',
  payment_status    payment_status not null default 'pending',
  note              text not null default '',
  prep_mins         int,
  reject_reason     text,
  created_at        timestamptz not null default now(),
  accepted_at       timestamptz,
  ready_at          timestamptz,
  picked_up_at      timestamptz,
  delivered_at      timestamptz,
  updated_at        timestamptz not null default now()
);
create index on public.orders (customer_id);
create index on public.orders (restaurant_id);
create index on public.orders (rider_id);
create index on public.orders (status);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name         text not null,   -- snapshot at order time
  price        int not null,    -- snapshot at order time
  qty          int not null check (qty > 0)
);
create index on public.order_items (order_id);

create table public.rider_earnings (
  id             uuid primary key default gen_random_uuid(),
  rider_id       uuid not null references public.profiles(id),
  order_id       uuid not null unique references public.orders(id),
  base_pay       int not null,
  bonus          int not null default 0,
  bonus_reason   text,
  cash_collected int not null default 0,  -- COD cash rider holds for KhaoJi
  created_at     timestamptz not null default now()
);
create index on public.rider_earnings (rider_id);

-- ---------- Helper functions (security definer = bypass RLS safely) -----
create or replace function public.my_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved')
$$;

create or replace function public.is_approved_rider() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'rider' and status = 'approved')
$$;

create or replace function public.my_restaurant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from restaurants where owner_id = auth.uid()
$$;

-- ---------- New user → profile (+ restaurant) -------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
begin
  -- Only these roles can be chosen at signup. Admins are promoted manually.
  v_role := case coalesce(new.raw_user_meta_data->>'role', 'customer')
              when 'restaurant' then 'restaurant'::user_role
              when 'rider'      then 'rider'::user_role
              else 'customer'::user_role end;

  insert into profiles (id, full_name, phone, role, status, hostel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    v_role,
    case when v_role = 'customer' then 'approved'::account_status else 'pending'::account_status end,
    new.raw_user_meta_data->>'hostel'
  );

  if v_role = 'restaurant' then
    insert into restaurants (owner_id, name, cuisine)
    values (new.id,
            coalesce(nullif(new.raw_user_meta_data->>'restaurant_name', ''), 'My Restaurant'),
            coalesce(new.raw_user_meta_data->>'cuisine', ''));
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users can edit their own profile, but never their role or status.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null when run from the SQL editor / service role (trusted)
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role or new.status is distinct from old.status then
      raise exception 'Only admins can change role or status';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Restaurant owners can edit their restaurant, but not commission or approval.
create or replace function public.guard_restaurant_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null when run from the SQL editor / service role (trusted)
  if auth.uid() is not null and not public.is_admin() then
    if new.commission_rate is distinct from old.commission_rate
       or new.is_active is distinct from old.is_active
       or new.owner_id is distinct from old.owner_id then
      raise exception 'Only admins can change commission, approval or owner';
    end if;
  end if;
  return new;
end $$;
create trigger restaurants_guard before update on public.restaurants
  for each row execute function public.guard_restaurant_update();

-- ---------- Row Level Security ---------------------------------------
alter table public.profiles       enable row level security;
alter table public.restaurants    enable row level security;
alter table public.menu_items     enable row level security;
alter table public.drop_points    enable row level security;
alter table public.app_settings   enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.rider_earnings enable row level security;

-- profiles: yourself, admins, and people you share an order with
create policy "profiles: read own" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles: read order contacts" on public.profiles for select to authenticated
  using (exists (
    select 1 from public.orders o
    where (o.customer_id = profiles.id or o.rider_id = profiles.id)
      and (o.customer_id = auth.uid() or o.rider_id = auth.uid()
           or o.restaurant_id = public.my_restaurant_id())
  ));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- restaurants: everyone sees active ones; owner and admin see their own
create policy "restaurants: read" on public.restaurants for select to authenticated
  using (is_active or owner_id = auth.uid() or public.is_admin());
create policy "restaurants: owner/admin update" on public.restaurants for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- menu items: everyone reads; owner/admin write
create policy "menu: read" on public.menu_items for select to authenticated using (true);
create policy "menu: owner insert" on public.menu_items for insert to authenticated
  with check (restaurant_id = public.my_restaurant_id() or public.is_admin());
create policy "menu: owner update" on public.menu_items for update to authenticated
  using (restaurant_id = public.my_restaurant_id() or public.is_admin())
  with check (restaurant_id = public.my_restaurant_id() or public.is_admin());
create policy "menu: owner delete" on public.menu_items for delete to authenticated
  using (restaurant_id = public.my_restaurant_id() or public.is_admin());

-- drop points & settings: everyone reads; admin writes
create policy "drop points: read" on public.drop_points for select to authenticated using (true);
create policy "drop points: admin write" on public.drop_points for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "settings: read" on public.app_settings for select to authenticated using (true);
create policy "settings: admin update" on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- orders: read only. All changes go through the functions below.
create policy "orders: customer reads own" on public.orders for select to authenticated
  using (customer_id = auth.uid());
create policy "orders: restaurant reads own" on public.orders for select to authenticated
  using (restaurant_id = public.my_restaurant_id() and status <> 'pending_payment');
create policy "orders: rider reads assigned" on public.orders for select to authenticated
  using (rider_id = auth.uid());
create policy "orders: rider sees available" on public.orders for select to authenticated
  using (rider_id is null and status in ('preparing', 'ready') and public.is_approved_rider());
create policy "orders: admin reads all" on public.orders for select to authenticated
  using (public.is_admin());

create policy "order items: read with order" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id));

create policy "earnings: rider reads own" on public.rider_earnings for select to authenticated
  using (rider_id = auth.uid() or public.is_admin());

-- ---------- Order functions (the only way to create/change orders) ----

-- Customer places an order. Prices are read from the DB, never trusted from the client.
-- p_items: [{"menu_item_id": "...", "qty": 2}, ...]
create or replace function public.place_order(
  p_restaurant_id uuid, p_drop_point_id uuid, p_items jsonb,
  p_payment_method payment_method default 'cod', p_note text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_rest restaurants%rowtype;
  v_fee int;
  v_subtotal int := 0;
  v_order_id uuid;
  v_item jsonb;
  v_menu menu_items%rowtype;
  v_qty int;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  if public.my_role() is distinct from 'customer' then raise exception 'Only customers can place orders'; end if;

  select * into v_rest from restaurants where id = p_restaurant_id;
  if not found or not v_rest.is_active then raise exception 'Restaurant not found'; end if;
  if not v_rest.is_open then raise exception 'Restaurant is closed right now'; end if;

  if not exists (select 1 from drop_points where id = p_drop_point_id and is_active) then
    raise exception 'Invalid drop point';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;

  select delivery_fee into v_fee from app_settings where id = 1;

  insert into orders (customer_id, restaurant_id, drop_point_id, status, subtotal, delivery_fee,
                      total, commission_rate, commission_amount, payment_method, payment_status, note)
  values (auth.uid(), p_restaurant_id, p_drop_point_id,
          case when p_payment_method = 'cod' then 'placed'::order_status else 'pending_payment'::order_status end,
          0, v_fee, 0, v_rest.commission_rate, 0, p_payment_method, 'pending', coalesce(p_note, ''))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then raise exception 'Invalid quantity'; end if;
    select * into v_menu from menu_items
      where id = (v_item->>'menu_item_id')::uuid and restaurant_id = p_restaurant_id;
    if not found then raise exception 'Item not found in this restaurant'; end if;
    if not v_menu.is_available then raise exception '% is sold out', v_menu.name; end if;
    insert into order_items (order_id, menu_item_id, name, price, qty)
      values (v_order_id, v_menu.id, v_menu.name, v_menu.price, v_qty);
    v_subtotal := v_subtotal + v_menu.price * v_qty;
  end loop;

  update orders set
    subtotal = v_subtotal,
    total = v_subtotal + v_fee,
    commission_amount = round(v_subtotal * v_rest.commission_rate / 100.0)
  where id = v_order_id;

  return v_order_id;
end $$;

-- SANDBOX ONLY: simulates the JazzCash/Easypaisa result.
-- In production this is replaced by a server-side callback (Edge Function)
-- that verifies the gateway's signed response. It refuses to run in 'live' mode.
create or replace function public.sandbox_confirm_payment(p_order_id uuid, p_success boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if (select payments_mode from app_settings where id = 1) <> 'sandbox' then
    raise exception 'Sandbox payments are disabled';
  end if;
  select * into v_order from orders where id = p_order_id for update;
  if not found or v_order.customer_id is distinct from auth.uid() then raise exception 'Order not found'; end if;
  if v_order.status <> 'pending_payment' then raise exception 'Order is not waiting for payment'; end if;

  if p_success then
    update orders set status = 'placed', payment_status = 'paid', updated_at = now() where id = p_order_id;
  else
    update orders set status = 'cancelled', payment_status = 'failed', updated_at = now() where id = p_order_id;
  end if;
end $$;

-- All status changes after an order is placed.
-- Actions:
--   customer:   cancel
--   restaurant: accept {prep_mins}, reject {reason}, preparing, ready
--   rider:      claim, picked_up, delivered
--   admin:      any of the above, plus assign_rider {rider_id}, cancel at any time, refund
create or replace function public.order_action(p_order_id uuid, p_action text, p_payload jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  o orders%rowtype;
  v_admin boolean := public.is_admin();
  v_is_customer boolean;
  v_is_restaurant boolean;
  v_is_rider boolean;
  s app_settings%rowtype;
  v_bonus int := 0;
  v_reasons text[] := '{}';
  v_today_count int;
  v_local_time time;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  -- coalesce: a NULL comparison must count as "no", never slip through a check
  v_is_customer   := coalesce(o.customer_id = auth.uid(), false);
  v_is_restaurant := coalesce(o.restaurant_id = public.my_restaurant_id(), false);
  v_is_rider      := coalesce(o.rider_id = auth.uid(), false);

  case p_action
  -- ----- customer -----
  when 'cancel' then
    if not (v_admin or (v_is_customer and o.status = 'placed')) then
      raise exception 'Order can only be cancelled before the restaurant accepts it';
    end if;
    if o.status in ('delivered', 'cancelled', 'rejected') then raise exception 'Order already closed'; end if;
    update orders set status = 'cancelled',
      payment_status = case when payment_status = 'paid' then 'refund_pending'::payment_status else payment_status end,
      updated_at = now()
    where id = o.id;

  -- ----- restaurant -----
  when 'accept' then
    if not (v_is_restaurant or v_admin) then raise exception 'Not allowed'; end if;
    if o.status <> 'placed' then raise exception 'Order is not new'; end if;
    update orders set status = 'accepted', accepted_at = now(),
      prep_mins = coalesce((p_payload->>'prep_mins')::int, 15), updated_at = now()
    where id = o.id;

  when 'reject' then
    if not (v_is_restaurant or v_admin) then raise exception 'Not allowed'; end if;
    if o.status <> 'placed' then raise exception 'Only new orders can be rejected'; end if;
    update orders set status = 'rejected', reject_reason = coalesce(p_payload->>'reason', 'Not available'),
      payment_status = case when payment_status = 'paid' then 'refund_pending'::payment_status else payment_status end,
      updated_at = now()
    where id = o.id;

  when 'preparing' then
    if not (v_is_restaurant or v_admin) then raise exception 'Not allowed'; end if;
    if o.status <> 'accepted' then raise exception 'Accept the order first'; end if;
    update orders set status = 'preparing', updated_at = now() where id = o.id;

  when 'ready' then
    if not (v_is_restaurant or v_admin) then raise exception 'Not allowed'; end if;
    if o.status not in ('accepted', 'preparing') then raise exception 'Order is not being prepared'; end if;
    update orders set status = 'ready', ready_at = now(), updated_at = now() where id = o.id;

  -- ----- rider -----
  when 'claim' then
    if not public.is_approved_rider() then raise exception 'Only approved riders can take orders'; end if;
    if not exists (select 1 from profiles where id = auth.uid() and is_online) then
      raise exception 'Go online first';
    end if;
    if o.rider_id is not null then raise exception 'Another rider already took this order'; end if;
    if o.status not in ('preparing', 'ready') then raise exception 'Order is not ready for riders yet'; end if;
    update orders set rider_id = auth.uid(), updated_at = now() where id = o.id;

  when 'assign_rider' then
    if not v_admin then raise exception 'Admins only'; end if;
    if not exists (select 1 from profiles where id = (p_payload->>'rider_id')::uuid
                   and role = 'rider' and status = 'approved') then
      raise exception 'Invalid rider';
    end if;
    update orders set rider_id = (p_payload->>'rider_id')::uuid, updated_at = now() where id = o.id;

  when 'picked_up' then
    if not (v_is_rider or v_admin) then raise exception 'Not your delivery'; end if;
    if o.status <> 'ready' then raise exception 'Wait until the restaurant marks it ready'; end if;
    update orders set status = 'picked_up', picked_up_at = now(), updated_at = now() where id = o.id;

  when 'delivered' then
    if not (v_is_rider or v_admin) then raise exception 'Not your delivery'; end if;
    if o.status <> 'picked_up' then raise exception 'Pick up the order first'; end if;
    if o.rider_id is null then raise exception 'No rider assigned'; end if;

    update orders set status = 'delivered', delivered_at = now(),
      payment_status = case when payment_method = 'cod' then 'paid'::payment_status else payment_status end,
      updated_at = now()
    where id = o.id;

    -- Rider pay + Yango-style bonuses
    select * into s from app_settings where id = 1;
    v_local_time := (now() at time zone 'Asia/Karachi')::time;
    if v_local_time between s.peak_start and s.peak_end then
      v_bonus := v_bonus + s.peak_bonus;
      v_reasons := array_append(v_reasons, 'Peak hours');
    end if;
    select count(*) + 1 into v_today_count from rider_earnings
      where rider_id = o.rider_id
        and (created_at at time zone 'Asia/Karachi')::date = (now() at time zone 'Asia/Karachi')::date;
    if v_today_count = s.daily_target then
      v_bonus := v_bonus + s.daily_target_bonus;
      v_reasons := array_append(v_reasons, s.daily_target || ' deliveries today');
    end if;

    insert into rider_earnings (rider_id, order_id, base_pay, bonus, bonus_reason, cash_collected)
    values (o.rider_id, o.id, s.rider_base_pay, v_bonus,
            nullif(array_to_string(v_reasons, ' + '), ''),
            case when o.payment_method = 'cod' then o.total else 0 end);

  -- ----- admin -----
  when 'refund' then
    if not v_admin then raise exception 'Admins only'; end if;
    if o.payment_status <> 'refund_pending' then raise exception 'Nothing to refund'; end if;
    update orders set payment_status = 'refunded', updated_at = now() where id = o.id;

  else
    raise exception 'Unknown action %', p_action;
  end case;
end $$;

-- Admin: approve / block a restaurant or rider
create or replace function public.admin_set_status(p_user_id uuid, p_status account_status)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update profiles set status = p_status where id = p_user_id;
  update restaurants set is_active = (p_status = 'approved') where owner_id = p_user_id;
  if p_status <> 'approved' then
    update profiles set is_online = false where id = p_user_id;
  end if;
end $$;

-- Only logged-in users can call these
revoke execute on function public.place_order(uuid, uuid, jsonb, payment_method, text) from public, anon;
revoke execute on function public.sandbox_confirm_payment(uuid, boolean) from public, anon;
revoke execute on function public.order_action(uuid, text, jsonb) from public, anon;
revoke execute on function public.admin_set_status(uuid, account_status) from public, anon;
grant execute on function public.place_order(uuid, uuid, jsonb, payment_method, text) to authenticated;
grant execute on function public.sandbox_confirm_payment(uuid, boolean) to authenticated;
grant execute on function public.order_action(uuid, text, jsonb) to authenticated;
grant execute on function public.admin_set_status(uuid, account_status) to authenticated;

-- ---------- Realtime (live order updates) -----------------------------
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.profiles;

-- Default settings row
insert into public.app_settings (id) values (1) on conflict do nothing;
