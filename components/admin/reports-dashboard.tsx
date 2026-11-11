"use client";

import * as React from "react";
import {
  AlertCircle,
  Ban,
  IndianRupee,
  Loader2,
  ReceiptText,
  ShoppingBag,
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
  type TopSellingItemPoint,
} from "@/lib/reports";
import { useHydrated } from "@/lib/use-hydrated";

const RANGE_OPTIONS: ReportRangeKey[] = ["today", "yesterday", "7d", "month"];
const DONUT_COLORS = ["#f59e0b", "#0ea5e9"];

function formatShortDay(isoDay: string): string {
  const parsed = new Date(`${isoDay}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDay;
  return parsed.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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

  const { summary, dailySales, topItems } = report;

  const dailyChartData = React.useMemo(
    () =>
      dailySales.map((point) => ({
        ...point,
        label: formatShortDay(point.day),
      })),
    [dailySales]
  );

  const orderTypeData = React.useMemo(
    () => [
      {
        name: "Dine-in",
        count: summary.dine_in_count,
        sales: summary.dine_in_sales,
      },
      {
        name: "Delivery",
        count: summary.delivery_count,
        sales: summary.delivery_sales,
      },
    ],
    [
      summary.dine_in_count,
      summary.dine_in_sales,
      summary.delivery_count,
      summary.delivery_sales,
    ]
  );

  const hasOrderTypes =
    summary.dine_in_count > 0 || summary.delivery_count > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Sales &amp; Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Non-cancelled order revenue and top items ({REPORT_RANGE_LABELS[range]}).
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
            <p className="text-xs opacity-90">
              {errorMessage}. Ensure <code>supabase/reports_rpc.sql</code> has
              been executed in Supabase SQL Editor.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
            <IndianRupee
              className="size-4 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {formatPrice(summary.total_sales)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Excludes cancelled orders
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Number of Orders
            </CardTitle>
            <ShoppingBag
              className="size-4 text-sky-600 dark:text-sky-400"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {summary.order_count}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.dine_in_count} dine-in · {summary.delivery_count} delivery
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
            <p className="text-2xl font-bold tabular-nums">
              {summary.cancelled_count}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Rejected or cancelled in period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sales Per Day Bar Chart */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold">Sales per day</CardTitle>
            <CardDescription>
              Daily revenue in {RESTAURANT_CONFIG.currencySymbol} (IST)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dailyChartData.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No completed or active sales in this period.
              </div>
            ) : (
              <figure>
                <div className="h-72 w-full">
                  {hydrated ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dailyChartData}
                        margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 12 }}
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
                          formatter={(value) => [
                            formatPrice(Number(value ?? 0)),
                            "Sales",
                          ]}
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
                <figcaption className="sr-only">
                  Bar chart displaying daily restaurant sales for{" "}
                  {REPORT_RANGE_LABELS[range]}.
                </figcaption>
                <table className="sr-only">
                  <caption>Daily sales breakdown</caption>
                  <thead>
                    <tr>
                      <th scope="col">Day</th>
                      <th scope="col">Orders</th>
                      <th scope="col">Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyChartData.map((point) => (
                      <tr key={point.day}>
                        <td>{point.label}</td>
                        <td>{point.orders}</td>
                        <td>{formatPrice(point.sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </figure>
            )}
          </CardContent>
        </Card>

        {/* Dine-in vs Delivery Donut Chart */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold">
              Dine-in vs Delivery
            </CardTitle>
            <CardDescription>Order share by channel</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasOrderTypes ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No orders yet in this period.
              </div>
            ) : (
              <figure className="space-y-4">
                <div className="h-56 w-full">
                  {hydrated ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderTypeData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={82}
                          paddingAngle={3}
                        >
                          {orderTypeData.map((entry, idx) => (
                            <Cell
                              key={entry.name}
                              fill={DONUT_COLORS[idx % DONUT_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, _name, item) => {
                            const row = item?.payload as
                              | { sales?: number }
                              | undefined;
                            return [
                              `${value ?? 0} orders (${formatPrice(
                                Number(row?.sales ?? 0)
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

                <figcaption className="grid grid-cols-2 gap-2 text-xs">
                  {orderTypeData.map((entry, idx) => (
                    <div
                      key={entry.name}
                      className="rounded-xl border bg-muted/30 p-2.5"
                    >
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span
                          className="inline-block size-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              DONUT_COLORS[idx % DONUT_COLORS.length],
                          }}
                          aria-hidden="true"
                        />
                        <span>{entry.name}</span>
                      </div>
                      <p className="mt-1 font-bold tabular-nums">
                        {entry.count} orders
                      </p>
                      <p className="text-muted-foreground tabular-nums">
                        {formatPrice(entry.sales)}
                      </p>
                    </div>
                  ))}
                </figcaption>
              </figure>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Selling Items Horizontal Bar Chart */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-bold">
            Top 5 Selling Items
          </CardTitle>
          <CardDescription>
            Ranked by total quantity sold in non-cancelled orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topItems.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              No items sold in this period.
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
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="item_name"
                        width={130}
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

              <div>
                <figcaption className="sr-only">
                  Horizontal bar chart showing top 5 selling menu items by units
                  sold.
                </figcaption>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th scope="col" className="py-2 font-medium">
                        Item
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Qty
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.map((item) => (
                      <tr key={item.item_name} className="border-b last:border-0">
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
    </div>
  );
}
