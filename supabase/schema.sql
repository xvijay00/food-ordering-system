-- ============================================================================
-- Food Ordering System — Supabase Database Schema, RLS, Realtime, Storage & Seed
-- Run this entire script in the Supabase SQL Editor on a fresh project.
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- Menu categories (e.g., Starters, Main Course, Breads, Drinks)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- Individual dishes / beverages belonging to a category
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  is_veg boolean not null default true,
  is_available boolean not null default true,
  is_bestseller boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Portion / size variants for a menu item (e.g., Half / Full)
create table if not exists public.item_variants (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items(id) on delete cascade,
  label text not null,
  price numeric(10, 2) not null check (price >= 0)
);

-- Optional paid/free add-ons for a menu item (e.g., Extra Cheese)
create table if not exists public.item_addons (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null default 0 check (price >= 0),
  is_active boolean not null default true
);

-- Dine-in restaurant tables (used for QR table ordering)
create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  table_number integer not null unique check (table_number > 0),
  is_active boolean not null default true
);

-- Staff accounts linked 1:1 with Supabase Auth users
create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'kitchen', 'delivery'))
);

-- Customer orders (dine-in or delivery). Public access is blocked; API routes
-- use the service role and return/track orders via order_token.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_token uuid not null unique default gen_random_uuid(),
  order_no bigint generated always as identity unique,
  order_type text not null check (order_type in ('dine_in', 'delivery')),
  table_id uuid references public.restaurant_tables(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  delivery_address text,
  status text not null default 'placed',
  payment_method text not null default 'cod',
  payment_status text not null default 'pending',
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(10, 2) not null check (total >= 0),
  notes text,
  cancel_reason text,
  created_at timestamptz not null default now()
);

-- Snapshot line items captured at order placement time
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  variant_label text,
  addons jsonb not null default '[]'::jsonb,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10, 2) not null check (line_total >= 0)
);

-- Audit trail of order status transitions
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

-- Web Push notification subscriptions for staff devices
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- Key-value store for global shop settings (delivery_fee, min_order, shop_open)
create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);


-- ============================================================================
-- 2. INDEXES
-- ============================================================================

create index if not exists idx_menu_items_category_id on public.menu_items(category_id);
create index if not exists idx_item_variants_item_id on public.item_variants(item_id);
create index if not exists idx_item_addons_item_id on public.item_addons(item_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_table_id on public.orders(table_id);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_status_history_order_id on public.order_status_history(order_id);
create index if not exists idx_push_subscriptions_staff_id on public.push_subscriptions(staff_id);


-- ============================================================================
-- 3. HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================================

-- Returns true if the current authenticated user has a row in staff_profiles.
-- SECURITY DEFINER bypasses RLS on staff_profiles to avoid policy recursion.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_profiles
    where id = auth.uid()
  );
$$;

-- Returns the role ('admin', 'kitchen', or 'delivery') for the current user, or NULL.
create or replace function public.staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.staff_profiles
  where id = auth.uid();
$$;

grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.staff_role() to anon, authenticated;


-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & POLICIES
-- ============================================================================

alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.item_variants enable row level security;
alter table public.item_addons enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.settings enable row level security;

-- ---- categories: public SELECT, admin write ----
drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can insert categories" on public.categories;
create policy "Admin can insert categories"
  on public.categories for insert
  to authenticated
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can update categories" on public.categories;
create policy "Admin can update categories"
  on public.categories for update
  to authenticated
  using (public.staff_role() = 'admin')
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can delete categories" on public.categories;
create policy "Admin can delete categories"
  on public.categories for delete
  to authenticated
  using (public.staff_role() = 'admin');

-- ---- menu_items: public SELECT, admin write ----
drop policy if exists "Public can read menu items" on public.menu_items;
create policy "Public can read menu items"
  on public.menu_items for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can insert menu items" on public.menu_items;
create policy "Admin can insert menu items"
  on public.menu_items for insert
  to authenticated
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can update menu items" on public.menu_items;
create policy "Admin can update menu items"
  on public.menu_items for update
  to authenticated
  using (public.staff_role() = 'admin')
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can delete menu items" on public.menu_items;
create policy "Admin can delete menu items"
  on public.menu_items for delete
  to authenticated
  using (public.staff_role() = 'admin');

-- ---- item_variants: public SELECT, admin write ----
drop policy if exists "Public can read item variants" on public.item_variants;
create policy "Public can read item variants"
  on public.item_variants for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can insert item variants" on public.item_variants;
