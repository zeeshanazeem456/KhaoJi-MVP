# KhaoJi — MVP

Campus food delivery for FAST Islamabad. One web app (PWA), four roles: **Customer, Restaurant, Rider, Admin**.

**Stack:** Next.js 15 (React + TypeScript) · Tailwind CSS · Supabase (Postgres, Auth, Realtime) · deploys to Vercel.

---

## 1. One-time setup (about 15 minutes)

### a) Install tools on your PC
- **Node.js 20 or newer** (LTS): https://nodejs.org
- **Git**: https://git-scm.com
- **VS Code** is recommended.

### b) Create the Supabase project
1. Go to https://supabase.com, sign in and click **New project**. Pick the region closest to Pakistan (e.g. Mumbai or Singapore).
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql` and click **Run**.
3. Open a new query, paste all of `supabase/seed.sql` and click **Run**. This adds drop points, 5 demo restaurants with menus, and demo accounts.
4. Go to **Authentication → Sign In / Providers → Email** and turn **off** "Confirm email" for the MVP. That way new signups can log in right away.

### c) Connect the app
1. In Supabase, go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.
2. In this folder, copy `.env.example` to a new file called `.env.local` and paste the two values in.

### d) Run it
Open a terminal in this folder:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

---

## 2. Demo accounts (password for all: `khaoji123`)

| Role | Email |
|---|---|
| Customer | customer@khaoji.test |
| Restaurant | dhaba@ · chai@ · biryani@ · burger@ · ammi@ khaoji.test |
| Rider | rider1@khaoji.test, rider2@khaoji.test |
| Admin | admin@khaoji.test |

The login page has one-tap buttons that fill these in.

## 3. Demo script for the team

Open 4 browser windows (use incognito or different browsers so the logins don't clash):

1. **Rider** (`rider1`): tap **Go online**.
2. **Customer**: pick *Chai Adda*, add items, choose a drop point, pay with **Cash on Delivery** and place the order.
3. **Restaurant** (`chai`): the order pops up with a beep. Tap **Accept · 10m**, then **Start preparing**.
4. **Rider**: the delivery appears. Tap **Accept delivery**.
5. **Restaurant**: tap **Mark ready for pickup**.
6. **Rider**: tap **I've picked it up**, then **Delivered**.
7. **Customer**: the tracking screen updates live at every step.
8. **Rider → Earnings** shows base pay plus bonuses. **Restaurant → Earnings** shows the low commission. **Admin → Dashboard** shows the totals.

Also try paying with **JazzCash** or **Easypaisa**. You'll get a simulated wallet screen (test mode).

To test on a phone on the same Wi-Fi, run `npm run dev -- -H 0.0.0.0` and open `http://<your-PC-IP>:3000`. Installing to the home screen needs HTTPS, so use the Vercel deploy for that.

---

## 4. How it works

### Roles and accounts
- Signup asks what you want to do: order food, sell food, or deliver.
- Customers are approved right away. Restaurants and riders wait on the **Pending** screen until an admin approves them in **Admin → Partners**.
- To make someone an admin, run this in the Supabase SQL Editor:
  ```sql
  update profiles set role = 'admin', status = 'approved'
  where id = (select id from auth.users where email = 'someone@example.com');
  ```

### Order flow
`placed → accepted → preparing → ready → picked_up → delivered` (or `rejected` / `cancelled`)

- Riders can grab an order once it's **preparing** or **ready**, and the first rider to accept gets it.
- Wallet orders start as `pending_payment` and only reach the restaurant after payment succeeds.
- Orders can only be changed through the database functions `place_order` and `order_action`. Those functions check who you are and whether the step is allowed, and they read prices from the database, so a user can't edit prices or skip steps from the browser.

### Security (Row Level Security)
Every table has RLS. Customers see only their own orders, restaurants see only theirs, and riders see their own deliveries plus open ones. Users can't change their own role or approval status, and restaurants can't change their own commission.

### Rider pay and bonuses
Set in **Admin → Settings**: base pay per delivery, a peak-hour bonus, and a daily-target bonus. These are calculated automatically when a delivery is marked as delivered.

### Project structure
```
supabase/schema.sql      tables, RLS, order functions, realtime
supabase/seed.sql        demo data
src/app/customer/        restaurants, menu, checkout, pay, orders, tracking
src/app/restaurant/      live orders board, menu, earnings
src/app/rider/           online toggle, deliveries, earnings
src/app/admin/           orders, partners, settings, dashboard
src/hooks/               live orders (realtime), order actions
src/lib/                 Supabase clients, types, formatting
src/middleware.ts        login protection
```

---

## 5. Deploy (free) to get a shareable link
1. Push this folder to a GitHub repo. `.env.local` is git-ignored, so keys stay private.
2. On https://vercel.com, click **Import project** and choose the repo.
3. Add the two `NEXT_PUBLIC_SUPABASE_...` variables in the Vercel settings and deploy.
4. In Supabase, go to **Authentication → URL Configuration** and set the Site URL to your Vercel URL.

---

## 6. Going live with payments (not done yet)
Wallet payments are **simulated** right now (`app_settings.payments_mode = 'sandbox'`). To make them real:
1. Get merchant accounts from JazzCash and Easypaisa, or use a gateway that supports both.
2. Write a server-side endpoint (a Supabase Edge Function or a Next.js route handler) that creates the payment, redirects to the wallet, and **verifies the signed callback**. Secret keys go only there, never in the browser.
3. In that callback, set the order to `status = 'placed', payment_status = 'paid'` using the service role.
4. Set `payments_mode = 'live'`, which turns off the sandbox function.

## 7. Known MVP limits
- If `seed.sql` fails on the demo accounts (Supabase can change its auth tables), sign up the accounts through the app instead, then approve them in Admin.
- No push notifications. Alerts are in-app with a beep while the page is open.
- No live rider GPS. Fixed drop points cover a single campus.
- Refunds are marked by an admin; the actual money is returned by hand.
- The "vs a 25% app" figure on the restaurant earnings page is a placeholder rate (`MARKET_RATE` in `src/app/restaurant/earnings/page.tsx`). Update it with real numbers before showing it to restaurants.
