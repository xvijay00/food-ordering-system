import { createAdminClient } from "@/lib/supabase-admin";

export type ReportRangeKey = "today" | "yesterday" | "7d" | "month";

export type SalesSummaryReport = {
  total_sales: number;
  order_count: number;
  avg_order_value: number;
  cancelled_count: number;
  dine_in_count: number;
  delivery_count: number;
  dine_in_sales: number;
  delivery_sales: number;
};

export type DailySalesPoint = {
  day: string;
  sales: number;
  orders: number;
};

export type TopSellingItemPoint = {
  item_name: string;
  quantity_sold: number;
  revenue: number;
};

export type ReportsPayload = {
  range: ReportRangeKey;
  timezone: string;
  startIso: string;
  endIso: string;
  summary: SalesSummaryReport;
  dailySales: DailySalesPoint[];
  topItems: TopSellingItemPoint[];
};

const REPORT_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60 * 1000;

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

export function getReportDateWindow(range: ReportRangeKey): {
  startIso: string;
  endIso: string;
  timezone: string;
} {
  const now = new Date();
  const shiftedNow = new Date(now.getTime() + IST_OFFSET_MS);
  const year = shiftedNow.getUTCFullYear();
  const month = shiftedNow.getUTCMonth();
  const day = shiftedNow.getUTCDate();

  const istMidnightUtcMs = (y: number, m: number, d: number) =>
    Date.UTC(y, m, d, 0, 0, 0, 0) - IST_OFFSET_MS;

  const todayStartMs = istMidnightUtcMs(year, month, day);
  const tomorrowStartMs = istMidnightUtcMs(year, month, day + 1);

  if (range === "yesterday") {
    return {
      startIso: new Date(istMidnightUtcMs(year, month, day - 1)).toISOString(),
      endIso: new Date(todayStartMs).toISOString(),
      timezone: REPORT_TIMEZONE,
    };
  }

  if (range === "7d") {
    return {
      startIso: new Date(istMidnightUtcMs(year, month, day - 6)).toISOString(),
      endIso: new Date(tomorrowStartMs).toISOString(),
      timezone: REPORT_TIMEZONE,
    };
  }

  if (range === "month") {
    return {
      startIso: new Date(istMidnightUtcMs(year, month, 1)).toISOString(),
      endIso: new Date(tomorrowStartMs).toISOString(),
      timezone: REPORT_TIMEZONE,
    };
  }

  return {
    startIso: new Date(todayStartMs).toISOString(),
    endIso: new Date(tomorrowStartMs).toISOString(),
    timezone: REPORT_TIMEZONE,
  };
}

const EMPTY_SUMMARY: SalesSummaryReport = {
  total_sales: 0,
  order_count: 0,
  avg_order_value: 0,
  cancelled_count: 0,
  dine_in_count: 0,
  delivery_count: 0,
  dine_in_sales: 0,
  delivery_sales: 0,
};

export async function fetchSalesReport(
  range: ReportRangeKey
): Promise<{ report: ReportsPayload; rpcError: string | null }> {
  const { startIso, endIso, timezone } = getReportDateWindow(range);

  try {
    const admin = createAdminClient();
    const [summaryRes, dailyRes, topRes] = await Promise.all([
      admin.rpc("get_sales_summary", {
        p_start: startIso,
        p_end: endIso,
      }),
      admin.rpc("get_daily_sales", {
        p_start: startIso,
        p_end: endIso,
        p_tz: timezone,
      }),
      admin.rpc("get_top_selling_items", {
        p_start: startIso,
        p_end: endIso,
        p_limit: 5,
      }),
    ]);

    const firstError =
      summaryRes.error?.message ||
      dailyRes.error?.message ||
      topRes.error?.message ||
      null;

    const rawSummary = summaryRes.data?.[0];
    const summary: SalesSummaryReport = rawSummary
      ? {
          total_sales: Number(rawSummary.total_sales ?? 0),
          order_count: Number(rawSummary.order_count ?? 0),
          avg_order_value: Number(rawSummary.avg_order_value ?? 0),
          cancelled_count: Number(rawSummary.cancelled_count ?? 0),
          dine_in_count: Number(rawSummary.dine_in_count ?? 0),
          delivery_count: Number(rawSummary.delivery_count ?? 0),
          dine_in_sales: Number(rawSummary.dine_in_sales ?? 0),
          delivery_sales: Number(rawSummary.delivery_sales ?? 0),
        }
      : EMPTY_SUMMARY;

    const dailySales: DailySalesPoint[] = (dailyRes.data ?? []).map((row) => ({
      day: String(row.day),
      sales: Number(row.sales ?? 0),
      orders: Number(row.orders ?? 0),
    }));

    const topItems: TopSellingItemPoint[] = (topRes.data ?? []).map((row) => ({
      item_name: String(row.item_name),
      quantity_sold: Number(row.quantity_sold ?? 0),
      revenue: Number(row.revenue ?? 0),
    }));

    return {
      report: {
        range,
        timezone,
        startIso,
        endIso,
        summary,
        dailySales,
        topItems,
      },
      rpcError: firstError,
    };
  } catch (error) {
    return {
      report: {
        range,
        timezone,
        startIso,
        endIso,
        summary: EMPTY_SUMMARY,
        dailySales: [],
        topItems: [],
      },
      rpcError:
        error instanceof Error ? error.message : "Failed to load reports.",
    };
  }
}