create policy "Admin can insert item variants"
  on public.item_variants for insert
  to authenticated
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can update item variants" on public.item_variants;
create policy "Admin can update item variants"
  on public.item_variants for update
  to authenticated
  using (public.staff_role() = 'admin')
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can delete item variants" on public.item_variants;
create policy "Admin can delete item variants"
  on public.item_variants for delete
  to authenticated
  using (public.staff_role() = 'admin');

-- ---- item_addons: public SELECT, admin write ----
drop policy if exists "Public can read item addons" on public.item_addons;
create policy "Public can read item addons"
  on public.item_addons for select
  to anon, authenticated
  using (true);

drop policy if exists "Admin can insert item addons" on public.item_addons;
create policy "Admin can insert item addons"
  on public.item_addons for insert
  to authenticated
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can update item addons" on public.item_addons;
create policy "Admin can update item addons"
  on public.item_addons for update
  to authenticated
  using (public.staff_role() = 'admin')
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can delete item addons" on public.item_addons;
create policy "Admin can delete item addons"
  on public.item_addons for delete
  to authenticated
  using (public.staff_role() = 'admin');

-- ---- restaurant_tables: public SELECT of active rows (staff can read all), admin write ----
drop policy if exists "Public can read active tables" on public.restaurant_tables;
create policy "Public can read active tables"
  on public.restaurant_tables for select
  to anon, authenticated
  using (is_active = true or public.is_staff());

drop policy if exists "Admin can insert tables" on public.restaurant_tables;
create policy "Admin can insert tables"
  on public.restaurant_tables for insert
  to authenticated
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can update tables" on public.restaurant_tables;
create policy "Admin can update tables"
  on public.restaurant_tables for update
  to authenticated
  using (public.staff_role() = 'admin')
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can delete tables" on public.restaurant_tables;
create policy "Admin can delete tables"
  on public.restaurant_tables for delete
  to authenticated
  using (public.staff_role() = 'admin');

-- ---- orders: NO public access; staff SELECT and UPDATE ----
drop policy if exists "Staff can read orders" on public.orders;
create policy "Staff can read orders"
  on public.orders for select
  to authenticated
  using (public.is_staff());

drop policy if exists "Staff can update orders" on public.orders;
create policy "Staff can update orders"
  on public.orders for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---- order_items: NO public access; staff SELECT ----
drop policy if exists "Staff can read order items" on public.order_items;
create policy "Staff can read order items"
  on public.order_items for select
  to authenticated
  using (public.is_staff());

-- ---- order_status_history: NO public access; staff SELECT and INSERT ----
drop policy if exists "Staff can read order status history" on public.order_status_history;
create policy "Staff can read order status history"
  on public.order_status_history for select
  to authenticated
  using (public.is_staff());

drop policy if exists "Staff can insert order status history" on public.order_status_history;
create policy "Staff can insert order status history"
  on public.order_status_history for insert
  to authenticated
  with check (public.is_staff());

-- ---- staff_profiles: staff SELECT; admin write ----
drop policy if exists "Staff can read staff profiles" on public.staff_profiles;
create policy "Staff can read staff profiles"
  on public.staff_profiles for select
  to authenticated
  using (public.is_staff());

drop policy if exists "Admin can insert staff profiles" on public.staff_profiles;
create policy "Admin can insert staff profiles"
  on public.staff_profiles for insert
  to authenticated
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can update staff profiles" on public.staff_profiles;
create policy "Admin can update staff profiles"
  on public.staff_profiles for update
  to authenticated
  using (public.staff_role() = 'admin')
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can delete staff profiles" on public.staff_profiles;
create policy "Admin can delete staff profiles"
  on public.staff_profiles for delete
  to authenticated
  using (public.staff_role() = 'admin');

-- ---- push_subscriptions: staff only ----
drop policy if exists "Staff can read push subscriptions" on public.push_subscriptions;
create policy "Staff can read push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using (public.is_staff() and (staff_id = auth.uid() or public.staff_role() = 'admin'));

drop policy if exists "Staff can insert own push subscriptions" on public.push_subscriptions;
create policy "Staff can insert own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated
  with check (public.is_staff() and staff_id = auth.uid());

drop policy if exists "Staff can update own push subscriptions" on public.push_subscriptions;
create policy "Staff can update own push subscriptions"
  on public.push_subscriptions for update
  to authenticated
  using (public.is_staff() and staff_id = auth.uid())
  with check (public.is_staff() and staff_id = auth.uid());

drop policy if exists "Staff can delete own push subscriptions" on public.push_subscriptions;
create policy "Staff can delete own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using (public.is_staff() and staff_id = auth.uid());

-- ---- settings: staff only (public reads go through server API) ----
drop policy if exists "Staff can read settings" on public.settings;
create policy "Staff can read settings"
  on public.settings for select
  to authenticated
  using (public.is_staff());

