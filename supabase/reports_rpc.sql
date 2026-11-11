-- ============================================================================
-- Reports & Analytics RPC Functions
-- Run this script in the Supabase SQL Editor (also included in supabase/schema.sql).
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

