-- ============================================================================
-- Baker's Nation — Bakery Product Management & Ordering Upgrade SQL
-- Run this script once in Supabase Dashboard -> SQL Editor on existing projects.
-- ============================================================================

-- 1. Product Management & Bakery columns on menu_items
alter table public.menu_items
  add column if not exists image_urls jsonb not null default '[]'::jsonb,
  add column if not exists discount_price numeric(10, 2),
  add column if not exists stock_quantity integer,
  add column if not exists is_featured boolean not null default false,
  add column if not exists flavours jsonb not null default '[]'::jsonb,
  add column if not exists egg_options jsonb not null default '[]'::jsonb,
  add column if not exists allow_custom_message boolean not null default false,
  add column if not exists allow_custom_image boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_items_discount_price_check'
  ) then
    alter table public.menu_items
      add constraint menu_items_discount_price_check
      check (discount_price is null or discount_price >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_items_stock_quantity_check'
  ) then
    alter table public.menu_items
      add constraint menu_items_stock_quantity_check
      check (stock_quantity is null or stock_quantity >= 0);
  end if;
end $$;

-- Backfill image_urls from existing image_url where empty
update public.menu_items
set image_urls = jsonb_build_array(image_url)
where image_url is not null
  and image_url <> ''
  and jsonb_array_length(image_urls) = 0;

-- 2. Pre-order date & time on orders
alter table public.orders
  add column if not exists preorder_at timestamptz;

-- 3. Bakery customization snapshot columns on order_items
alter table public.order_items
  add column if not exists selected_flavour text,
  add column if not exists egg_preference text,
  add column if not exists cake_message text,
  add column if not exists custom_image_url text;

-- 4. Ensure core Bakery categories exist (Cakes, Pastries, Pizza, Bread)
insert into public.categories (name, sort_order, is_active)
select v.name, v.sort_order, true
from (
  values
    ('Cakes', 1),
    ('Pastries', 2),
    ('Pizza', 3),
    ('Bread', 4)
) as v(name, sort_order)
where not exists (
  select 1 from public.categories c where lower(c.name) = lower(v.name)
);