drop policy if exists "Admin can insert settings" on public.settings;
create policy "Admin can insert settings"
  on public.settings for insert
  to authenticated
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can update settings" on public.settings;
create policy "Admin can update settings"
  on public.settings for update
  to authenticated
  using (public.staff_role() = 'admin')
  with check (public.staff_role() = 'admin');

drop policy if exists "Admin can delete settings" on public.settings;
create policy "Admin can delete settings"
  on public.settings for delete
  to authenticated
  using (public.staff_role() = 'admin');


-- ============================================================================
-- 5. REALTIME
-- ============================================================================

-- Enable Supabase Realtime change events on the orders table
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;


-- ============================================================================
-- 6. STORAGE BUCKET & POLICIES ('menu-images')
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view menu images" on storage.objects;
create policy "Public can view menu images"
  on storage.objects for select
  to public
  using (bucket_id = 'menu-images');

drop policy if exists "Admin can upload menu images" on storage.objects;
create policy "Admin can upload menu images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'menu-images' and public.staff_role() = 'admin');

drop policy if exists "Admin can update menu images" on storage.objects;
create policy "Admin can update menu images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'menu-images' and public.staff_role() = 'admin')
  with check (bucket_id = 'menu-images' and public.staff_role() = 'admin');

drop policy if exists "Admin can delete menu images" on storage.objects;
create policy "Admin can delete menu images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'menu-images' and public.staff_role() = 'admin');


-- ============================================================================
-- 7. SEED DATA
-- ============================================================================

-- 4 Categories
insert into public.categories (id, name, sort_order, is_active) values
  ('11111111-1111-4111-8111-111111111101', 'Starters', 1, true),
  ('11111111-1111-4111-8111-111111111102', 'Main Course', 2, true),
  ('11111111-1111-4111-8111-111111111103', 'Breads', 3, true),
  ('11111111-1111-4111-8111-111111111104', 'Drinks', 4, true)
on conflict (id) do nothing;

-- 12 Realistic Indian Restaurant Menu Items (3 per category)
insert into public.menu_items (id, category_id, name, description, price, image_url, is_veg, is_available, is_bestseller, sort_order) values
  -- Starters
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101', 'Paneer Tikka', 'Char-grilled cottage cheese cubes marinated in hung curd, Kashmiri chilli, and aromatic spices.', 260.00, null, true, true, true, 1),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111101', 'Tandoori Chicken', 'Classic bone-in chicken roasted in a clay oven with ginger, garlic, and smoky tandoori masala.', 320.00, null, false, true, true, 2),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111101', 'Hara Bhara Kabab', 'Crisp pan-seared patties made with spinach, green peas, potatoes, and roasted cumin.', 210.00, null, true, true, false, 3),

  -- Main Course
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111102', 'Butter Chicken', 'Tender tandoori chicken simmered in a rich tomato, butter, and kasuri methi makhani gravy.', 360.00, null, false, true, true, 1),
  ('22222222-2222-4222-8222-222222222205', '11111111-1111-4111-8111-111111111102', 'Paneer Butter Masala', 'Soft paneer cubes folded into a velvety spiced tomato-cashew gravy finished with cream.', 310.00, null, true, true, true, 2),
  ('22222222-2222-4222-8222-222222222206', '11111111-1111-4111-8111-111111111102', 'Dal Makhani', 'Slow-simmered black urad lentils cooked overnight with butter, cream, and mild spices.', 250.00, null, true, true, false, 3),

  -- Breads
  ('22222222-2222-4222-8222-222222222207', '11111111-1111-4111-8111-111111111103', 'Butter Naan', 'Soft leavened tandoor-baked flatbread brushed generously with melted butter.', 60.00, null, true, true, true, 1),
  ('22222222-2222-4222-8222-222222222208', '11111111-1111-4111-8111-111111111103', 'Garlic Naan', 'Fluffy tandoori naan topped with roasted minced garlic, fresh coriander, and butter.', 75.00, null, true, true, false, 2),
  ('22222222-2222-4222-8222-222222222209', '11111111-1111-4111-8111-111111111103', 'Tandoori Roti', 'Crisp whole-wheat flatbread baked fresh on the walls of a hot clay tandoor.', 35.00, null, true, true, false, 3),

  -- Drinks
  ('22222222-2222-4222-8222-222222222210', '11111111-1111-4111-8111-111111111104', 'Mango Lassi', 'Chilled creamy yogurt smoothie blended with sweet Alphonso mango pulp and cardamom.', 110.00, null, true, true, true, 1),
  ('22222222-2222-4222-8222-222222222211', '11111111-1111-4111-8111-111111111104', 'Masala Chaas', 'Refreshing spiced buttermilk tempered with roasted cumin, black salt, mint, and coriander.', 70.00, null, true, true, false, 2),
  ('22222222-2222-4222-8222-222222222212', '11111111-1111-4111-8111-111111111104', 'Fresh Lime Soda', 'Sparkling chilled lime cooler balanced with black salt, roasted cumin, and sugar.', 80.00, null, true, true, false, 3)
