"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  IndianRupee,
  Loader2,
  Package,
  ReceiptText,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RESTAURANT_CONFIG } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import {
  REPORT_RANGE_LABELS,
  type ReportRangeKey,
  type ReportsPayload,
  type SalesGranularity,
  type TopSellingItemPoint,
} from "@/lib/reports";
import { useHydrated } from "@/lib/use-hydrated";

const RANGE_OPTIONS: ReportRangeKey[] = ["today", "yesterday", "7d", "month"];
const GRANULARITY_OPTIONS: { key: SalesGranularity; label: string; hint: string }[] = [
  { key: "daily", label: "Daily", hint: "Last 14 days (IST)" },
  { key: "weekly", label: "Weekly", hint: "Last 8 weeks (Mon–Sun)" },
  { key: "monthly", label: "Monthly", hint: "Last 6 months (IST)" },
];

const CATEGORY_COLORS = [
  "#f59e0b",
  "#10b981",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
];

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta > 0) {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-emerald-500/15 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
      >
        <TrendingUp className="size-3" aria-hidden="true" />
        +{delta}%
      </Badge>
    );
  }
  if (delta < 0) {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-rose-500/15 text-[11px] font-semibold text-rose-700 dark:text-rose-300"
      >
        <TrendingDown className="size-3" aria-hidden="true" />
        {delta}%
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[11px] font-semibold">
      0%
    </Badge>
  );
}

