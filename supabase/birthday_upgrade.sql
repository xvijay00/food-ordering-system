-- ====================================================================
-- BAKERS NATION: BIRTHDAY CELEBRATION UPGRADE MIGRATION
-- Adds birthday categorization, flags, and seeds official categories
-- ====================================================================

-- 1. Ensure birthday columns exist on categories & menu_items
alter table public.categories
  add column if not exists is_birthday boolean not null default false;

alter table public.categories
  add column if not exists image_url text;

alter table public.menu_items
  add column if not exists is_birthday boolean not null default false;

-- 2. Seed Birthday Celebration Categories (if not already existing)
insert into public.categories (name, sort_order, is_active, is_birthday)
select v.name, v.sort_order, true, true
from (
  values
    ('Birthday Cakes', 10),
    ('Balloons', 11),
    ('Birthday Candles', 12),
    ('Birthday Caps', 13),
    ('Birthday Banners', 14),
    ('Party Decorations', 15),
    ('Cake Accessories', 16),
    ('Birthday Gift Items', 17)
) as v(name, sort_order)
where not exists (
  select 1 from public.categories c where lower(c.name) = lower(v.name)
);

-- Update existing matching categories to ensure is_birthday is true
update public.categories
set is_birthday = true
where lower(name) in (
  'birthday cakes',
  'balloons',
  'birthday candles',
  'birthday caps',
  'birthday banners',
  'party decorations',
  'cake accessories',
  'birthday gift items'
);

-- 3. Performance Indexes for Birthday Catalog Filtering
create index if not exists idx_categories_is_birthday
  on public.categories(is_birthday, is_active, sort_order);

create index if not exists idx_menu_items_is_birthday
  on public.menu_items(is_birthday, is_available, sort_order);

create index if not exists idx_menu_items_category_birthday
  on public.menu_items(category_id, is_available);
