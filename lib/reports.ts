import { isMissingColumnError } from "@/lib/bakery-queries";
import { createAdminClient } from "@/lib/supabase-admin";

export type ReportRangeKey = "today" | "yesterday" | "7d" | "month";
export type SalesGranularity = "daily" | "weekly" | "monthly";

export type SalesSummaryReport = {
  total_sales: number;
  order_count: number;
  avg_order_value: number;
  pending_count: number;
  pending_sales: number;
  completed_count: number;
  completed_sales: number;
  cancelled_count: number;
  cancelled_sales: number;
};

export type SalesSeriesPoint = {
  key: string;
  label: string;
  sales: number;
  orders: number;
};

export type TopSellingItemPoint = {
  item_name: string;
  quantity_sold: number;
  revenue: number;
};

export type CategorySalesPoint = {
  category_name: string;
  quantity_sold: number;
  revenue: number;
  share_percent: number;
};

export type LowStockAlertItem = {
  id: string;
  name: string;
  category_name: string;
  stock_quantity: number;
  is_available: boolean;
};

export type CancelledOrderEntry = {
  id: string;
  order_no: number;
  customer_name: string;
  total: number;
  cancel_reason: string | null;
  created_at: string;
};

export type RevenueComparisonMetric = {
  id: string;
  label: string;
  current_label: string;
  previous_label: string;
  current_revenue: number;
  previous_revenue: number;
  current_orders: number;
  previous_orders: number;
  delta_percent: number | null;
};

export type ReportsPayload = {
  range: ReportRangeKey;
  timezone: string;
  startIso: string;
  endIso: string;
  summary: SalesSummaryReport;
  salesSeries: {
    daily: SalesSeriesPoint[];
    weekly: SalesSeriesPoint[];
    monthly: SalesSeriesPoint[];
  };
  topItems: TopSellingItemPoint[];
  topCategories: CategorySalesPoint[];
  lowStockItems: LowStockAlertItem[];
  lowStockSupported: boolean;
  cancelledOrders: CancelledOrderEntry[];
  selectedComparison: RevenueComparisonMetric;
  revenueComparisons: RevenueComparisonMetric[];
};

const REPORT_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 5;

const COMPLETED_STATUSES = new Set(["completed", "delivered", "served"]);

export const REPORT_RANGE_LABELS: Record<ReportRangeKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  month: "This month",
};

export function isValidReportRange(value: string | null): value is ReportRangeKey {
  return (
    value === "today" ||
    value === "yesterday" ||
    value === "7d" ||
    value === "month"
  );
}

function istMidnightUtcMs(year: number, month: number, day: number): number {
  return Date.UTC(year, month, day, 0, 0, 0, 0) - IST_OFFSET_MS;
}

function toIstParts(date: Date): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
} {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(), // 0 = Sun, 1 = Mon
  };
}

