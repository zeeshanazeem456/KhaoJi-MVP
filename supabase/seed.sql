-- =====================================================================
-- KhaoJi MVP — demo data for FAST Islamabad
-- Run AFTER schema.sql, in Supabase Dashboard → SQL Editor.
--
-- Creates demo accounts (all with password: khaoji123)
--   admin@khaoji.test             admin
--   customer@khaoji.test          customer
--   rider1@khaoji.test, rider2@   riders (approved)
--   dhaba@, chai@, biryani@, burger@, ammi@khaoji.test   restaurants
-- =====================================================================

-- Drop points around FAST-NUCES Islamabad (H-11/4). Adjust after walking the campus.
insert into public.drop_points (name, lat, lng) values
  ('Main Gate',              33.6561, 73.0155),
  ('Boys Hostel Gate',       33.6548, 73.0141),
  ('Girls Hostel Gate',      33.6553, 73.0170),
  ('Library',                33.6567, 73.0160),
  ('Block C (CS Building)',  33.6570, 73.0150),
  ('Cafeteria',              33.6564, 73.0146);

-- Helper to create a confirmed email/password user (Supabase auth tables)
create or replace function pg_temp.make_user(p_email text, p_meta jsonb) returns uuid
language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
          extensions.crypt('khaoji123', extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', p_meta, now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
  return v_id;
end $$;

do $$
declare
  v_admin uuid; v_r1 uuid; v_r2 uuid;
  v_dhaba uuid; v_chai uuid; v_biryani uuid; v_burger uuid; v_ammi uuid;
  rid uuid;
begin
  v_admin := pg_temp.make_user('admin@khaoji.test', '{"full_name":"KhaoJi Admin","phone":"03000000000"}');
  perform pg_temp.make_user('customer@khaoji.test', '{"full_name":"Ali Student","phone":"03001111111","role":"customer","hostel":"Boys Hostel"}');
  v_r1 := pg_temp.make_user('rider1@khaoji.test', '{"full_name":"Usman Rider","phone":"03002222222","role":"rider"}');
  v_r2 := pg_temp.make_user('rider2@khaoji.test', '{"full_name":"Bilal Rider","phone":"03003333333","role":"rider"}');
  v_dhaba   := pg_temp.make_user('dhaba@khaoji.test',   '{"full_name":"Rashid Khan","phone":"03004444444","role":"restaurant","restaurant_name":"Pindi Dhaba","cuisine":"Desi"}');
  v_chai    := pg_temp.make_user('chai@khaoji.test',    '{"full_name":"Imran Ali","phone":"03005555555","role":"restaurant","restaurant_name":"Chai Adda","cuisine":"Chai & Snacks"}');
  v_biryani := pg_temp.make_user('biryani@khaoji.test', '{"full_name":"Saleem Ahmed","phone":"03006666666","role":"restaurant","restaurant_name":"Biryani Wala","cuisine":"Biryani & Rice"}');
  v_burger  := pg_temp.make_user('burger@khaoji.test',  '{"full_name":"Hamza Tariq","phone":"03007777777","role":"restaurant","restaurant_name":"Crunch Burgers","cuisine":"Fast Food"}');
  v_ammi    := pg_temp.make_user('ammi@khaoji.test',    '{"full_name":"Nasreen Bibi","phone":"03008888888","role":"restaurant","restaurant_name":"Ammi''s Kitchen","cuisine":"Home Food"}');

  -- Promote admin and approve partners
  update public.profiles set role = 'admin', status = 'approved' where id = v_admin;
  update public.profiles set status = 'approved'
    where id in (v_r1, v_r2, v_dhaba, v_chai, v_biryani, v_burger, v_ammi);

  -- Restaurant details
  update public.restaurants set is_active = true, is_open = true, commission_rate = 8,
    description = 'Karahi, daal and roti — the hostel night favourite', est_delivery_mins = 30
    where owner_id = v_dhaba;
  update public.restaurants set is_active = true, is_open = true, commission_rate = 5,
    description = 'Doodh patti, paratha rolls and samosas', est_delivery_mins = 15
    where owner_id = v_chai;
  update public.restaurants set is_active = true, is_open = true, commission_rate = 8,
    description = 'Sindhi and chicken biryani, made fresh daily', est_delivery_mins = 25
    where owner_id = v_biryani;
  update public.restaurants set is_active = true, is_open = true, commission_rate = 10,
    description = 'Zinger, smash burgers and loaded fries', est_delivery_mins = 25
    where owner_id = v_burger;
  update public.restaurants set is_active = true, is_open = true, commission_rate = 5,
    description = 'Home-cooked daily menu from a local home chef', est_delivery_mins = 35
    where owner_id = v_ammi;

  -- Menus (prices in PKR)
  select id into rid from public.restaurants where owner_id = v_dhaba;
  insert into public.menu_items (restaurant_id, category, name, description, price) values
    (rid, 'Karahi', 'Chicken Karahi (Half)', 'Serves 1-2', 950),
    (rid, 'Karahi', 'Chicken Karahi (Full)', 'Serves 3-4', 1800),
    (rid, 'Daal & Sabzi', 'Daal Mash', 'Butter tarka', 320),
    (rid, 'Daal & Sabzi', 'Mix Sabzi', '', 280),
    (rid, 'Bread', 'Tandoori Roti', '', 30),
    (rid, 'Bread', 'Roghni Naan', '', 60),
    (rid, 'Drinks', 'Raita', '', 80);

  select id into rid from public.restaurants where owner_id = v_chai;
  insert into public.menu_items (restaurant_id, category, name, description, price) values
    (rid, 'Chai', 'Doodh Patti', 'Kadak', 80),
    (rid, 'Chai', 'Kashmiri Chai', '', 150),
    (rid, 'Snacks', 'Aloo Samosa (2 pcs)', '', 100),
    (rid, 'Snacks', 'Chicken Paratha Roll', '', 280),
    (rid, 'Snacks', 'Anda Paratha', '', 180),
    (rid, 'Snacks', 'Bun Kabab', '', 150);

  select id into rid from public.restaurants where owner_id = v_biryani;
  insert into public.menu_items (restaurant_id, category, name, description, price) values
    (rid, 'Biryani', 'Chicken Biryani (Single)', 'With raita and salad', 380),
    (rid, 'Biryani', 'Chicken Biryani (Double)', 'With raita and salad', 650),
    (rid, 'Biryani', 'Sindhi Biryani', 'Spicy', 450),
    (rid, 'Rice', 'Chicken Pulao', '', 350),
    (rid, 'Extras', 'Shami Kabab', '', 90),
    (rid, 'Extras', 'Cold Drink 345ml', '', 100);

  select id into rid from public.restaurants where owner_id = v_burger;
  insert into public.menu_items (restaurant_id, category, name, description, price) values
    (rid, 'Burgers', 'Zinger Burger', 'Crispy chicken, mayo, lettuce', 550),
    (rid, 'Burgers', 'Smash Beef Burger', 'Double patty, cheese', 750),
    (rid, 'Burgers', 'Student Deal', 'Zinger + fries + drink', 799),
    (rid, 'Sides', 'Fries (Regular)', '', 220),
    (rid, 'Sides', 'Loaded Fries', 'Cheese sauce, jalapeno', 450),
    (rid, 'Drinks', 'Cold Drink 345ml', '', 100);

  select id into rid from public.restaurants where owner_id = v_ammi;
  insert into public.menu_items (restaurant_id, category, name, description, price) values
    (rid, 'Today''s Menu', 'Aloo Gosht + 2 Roti', 'Home style', 450),
    (rid, 'Today''s Menu', 'Chicken Qorma + Rice', '', 480),
    (rid, 'Today''s Menu', 'Daal Chawal', 'With achaar', 300),
    (rid, 'Sweet', 'Kheer', '', 150);
end $$;