on conflict (id) do nothing;

-- 2 Item Variants (Half / Full on Tandoori Chicken)
insert into public.item_variants (id, item_id, label, price) values
  ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222202', 'Half', 320.00),
  ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', 'Full', 580.00)
on conflict (id) do nothing;

-- 3 Item Addons
insert into public.item_addons (id, item_id, name, price, is_active) values
  ('44444444-4444-4444-8444-444444444401', '22222222-2222-4222-8222-222222222201', 'Extra Cheese', 45.00, true),
  ('44444444-4444-4444-8444-444444444402', '22222222-2222-4222-8222-222222222207', 'Extra Butter', 25.00, true),
  ('44444444-4444-4444-8444-444444444403', '22222222-2222-4222-8222-222222222204', 'Extra Makhani Gravy', 50.00, true)
on conflict (id) do nothing;

-- Restaurant Tables 1 to 10
insert into public.restaurant_tables (table_number, is_active)
select gs, true
from generate_series(1, 10) as gs
on conflict (table_number) do nothing;

-- Global Store Settings
insert into public.settings (key, value) values
  ('delivery_fee', '40'::jsonb),
  ('min_order', '150'::jsonb),
  ('shop_open', 'true'::jsonb)
on conflict (key) do nothing;


-- ============================================================================
-- 8. REPORTS & ANALYTICS RPC FUNCTIONS
-- ============================================================================

create or replace function public.get_sales_summary(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  total_sales numeric(12, 2),
  order_count bigint,
  avg_order_value numeric(12, 2),
  cancelled_count bigint,
  dine_in_count bigint,
  delivery_count bigint,
  dine_in_sales numeric(12, 2),
  delivery_sales numeric(12, 2)
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(total) filter (where status <> 'cancelled'), 0)::numeric(12, 2) as total_sales,
    count(*) filter (where status <> 'cancelled')::bigint as order_count,
    coalesce(avg(total) filter (where status <> 'cancelled'), 0)::numeric(12, 2) as avg_order_value,
    count(*) filter (where status = 'cancelled')::bigint as cancelled_count,
    count(*) filter (where status <> 'cancelled' and order_type = 'dine_in')::bigint as dine_in_count,
    count(*) filter (where status <> 'cancelled' and order_type = 'delivery')::bigint as delivery_count,
    coalesce(sum(total) filter (where status <> 'cancelled' and order_type = 'dine_in'), 0)::numeric(12, 2) as dine_in_sales,
    coalesce(sum(total) filter (where status <> 'cancelled' and order_type = 'delivery'), 0)::numeric(12, 2) as delivery_sales
  from public.orders
  where created_at >= p_start
    and created_at < p_end;
$$;

create or replace function public.get_daily_sales(
  p_start timestamptz,
  p_end timestamptz,
  p_tz text default 'Asia/Kolkata'
)
returns table (
  day date,
  sales numeric(12, 2),
  orders bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (created_at at time zone p_tz)::date as day,
    coalesce(sum(total), 0)::numeric(12, 2) as sales,
    count(*)::bigint as orders
  from public.orders
  where created_at >= p_start
    and created_at < p_end
    and status <> 'cancelled'
  group by 1
  order by 1 asc;
$$;

create or replace function public.get_top_selling_items(
  p_start timestamptz,
  p_end timestamptz,
  p_limit integer default 5
)
returns table (
  item_name text,
  quantity_sold bigint,
  revenue numeric(12, 2)
)
language sql
stable
security definer
set search_path = public
as $$
  select
    oi.item_name,
    coalesce(sum(oi.quantity), 0)::bigint as quantity_sold,
    coalesce(sum(oi.line_total), 0)::numeric(12, 2) as revenue
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.created_at >= p_start
    and o.created_at < p_end
    and o.status <> 'cancelled'
  group by oi.item_name
  order by quantity_sold desc, revenue desc
  limit greatest(1, p_limit);
$$;

revoke all on function public.get_sales_summary(timestamptz, timestamptz) from public;
revoke all on function public.get_daily_sales(timestamptz, timestamptz, text) from public;
revoke all on function public.get_top_selling_items(timestamptz, timestamptz, integer) from public;

grant execute on function public.get_sales_summary(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.get_daily_sales(timestamptz, timestamptz, text) to authenticated, service_role;
grant execute on function public.get_top_selling_items(timestamptz, timestamptz, integer) to authenticated, service_role;