export function ReportsDashboard({
  initialReport,
  initialError = null,
}: {
  initialReport: ReportsPayload;
  initialError?: string | null;
}) {
  const hydrated = useHydrated();
  const [range, setRange] = React.useState<ReportRangeKey>(initialReport.range);
  const [granularity, setGranularity] =
    React.useState<SalesGranularity>("daily");
  const [report, setReport] = React.useState<ReportsPayload>(initialReport);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(
    initialError
  );

  const handleSelectRange = async (nextRange: ReportRangeKey) => {
    setRange(nextRange);
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/admin/reports?range=${nextRange}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as {
        report?: ReportsPayload;
        error?: string;
      } | null;

      if (!res.ok) {
        const message = data?.error ?? "Failed to load report data.";
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      if (data?.report) {
        setReport(data.report);
      }
    } catch {
      toast.error("Could not refresh reports.");
    } finally {
      setLoading(false);
    }
  };

  const {
    summary,
    salesSeries,
    topItems,
    topCategories,
    lowStockItems,
    lowStockSupported,
    cancelledOrders,
    selectedComparison,
    revenueComparisons,
  } = report;

  const activeSeries = salesSeries[granularity];
  const activeGranularityMeta =
    GRANULARITY_OPTIONS.find((opt) => opt.key === granularity) ??
    GRANULARITY_OPTIONS[0];
  const hasAnySalesInSeries = activeSeries.some(
    (point) => point.sales > 0 || point.orders > 0
  );

  return (
    <div className="space-y-6">
      {/* Header & Period Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Sales &amp; Bakery Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Revenue, best-sellers, category demand, stock alerts &amp; order
            health ({REPORT_RANGE_LABELS[range]}).
          </p>
        </div>

        <div
          role="group"
          aria-label="Report date range"
          className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border bg-card p-1.5"
        >
          {RANGE_OPTIONS.map((key) => {
            const active = range === key;
            return (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={active ? "default" : "ghost"}
                aria-pressed={active}
                disabled={loading}
                onClick={() => void handleSelectRange(key)}
                className="min-h-9 rounded-xl px-3 text-xs font-semibold"
              >
                {loading && active && (
                  <Loader2
                    className="mr-1.5 size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                )}
                <span>{REPORT_RANGE_LABELS[key]}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Report query failed</p>
            <p className="text-xs opacity-90">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <IndianRupee
              className="size-4 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-2xl font-bold tabular-nums">
                {formatPrice(summary.total_sales)}
              </p>
              <DeltaBadge delta={selectedComparison.delta_percent} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              vs {formatPrice(selectedComparison.previous_revenue)} (
              {selectedComparison.previous_label})
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending &amp; Completed
            </CardTitle>
            <ShoppingBag
              className="size-4 text-sky-600 dark:text-sky-400"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {summary.order_count}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                orders
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.pending_count} pending · {summary.completed_count}{" "}
              completed
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Order Value
            </CardTitle>
            <ReceiptText
              className="size-4 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatPrice(summary.avg_order_value)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Mean spend per active order
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelled Orders
            </CardTitle>
            <Ban className="size-4 text-rose-500" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose-600 tabular-nums dark:text-rose-400">
              {summary.cancelled_count}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatPrice(summary.cancelled_sales)} cancelled value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Comparison Benchmarks */}
      {revenueComparisons.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {revenueComparisons.map((cmp) => (
            <Card key={cmp.id} className="rounded-2xl border-border/70">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {cmp.label}
                  </p>
                  <DeltaBadge delta={cmp.delta_percent} />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold tabular-nums">
                      {formatPrice(cmp.current_revenue)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {cmp.current_label} ({cmp.current_orders} orders)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-muted-foreground tabular-nums">
                      {formatPrice(cmp.previous_revenue)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {cmp.previous_label} ({cmp.previous_orders} orders)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sales Graph (Daily / Weekly / Monthly) & Most Ordered Categories */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold">
                Sales Graph ({activeGranularityMeta.label})
              </CardTitle>
              <CardDescription>{activeGranularityMeta.hint}</CardDescription>
            </div>

            <div
              role="group"
              aria-label="Sales graph granularity"
              className="inline-flex items-center gap-1 rounded-xl border bg-muted/40 p-1"
            >
              {GRANULARITY_OPTIONS.map((opt) => {
                const active = granularity === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setGranularity(opt.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent>
            {!hasAnySalesInSeries ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No completed or active sales recorded in this {granularity}{" "}
                window yet.
              </div>
            ) : (
              <figure>
                <div className="h-72 w-full">
                  {hydrated ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={activeSeries}
                        margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value: number) =>
                            `${RESTAURANT_CONFIG.currencySymbol}${value}`
                          }
                        />
                        <Tooltip
                          formatter={(value, _name, item) => {
                            const point = item?.payload as
                              | { orders?: number }
                              | undefined;
                            return [
                              `${formatPrice(Number(value ?? 0))} (${
                                point?.orders ?? 0
                              } orders)`,
                              "Sales",
                            ];
                          }}
                        />
                        <Bar
                          dataKey="sales"
                          fill="#f59e0b"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full rounded-xl bg-muted/40" />
                  )}
                </div>
              </figure>
            )}
          </CardContent>
        </Card>

        {/* Most Ordered Categories */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Most Ordered Categories
            </CardTitle>
            <CardDescription>
              Units &amp; revenue share ({REPORT_RANGE_LABELS[range]})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No category orders yet in this period.
              </div>
            ) : (
              <figure className="space-y-4">
                <div className="h-52 w-full">
                  {hydrated ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topCategories}
                          dataKey="quantity_sold"
                          nameKey="category_name"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={78}
                          paddingAngle={3}
                        >
                          {topCategories.map((entry, idx) => (
                            <Cell
                              key={entry.category_name}
                              fill={
                                CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, _name, item) => {
                            const row = item?.payload as
                              | { revenue?: number; share_percent?: number }
                              | undefined;
                            return [
                              `${value ?? 0} units (${row?.share_percent ?? 0}% · ${formatPrice(
                                Number(row?.revenue ?? 0)
                              )})`,
                              item?.name ?? "",
                            ];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full rounded-xl bg-muted/40" />
                  )}
                </div>

                <figcaption className="space-y-2 text-xs">
                  {topCategories.map((cat, idx) => (
                    <div
                      key={cat.category_name}
                      className="flex items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="inline-block size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                          }}
                          aria-hidden="true"
                        />
                        <span className="truncate font-semibold">
                          {cat.category_name}
                        </span>
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <span className="font-bold">{cat.quantity_sold}</span>{" "}
                        <span className="text-muted-foreground">
                          ({cat.share_percent}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </figcaption>
              </figure>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Best-Selling Products */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-bold">
            Best-Selling Products
          </CardTitle>
          <CardDescription>
            Ranked by total quantity sold ({REPORT_RANGE_LABELS[range]})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topItems.length === 0 ? (
            <div className="flex h-44 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              No products sold in this period.
            </div>
          ) : (
            <figure className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center">
              <div className="h-64 w-full">
                {hydrated ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topItems}
                      layout="vertical"
                      margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="item_name"
                        width={140}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value, _name, item) => {
                          const row = item?.payload as
                            | TopSellingItemPoint
                            | undefined;
                          return [
                            `${value ?? 0} sold (${formatPrice(
                              Number(row?.revenue ?? 0)
                            )})`,
                            "Units",
                          ];
                        }}
                      />
                      <Bar
                        dataKey="quantity_sold"
                        fill="#10b981"
                        radius={[0, 8, 8, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full rounded-xl bg-muted/40" />
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th scope="col" className="py-2 font-medium">
                        Product
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Units Sold
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.map((item) => (
                      <tr
                        key={item.item_name}
                        className="border-b last:border-0"
                      >
                        <td className="py-2.5 font-medium">{item.item_name}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {item.quantity_sold}
                        </td>
                        <td className="py-2.5 text-right font-semibold tabular-nums">
                          {formatPrice(item.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </figure>
          )}
        </CardContent>
      </Card>

      {/* Operational Insights Row: Order Status, Low-Stock Alerts, Cancelled Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pending vs Completed Orders */}
        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-base font-bold">
                Pending &amp; Completed Orders
              </CardTitle>
              <CardDescription>{REPORT_RANGE_LABELS[range]}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link href="/admin/orders">
                <span>Live Board</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5">
              <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
                <Clock className="size-4" aria-hidden="true" />
                <span>Pending / In Progress</span>
              </div>
              <div className="text-right tabular-nums">
                <p className="font-bold">{summary.pending_count}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatPrice(summary.pending_sales)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5">
              <div className="flex items-center gap-2 font-medium text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                <span>Completed / Delivered</span>
              </div>
              <div className="text-right tabular-nums">
                <p className="font-bold">{summary.completed_count}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatPrice(summary.completed_sales)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5">
              <div className="flex items-center gap-2 font-medium text-rose-900 dark:text-rose-200">
                <Ban className="size-4" aria-hidden="true" />
                <span>Cancelled</span>
              </div>
              <div className="text-right tabular-nums">
                <p className="font-bold">{summary.cancelled_count}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatPrice(summary.cancelled_sales)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low-Stock Alerts */}
        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="flex items-center gap-1.5 text-base font-bold">
                <Package
                  className="size-4 text-rose-600 dark:text-rose-400"
                  aria-hidden="true"
                />
                <span>Low-Stock Alerts</span>
              </CardTitle>
              <CardDescription>Products with 5 or fewer units</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link href="/admin/menu">
                <span>Restock</span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!lowStockSupported ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Run <code>supabase/bakery_upgrade.sql</code> in Supabase SQL
                  Editor to track product stock alerts.
                </span>
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                <CheckCircle2
                  className="mb-1.5 size-5 text-emerald-600"
                  aria-hidden="true"
                />
                <p>No low-stock products right now.</p>
              </div>
            ) : (
              <ul className="max-h-60 divide-y divide-border/60 overflow-y-auto text-xs">
                {lowStockItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.category_name}
                      </p>
                    </div>
                    {item.stock_quantity === 0 ? (
                      <Badge
                        variant="destructive"
                        className="shrink-0 text-[11px] tabular-nums"
                      >
                        Out of stock
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="shrink-0 bg-amber-500/15 text-[11px] text-amber-800 tabular-nums dark:text-amber-300"
                      >
                        {item.stock_quantity} left
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Cancelled Orders */}
        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-base font-bold">
                Cancelled Orders
              </CardTitle>
              <CardDescription>
                Recent cancellations ({REPORT_RANGE_LABELS[range]})
              </CardDescription>
            </div>
            <Badge variant="outline" className="tabular-nums">
              {summary.cancelled_count}
            </Badge>
          </CardHeader>
          <CardContent>
            {cancelledOrders.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                <CheckCircle2
                  className="mb-1.5 size-5 text-emerald-600"
                  aria-hidden="true"
                />
                <p>Zero cancelled orders in this period.</p>
              </div>
            ) : (
              <ul className="max-h-60 divide-y divide-border/60 overflow-y-auto text-xs">
                {cancelledOrders.map((order) => (
                  <li
                    key={order.id}
                    className="space-y-0.5 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        #{order.order_no} · {order.customer_name}
                      </Link>
                      <span className="font-semibold tabular-nums">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {order.cancel_reason
                        ? `Reason: ${order.cancel_reason}`
                        : "No reason specified"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
