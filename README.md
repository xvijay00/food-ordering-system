This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
You are helping me build a restaurant ordering PWA. Remember this context for the whole project.

STACK
- Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, Realtime, Storage)
- Zustand for cart (persisted in localStorage)
- Zod + React Hook Form for validation
- Serwist (@serwist/next) for PWA, web-push for push notifications
- Deploy on Vercel

PRODUCT
- Customers: NO login. Open site -> choose "Dine-in" or "Delivery" -> see full menu -> cart -> checkout -> live order tracking.
- Owner/staff: login with email+password (Supabase Auth, public signup disabled) -> /admin dashboard.
- Roles in staff_profiles: admin, kitchen, delivery.

RULES
- Mobile-first, modern, clean UI. Support dark and light mode.
- Never trust prices from the client. Orders are created ONLY through a Next.js API route using the service role key. Price is always recalculated from the database.
- SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser or prefixed with NEXT_PUBLIC_.
- Use server components for data fetching where possible. Add loading.tsx skeletons.
- Keep code modular: /components, /lib, /store, /types.
- After each task, tell me exactly which files you created or changed and what I must do manually (env vars, SQL to run, etc).
- Do not build features I did not ask for in the current prompt.

Reply only with "Understood" and a 5-line summary of the project.
Understood
I'm ready. I will follow all the rules you defined for this restaurant ordering PWA project:

- Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Supabase for backend
- Zustand cart with localStorage persistence
- Zod + React Hook Form for validation
- Serwist for PWA
- Mobile-first design with dark/light mode
- Backend-only order creation using Supabase service role
- Modular file structure
- No feature creep
- Clear communication about manual steps

## Creating the First Admin User

Public staff signup is intentionally disabled. To create your first admin user manually:

1. **Disable public signups (recommended)**: In **Supabase Dashboard -> Authentication -> Providers -> Email**, verify email confirmations/signups match your policy (staff accounts are invited/created manually by the owner).
2. **Create the Auth user**:
   - Open **Supabase Dashboard -> Authentication -> Users -> Add user -> Create new user**.
   - Enter the admin email and password, keep **Auto Confirm User** enabled, and click **Create user**.
   - Copy the newly created user's **User UID** (UUID).
3. **Grant the admin staff role**:
   - Open **Supabase Dashboard -> SQL Editor** and run:

   ```sql
   insert into public.staff_profiles (id, name, role)
   values ('<PASTE_USER_UID_HERE>', 'Admin Name', 'admin');
   ```

4. **Sign in**: Navigate to `/admin/login` (or click **Staff login** in the customer footer) and sign in with that email and password. Additional `kitchen` or `delivery` staff accounts can be created using the same two steps with `'kitchen'` or `'delivery'` as the `role`.

## Kitchen Order Alert Sound (`/public/bell.mp3`)

- The live orders screen (`/admin/orders`) plays `/bell.mp3` whenever a new order arrives via Supabase Realtime (once **Start shift** has been clicked to unlock browser audio).
- **Placeholder note**: `public/bell.mp3` is not bundled in the repository—add your own short chime or bell audio file at `public/bell.mp3` before going live.

## Reports & Analytics Database RPC Setup

If your Supabase project already ran an earlier version of `supabase/schema.sql`, run `supabase/reports_rpc.sql` in **Supabase Dashboard -> SQL Editor** to install the SQL aggregation functions used by `/admin/reports` (`get_sales_summary`, `get_daily_sales`, `get_top_selling_items`). New setups executing the full `supabase/schema.sql` include these functions automatically.

## Testing the PWA & Lighthouse Audit

Because `@serwist/next` compiles the service worker (`public/sw.js`) only for production builds (`disable: process.env.NODE_ENV !== "production"` in `next.config.mjs`), test installability and offline support using a production build:

```bash
npm run build
npm start
```

Then verify in Chrome / Chromium:

1. Open `http://localhost:3000` (localhost is treated as a secure context for Service Workers).
2. Open **Chrome DevTools -> Application -> Manifest** and verify the name, icons (`192x192`, `512x512`, and `maskable`), and `start_url`.
3. Open **Application -> Service Workers** and check that `/sw.js` is activated and running.
4. Check the **Offline** toggle in DevTools and navigate to an uncached page (e.g. `/menu` if not visited) to confirm the `/offline` fallback renders cleanly, while `/api/*`, `/admin/*`, and Supabase calls stay `NetworkOnly`.
5. Run **Chrome DevTools -> Lighthouse -> Progressive Web App / Best Practices** on `http://localhost:3000` (production mode via `npm start`).
6. Placeholder icons live in `/public/icons/*` (generated via `node scripts/generate-pwa-icons.mjs`); replace `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and `apple-touch-icon.png` with custom artwork before launch if desired.