function formatIstDayKey(date: Date): string {
  const { year, month, day } = toIstParts(date);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatIstMonthKey(date: Date): string {
  const { year, month } = toIstParts(date);
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function formatShortDayLabel(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMonthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function getMondayStartIstParts(year: number, month: number, day: number) {
  const utcDate = new Date(Date.UTC(year, month, day));
  const dow = utcDate.getUTCDay();
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  utcDate.setUTCDate(utcDate.getUTCDate() + offsetToMonday);
  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth(),
    day: utcDate.getUTCDate(),
  };
}

export function getReportDateWindow(range: ReportRangeKey): {
  startIso: string;
  endIso: string;
  prevStartIso: string;
  prevEndIso: string;
  currentLabel: string;
  previousLabel: string;
  timezone: string;
} {
  const now = new Date();
  const { year, month, day } = toIstParts(now);

  const todayStartMs = istMidnightUtcMs(year, month, day);
  const tomorrowStartMs = istMidnightUtcMs(year, month, day + 1);

  if (range === "yesterday") {
    const startMs = istMidnightUtcMs(year, month, day - 1);
    const prevStartMs = istMidnightUtcMs(year, month, day - 2);
    return {
      startIso: new Date(startMs).toISOString(),
      endIso: new Date(todayStartMs).toISOString(),
      prevStartIso: new Date(prevStartMs).toISOString(),
      prevEndIso: new Date(startMs).toISOString(),
      currentLabel: "Yesterday",
      previousLabel: "Day before",
      timezone: REPORT_TIMEZONE,
    };
  }

  if (range === "7d") {
    const startMs = istMidnightUtcMs(year, month, day - 6);
    const prevStartMs = istMidnightUtcMs(year, month, day - 13);
    return {
      startIso: new Date(startMs).toISOString(),
      endIso: new Date(tomorrowStartMs).toISOString(),
      prevStartIso: new Date(prevStartMs).toISOString(),
      prevEndIso: new Date(startMs).toISOString(),
      currentLabel: "Last 7 days",
      previousLabel: "Prior 7 days",
      timezone: REPORT_TIMEZONE,
    };
  }

  if (range === "month") {
    const startMs = istMidnightUtcMs(year, month, 1);
    const prevStartMs = istMidnightUtcMs(year, month - 1, 1);
    return {
      startIso: new Date(startMs).toISOString(),
      endIso: new Date(tomorrowStartMs).toISOString(),
      prevStartIso: new Date(prevStartMs).toISOString(),
      prevEndIso: new Date(startMs).toISOString(),
      currentLabel: "This month",
      previousLabel: "Last month",
      timezone: REPORT_TIMEZONE,
    };
  }

  const yesterdayStartMs = istMidnightUtcMs(year, month, day - 1);
  return {
    startIso: new Date(todayStartMs).toISOString(),
    endIso: new Date(tomorrowStartMs).toISOString(),
    prevStartIso: new Date(yesterdayStartMs).toISOString(),
    prevEndIso: new Date(todayStartMs).toISOString(),
    currentLabel: "Today",
    previousLabel: "Yesterday",
    timezone: REPORT_TIMEZONE,
  };
}

const EMPTY_SUMMARY: SalesSummaryReport = {
  total_sales: 0,
  order_count: 0,
  avg_order_value: 0,
  pending_count: 0,
  pending_sales: 0,
  completed_count: 0,
  completed_sales: 0,
  cancelled_count: 0,
  cancelled_sales: 0,
};

function computeDeltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

type OrderRowLite = {
  id: string;
  order_no: number;
  customer_name: string | null;
  status: string;
  total: number;
  cancel_reason: string | null;
  created_at: string;
};

type OrderItemRowLite = {
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  line_total: number;
};

export async function fetchSalesReport(
  range: ReportRangeKey
): Promise<{ report: ReportsPayload; rpcError: string | null }> {
  const windowInfo = getReportDateWindow(range);
  const { startIso, endIso, prevStartIso, prevEndIso, timezone } = windowInfo;

  const now = new Date();
  const { year, month, day } = toIstParts(now);

  // Earliest boundary across all graphs and comparisons (6 months, 8 weeks, 14 days, prev period)
  const sixMonthsStartMs = istMidnightUtcMs(year, month - 5, 1);
  const fourteenDaysStartMs = istMidnightUtcMs(year, month, day - 13);
  const currentMonday = getMondayStartIstParts(year, month, day);
  const eightWeeksStartMs = istMidnightUtcMs(
    currentMonday.year,
    currentMonday.month,
    currentMonday.day - 7 * 7
  );
  const tomorrowStartMs = istMidnightUtcMs(year, month, day + 1);

  const earliestFetchMs = Math.min(
    sixMonthsStartMs,
    fourteenDaysStartMs,
    eightWeeksStartMs,
    new Date(prevStartIso).getTime()
  );
  const earliestFetchIso = new Date(earliestFetchMs).toISOString();
  const latestFetchIso = new Date(tomorrowStartMs).toISOString();

  const emptyComparison: RevenueComparisonMetric = {
    id: range,
    label: `${windowInfo.currentLabel} vs ${windowInfo.previousLabel}`,
    current_label: windowInfo.currentLabel,
    previous_label: windowInfo.previousLabel,
    current_revenue: 0,
    previous_revenue: 0,
    current_orders: 0,
    previous_orders: 0,
    delta_percent: 0,
  };

  try {
    const admin = createAdminClient();

    // 1. Fetch all orders across the full history window + categories + menu items
    const [ordersRes, categoriesRes] = await Promise.all([
      admin
        .from("orders")
        .select(
          "id, order_no, customer_name, status, total, cancel_reason, created_at"
        )
        .gte("created_at", earliestFetchIso)
        .lt("created_at", latestFetchIso)
        .order("created_at", { ascending: false })
        .limit(5000),
      admin.from("categories").select("id, name"),
    ]);

    if (ordersRes.error) {
      throw new Error(ordersRes.error.message);
    }

    let lowStockSupported = true;
    let menuRows: {
      id: string;
      name: string;
      category_id: string;
      stock_quantity?: number | null;
      is_available?: boolean;
    }[] = [];

    const menuWithStock = await admin
      .from("menu_items")
      .select("id, name, category_id, stock_quantity, is_available");

    if (menuWithStock.error && isMissingColumnError(menuWithStock.error)) {
      lowStockSupported = false;
      const menuBasic = await admin
        .from("menu_items")
        .select("id, name, category_id, is_available");
      menuRows = (menuBasic.data ?? []) as typeof menuRows;
    } else if (menuWithStock.data) {
      menuRows = menuWithStock.data as typeof menuRows;
    }

    const categoryNameById = new Map<string, string>(
      (categoriesRes.data ?? []).map((cat) => [cat.id, cat.name])
    );
    const menuById = new Map(menuRows.map((m) => [m.id, m]));

    // Low-stock alerts
    const lowStockItems: LowStockAlertItem[] = lowStockSupported
      ? menuRows
          .filter(
            (m) =>
              m.stock_quantity !== null &&
              m.stock_quantity !== undefined &&
              Number(m.stock_quantity) <= LOW_STOCK_THRESHOLD
          )
          .sort(
            (a, b) =>
              Number(a.stock_quantity ?? 0) - Number(b.stock_quantity ?? 0) ||
              a.name.localeCompare(b.name)
          )
          .map((m) => ({
            id: m.id,
            name: m.name,
            category_name:
              categoryNameById.get(m.category_id) ?? "Bakery Items",
            stock_quantity: Number(m.stock_quantity ?? 0),
            is_available: Boolean(m.is_available),
          }))
      : [];

    const orders = (ordersRes.data ?? []) as OrderRowLite[];
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    const prevStartMs = new Date(prevStartIso).getTime();
    const prevEndMs = new Date(prevEndIso).getTime();

    // Summary & Cancelled orders for selected period
    const summary: SalesSummaryReport = { ...EMPTY_SUMMARY };
    const cancelledOrders: CancelledOrderEntry[] = [];
    const activePeriodOrderIds: string[] = [];

    for (const order of orders) {
      const createdMs = new Date(order.created_at).getTime();
      if (createdMs < startMs || createdMs >= endMs) continue;

      const amount = Number(order.total ?? 0);
      if (order.status === "cancelled") {
        summary.cancelled_count += 1;
        summary.cancelled_sales = Number(
          (summary.cancelled_sales + amount).toFixed(2)
        );
        if (cancelledOrders.length < 10) {
          cancelledOrders.push({
            id: order.id,
            order_no: order.order_no,
            customer_name: order.customer_name || "Guest",
            total: amount,
            cancel_reason: order.cancel_reason,
            created_at: order.created_at,
          });
        }
        continue;
      }

      if (order.status === "placed") {
        // Unconfirmed order with price pending confirmation; does not count in sales revenue yet
        summary.pending_count += 1;
        summary.pending_sales = Number(
          (summary.pending_sales + amount).toFixed(2)
        );
        continue;
      }

      activePeriodOrderIds.push(order.id);
      summary.order_count += 1;
      summary.total_sales = Number((summary.total_sales + amount).toFixed(2));

      if (COMPLETED_STATUSES.has(order.status)) {
        summary.completed_count += 1;
        summary.completed_sales = Number(
          (summary.completed_sales + amount).toFixed(2)
        );
      } else {
        summary.pending_count += 1;
        summary.pending_sales = Number(
          (summary.pending_sales + amount).toFixed(2)
        );
      }
    }

    summary.avg_order_value =
      summary.order_count > 0
        ? Number((summary.total_sales / summary.order_count).toFixed(2))
        : 0;

    // Fetch order_items for active orders in the selected period
    const topItemsMap = new Map<string, TopSellingItemPoint>();
    const categoryMap = new Map<
      string,
      { category_name: string; quantity_sold: number; revenue: number }
    >();

    if (activePeriodOrderIds.length > 0) {
      // Chunk IN filter to stay well inside PostgREST URL limits
      const CHUNK_SIZE = 200;
      const itemRows: OrderItemRowLite[] = [];

      for (let i = 0; i < activePeriodOrderIds.length; i += CHUNK_SIZE) {
        const chunkIds = activePeriodOrderIds.slice(i, i + CHUNK_SIZE);
        const { data: chunkItems, error: itemsErr } = await admin
          .from("order_items")
          .select("order_id, menu_item_id, item_name, quantity, line_total")
          .in("order_id", chunkIds);

        if (itemsErr) {
          throw new Error(itemsErr.message);
        }
        itemRows.push(...((chunkItems ?? []) as OrderItemRowLite[]));
      }

      for (const row of itemRows) {
        const qty = Number(row.quantity ?? 0);
        const rev = Number(row.line_total ?? 0);
        const itemName = row.item_name;

        const prevItem = topItemsMap.get(itemName) ?? {
          item_name: itemName,
          quantity_sold: 0,
          revenue: 0,
        };
        prevItem.quantity_sold += qty;
        prevItem.revenue = Number((prevItem.revenue + rev).toFixed(2));
        topItemsMap.set(itemName, prevItem);

        const menuMeta = row.menu_item_id
          ? menuById.get(row.menu_item_id)
          : undefined;
        const catName = menuMeta
          ? (categoryNameById.get(menuMeta.category_id) ?? "Bakery Items")
          : "Other Items";

        const prevCat = categoryMap.get(catName) ?? {
          category_name: catName,
          quantity_sold: 0,
          revenue: 0,
        };
        prevCat.quantity_sold += qty;
        prevCat.revenue = Number((prevCat.revenue + rev).toFixed(2));
        categoryMap.set(catName, prevCat);
      }
    }

    const topItems = [...topItemsMap.values()]
      .sort(
        (a, b) => b.quantity_sold - a.quantity_sold || b.revenue - a.revenue
      )
      .slice(0, 8);

    const totalCategoryUnits = [...categoryMap.values()].reduce(
      (sum, c) => sum + c.quantity_sold,
      0
    );
    const topCategories: CategorySalesPoint[] = [...categoryMap.values()]
      .sort(
        (a, b) => b.quantity_sold - a.quantity_sold || b.revenue - a.revenue
      )
      .map((c) => ({
        ...c,
        share_percent:
          totalCategoryUnits > 0
            ? Number(((c.quantity_sold / totalCategoryUnits) * 100).toFixed(1))
            : 0,
      }));

    // Build Daily (14 days), Weekly (8 weeks), Monthly (6 months) series from non-cancelled orders
    const dailyBuckets = new Map<string, SalesSeriesPoint>();
    for (let offset = -13; offset <= 0; offset++) {
      const d = new Date(istMidnightUtcMs(year, month, day + offset));
      const parts = toIstParts(d);
      const key = formatIstDayKey(d);
      dailyBuckets.set(key, {
        key,
        label: formatShortDayLabel(parts.year, parts.month, parts.day),
        sales: 0,
        orders: 0,
      });
    }

    const weeklyBuckets = new Map<string, SalesSeriesPoint>();
    for (let w = -7; w <= 0; w++) {
      const startDate = new Date(
        istMidnightUtcMs(
          currentMonday.year,
          currentMonday.month,
          currentMonday.day + w * 7
        )
      );
      const startParts = toIstParts(startDate);
      const endDate = new Date(
        istMidnightUtcMs(
          currentMonday.year,
          currentMonday.month,
          currentMonday.day + w * 7 + 6
        )
      );
      const endParts = toIstParts(endDate);
      const key = formatIstDayKey(startDate);
      weeklyBuckets.set(key, {
        key,
        label: `${formatShortDayLabel(
          startParts.year,
          startParts.month,
          startParts.day
        )}–${formatShortDayLabel(endParts.year, endParts.month, endParts.day)}`,
        sales: 0,
        orders: 0,
      });
    }

    const monthlyBuckets = new Map<string, SalesSeriesPoint>();
    for (let m = -5; m <= 0; m++) {
      const d = new Date(istMidnightUtcMs(year, month + m, 1));
      const parts = toIstParts(d);
      const key = formatIstMonthKey(d);
      monthlyBuckets.set(key, {
        key,
        label: formatMonthLabel(parts.year, parts.month),
        sales: 0,
        orders: 0,
      });
    }

    for (const order of orders) {
      if (order.status === "cancelled" || order.status === "placed") continue;
      const createdDate = new Date(order.created_at);
      const amount = Number(order.total ?? 0);

      const dayKey = formatIstDayKey(createdDate);
      const dayBucket = dailyBuckets.get(dayKey);
      if (dayBucket) {
        dayBucket.sales = Number((dayBucket.sales + amount).toFixed(2));
        dayBucket.orders += 1;
      }

      const parts = toIstParts(createdDate);
      const monParts = getMondayStartIstParts(
        parts.year,
        parts.month,
        parts.day
      );
      const weekKey = `${monParts.year}-${String(monParts.month + 1).padStart(2, "0")}-${String(
        monParts.day
      ).padStart(2, "0")}`;
      const weekBucket = weeklyBuckets.get(weekKey);
      if (weekBucket) {
        weekBucket.sales = Number((weekBucket.sales + amount).toFixed(2));
        weekBucket.orders += 1;
      }

      const monthKey = formatIstMonthKey(createdDate);
      const monthBucket = monthlyBuckets.get(monthKey);
      if (monthBucket) {
        monthBucket.sales = Number((monthBucket.sales + amount).toFixed(2));
        monthBucket.orders += 1;
      }
    }

    // Helper for revenue comparison between two windows
    const summarizeWindow = (wStartMs: number, wEndMs: number) => {
      let revenue = 0;
      let count = 0;
      for (const order of orders) {
        if (order.status === "cancelled" || order.status === "placed") continue;
        const t = new Date(order.created_at).getTime();
        if (t >= wStartMs && t < wEndMs) {
          revenue += Number(order.total ?? 0);
          count += 1;
        }
      }
      return { revenue: Number(revenue.toFixed(2)), count };
    };

    const prevPeriodTotals = summarizeWindow(prevStartMs, prevEndMs);
    const selectedComparison: RevenueComparisonMetric = {
      id: range,
      label: `${windowInfo.currentLabel} vs ${windowInfo.previousLabel}`,
      current_label: windowInfo.currentLabel,
      previous_label: windowInfo.previousLabel,
      current_revenue: summary.total_sales,
      previous_revenue: prevPeriodTotals.revenue,
      current_orders: summary.order_count,
      previous_orders: prevPeriodTotals.count,
      delta_percent: computeDeltaPercent(
        summary.total_sales,
        prevPeriodTotals.revenue
      ),
    };

    // Always-available comparison benchmarks (Daily, Weekly, Monthly)
    const todayWin = summarizeWindow(
      istMidnightUtcMs(year, month, day),
      tomorrowStartMs
    );
    const yesterdayWin = summarizeWindow(
      istMidnightUtcMs(year, month, day - 1),
      istMidnightUtcMs(year, month, day)
    );
    const thisWeekWin = summarizeWindow(
      istMidnightUtcMs(year, month, day - 6),
      tomorrowStartMs
    );
    const lastWeekWin = summarizeWindow(
      istMidnightUtcMs(year, month, day - 13),
      istMidnightUtcMs(year, month, day - 6)
    );
    const thisMonthWin = summarizeWindow(
      istMidnightUtcMs(year, month, 1),
      tomorrowStartMs
    );
    const lastMonthWin = summarizeWindow(
      istMidnightUtcMs(year, month - 1, 1),
      istMidnightUtcMs(year, month, 1)
    );

    const revenueComparisons: RevenueComparisonMetric[] = [
      {
        id: "day",
        label: "Today vs Yesterday",
        current_label: "Today",
        previous_label: "Yesterday",
        current_revenue: todayWin.revenue,
        previous_revenue: yesterdayWin.revenue,
        current_orders: todayWin.count,
        previous_orders: yesterdayWin.count,
        delta_percent: computeDeltaPercent(
          todayWin.revenue,
          yesterdayWin.revenue
        ),
      },
      {
        id: "week",
        label: "Last 7d vs Prior 7d",
        current_label: "Last 7 days",
        previous_label: "Prior 7 days",
        current_revenue: thisWeekWin.revenue,
        previous_revenue: lastWeekWin.revenue,
        current_orders: thisWeekWin.count,
        previous_orders: lastWeekWin.count,
        delta_percent: computeDeltaPercent(
          thisWeekWin.revenue,
          lastWeekWin.revenue
        ),
      },
      {
        id: "month",
        label: "This Month vs Last Month",
        current_label: "This month",
        previous_label: "Last month",
        current_revenue: thisMonthWin.revenue,
        previous_revenue: lastMonthWin.revenue,
        current_orders: thisMonthWin.count,
        previous_orders: lastMonthWin.count,
        delta_percent: computeDeltaPercent(
          thisMonthWin.revenue,
          lastMonthWin.revenue
        ),
      },
    ];

    return {
      report: {
        range,
        timezone,
        startIso,
        endIso,
        summary,
        salesSeries: {
          daily: [...dailyBuckets.values()],
          weekly: [...weeklyBuckets.values()],
          monthly: [...monthlyBuckets.values()],
        },
        topItems,
        topCategories,
        lowStockItems,
        lowStockSupported,
        cancelledOrders,
        selectedComparison,
        revenueComparisons,
      },
      rpcError: null,
    };
  } catch (error) {
    return {
      report: {
        range,
        timezone,
        startIso,
        endIso,
        summary: EMPTY_SUMMARY,
        salesSeries: { daily: [], weekly: [], monthly: [] },
        topItems: [],
        topCategories: [],
        lowStockItems: [],
        lowStockSupported: true,
        cancelledOrders: [],
        selectedComparison: emptyComparison,
        revenueComparisons: [],
      },
      rpcError:
        error instanceof Error ? error.message : "Failed to load reports.",
    };
  }
}
