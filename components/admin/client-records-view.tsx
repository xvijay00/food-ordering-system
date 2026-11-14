"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookUser,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  MessageCircle,
  Phone,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ClientOrderItem = {
  id: string;
  item_name: string;
  variant_label: string | null;
  addons: unknown;
  selected_flavour: string | null;
  egg_preference: string | null;
  cake_message: string | null;
  custom_image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type ClientOrderRecord = {
  id: string;
  order_no: number;
  order_token: string;
  order_type: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  created_at: string;
  cancel_reason: string | null;
  order_items: ClientOrderItem[];
};

export type ClientProfile = {
  phone: string;
  name: string;
  primaryAddress: string | null;
  totalOrders: number;
  completedOrders: number;
  totalSpent: number;
  firstOrderDate: string;
  lastOrderDate: string;
  orders: ClientOrderRecord[];
};

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function formatISTDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function cleanPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

export function ClientRecordsView({
  orders,
}: {
  orders: ClientOrderRecord[];
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState<"all" | "today" | "7d" | "month">("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest" | "highest">("newest");
  const [viewTab, setViewTab] = React.useState<"orders" | "clients">("orders");

  // Filter orders by search, date range, and status
  const filteredOrders = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = Date.now();

    return orders
      .filter((o) => {
        // Search query
        if (query) {
          const nameMatch = (o.customer_name || "").toLowerCase().includes(query);
          const phoneMatch = (o.customer_phone || "").toLowerCase().includes(query);
          const orderNoMatch = String(o.order_no).includes(query);
          const itemMatch = o.order_items.some((item) =>
            item.item_name.toLowerCase().includes(query)
          );
          const addressMatch = (o.delivery_address || "").toLowerCase().includes(query);
          if (!nameMatch && !phoneMatch && !orderNoMatch && !itemMatch && !addressMatch) {
            return false;
          }
        }

        // Date range
        if (dateRange !== "all") {
          const orderTime = new Date(o.created_at).getTime();
          const diffMs = now - orderTime;
          if (dateRange === "today" && diffMs > 24 * 60 * 60 * 1000) return false;
          if (dateRange === "7d" && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
          if (dateRange === "month" && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
        }

        // Status filter
        if (statusFilter !== "all") {
          if (statusFilter === "completed") {
            if (!["completed", "delivered", "served"].includes(o.status)) return false;
          } else if (statusFilter === "pending") {
            if (["completed", "delivered", "served", "cancelled"].includes(o.status)) return false;
          } else if (statusFilter === "cancelled") {
            if (o.status !== "cancelled") return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortOrder === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return Number(b.total) - Number(a.total);
      });
  }, [orders, searchQuery, dateRange, statusFilter, sortOrder]);

  // Aggregate orders by client phone
  const clientProfiles = React.useMemo(() => {
    const map = new Map<string, ClientProfile>();

    for (const order of orders) {
      const phoneKey = order.customer_phone.trim() || order.customer_name.trim();
      const existing = map.get(phoneKey);

      const isCompleted = ["completed", "delivered", "served"].includes(order.status);
      const isNotCancelled = order.status !== "cancelled";

      if (!existing) {
        map.set(phoneKey, {
          phone: order.customer_phone,
          name: order.customer_name || "Guest",
          primaryAddress: order.delivery_address,
          totalOrders: 1,
          completedOrders: isCompleted ? 1 : 0,
          totalSpent: isNotCancelled ? Number(order.total) : 0,
          firstOrderDate: order.created_at,
          lastOrderDate: order.created_at,
          orders: [order],
        });
      } else {
        existing.totalOrders += 1;
        if (isCompleted) existing.completedOrders += 1;
        if (isNotCancelled) existing.totalSpent += Number(order.total);
        if (!existing.primaryAddress && order.delivery_address) {
          existing.primaryAddress = order.delivery_address;
        }
        if (new Date(order.created_at) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = order.created_at;
        }
        existing.orders.push(order);
      }
    }

    const query = searchQuery.trim().toLowerCase();
    return [...map.values()]
      .filter((c) => {
        if (!query) return true;
        return (
          c.name.toLowerCase().includes(query) ||
          c.phone.toLowerCase().includes(query) ||
          (c.primaryAddress || "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.totalSpent - a.totalSpent || b.totalOrders - a.totalOrders);
  }, [orders, searchQuery]);

  // Overall Statistics
  const stats = React.useMemo(() => {
    const totalOrdersCount = orders.length;
    const activeOrders = orders.filter((o) => o.status !== "cancelled");
    const totalRevenue = activeOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const uniqueClientsCount = new Set(orders.map((o) => o.customer_phone.trim())).size;
    const repeatClients = clientProfiles.filter((c) => c.totalOrders > 1).length;

    return {
      totalOrders: totalOrdersCount,
      totalRevenue,
      uniqueClients: uniqueClientsCount,
      repeatClients,
      avgSpend: uniqueClientsCount > 0 ? Math.round(totalRevenue / uniqueClientsCount) : 0,
    };
  }, [orders, clientProfiles]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (orders.length === 0) return;

    const headers = [
      "Order No",
      "Date (IST)",
      "Customer Name",
      "Phone",
      "Address",
      "Status",
      "Payment Mode",
      "Subtotal (INR)",
      "Delivery Fee (INR)",
      "Total (INR)",
      "Items Summary",
    ];

    const rows = orders.map((o) => {
      const itemsSummary = o.order_items
        .map(
          (i) =>
            `${i.quantity}x ${i.item_name}${i.selected_flavour ? ` (${i.selected_flavour})` : ""}${i.egg_preference ? ` [${i.egg_preference}]` : ""}`
        )
        .join("; ");

      return [
        escapeCsvCell(o.order_no),
        escapeCsvCell(formatISTDate(o.created_at)),
        escapeCsvCell(o.customer_name || ""),
        escapeCsvCell(o.customer_phone || ""),
        escapeCsvCell(o.delivery_address || ""),
        escapeCsvCell(o.status || ""),
        escapeCsvCell(o.payment_method || ""),
        escapeCsvCell(Number(o.subtotal || 0).toFixed(2)),
        escapeCsvCell(Number(o.delivery_fee || 0).toFixed(2)),
        escapeCsvCell(Number(o.total || 0).toFixed(2)),
        escapeCsvCell(itemsSummary),
      ].join(",");
    });

    // \uFEFF (UTF-8 BOM) ensures Microsoft Excel & Google Sheets parse columns and characters accurately
    const csvContent =
      "\uFEFF" + [headers.map(escapeCsvCell).join(","), ...rows].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bakers_nation_client_records_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Client Records & Order History
          </h1>
          <p className="text-sm text-muted-foreground">
            Complete database of who ordered what, when, contact details, customizations, and spend history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="gap-2 rounded-xl"
          >
            <Download className="size-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="rounded-2xl border-border/80 bg-card/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Clients</span>
            <Users className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">{stats.uniqueClients}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.repeatClients} repeat buyers ({stats.uniqueClients > 0 ? Math.round((stats.repeatClients / stats.uniqueClients) * 100) : 0}%)
          </p>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Orders</span>
            <ShoppingBag className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">{stats.totalOrders}</div>
          <p className="mt-1 text-xs text-muted-foreground">Lifetime order records</p>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Revenue</span>
            <TrendingUp className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">₹{stats.totalRevenue.toLocaleString("en-IN")}</div>
          <p className="mt-1 text-xs text-muted-foreground">Excludes cancelled orders</p>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Avg Client Spend</span>
            <UserCheck className="size-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">₹{stats.avgSpend.toLocaleString("en-IN")}</div>
          <p className="mt-1 text-xs text-muted-foreground">Per active customer</p>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <Card className="rounded-2xl border-border/80 bg-card/60 p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by customer name, phone, order #, or dish/cake..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-xl pl-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Buttons */}
            <div className="flex items-center rounded-xl border border-border bg-muted/30 p-1 text-xs">
              {(
                [
                  ["all", "All"],
                  ["today", "Today"],
                  ["7d", "7 Days"],
                  ["month", "30 Days"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDateRange(key)}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                    dateRange === key
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter orders by status"
              className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed / Delivered</option>
              <option value="pending">Pending / In Progress</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              aria-label="Sort orders"
              className="h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-hidden"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tab Switcher: Orders List vs Clients Profiles */}
      <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as typeof viewTab)} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="h-10 rounded-xl bg-muted/40 p-1">
            <TabsTrigger value="orders" className="gap-2 rounded-lg text-xs font-semibold">
              <ShoppingBag className="size-3.5" />
              <span>Orders Log ({filteredOrders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2 rounded-lg text-xs font-semibold">
              <BookUser className="size-3.5" />
              <span>Client Profiles ({clientProfiles.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* =================================================================== */}
        {/* VIEW 1: DETAILED ORDER-BY-ORDER LOGS                                */}
        {/* =================================================================== */}
        <TabsContent value="orders" className="space-y-3">
          {filteredOrders.length === 0 ? (
            <Card className="flex flex-col items-center justify-center rounded-2xl border-dashed p-12 text-center">
              <ShoppingBag className="size-12 text-muted-foreground/40" />
              <h3 className="mt-4 font-heading text-base font-semibold">No order records found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {orders.length === 0
                  ? "As soon as clients place orders, their detailed records will appear here automatically."
                  : "Try clearing your search query or changing date filters."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredOrders.map((order) => {
                const isCancelled = order.status === "cancelled";
                const isCompleted = ["completed", "delivered", "served"].includes(order.status);
                const whatsappNumber = cleanPhoneForWhatsApp(order.customer_phone);

                return (
                  <Card
                    key={order.id}
                    className={`overflow-hidden rounded-2xl border transition-all hover:shadow-xs ${
                      isCancelled
                        ? "border-destructive/20 bg-destructive/5 opacity-80"
                        : "border-border/80 bg-card/80"
                    }`}
                  >
                    <div className="p-4 sm:p-5">
                      {/* Order Header: Order #, Status, Date, Total */}
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-heading text-lg font-bold">
                            Order #{order.order_no}
                          </span>
                          {isCompleted ? (
                            <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                              <CheckCircle2 className="size-3" />
                              <span>Delivered</span>
                            </Badge>
                          ) : isCancelled ? (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="size-3" />
                              <span>Cancelled</span>
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="size-3" />
                              <span className="capitalize">{order.status}</span>
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatISTDate(order.created_at)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
                            ₹{order.total}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {order.payment_method.toUpperCase()} • {order.payment_status}
                          </p>
                        </div>
                      </div>

                      {/* Client Contact & Delivery Information */}
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Client Details
                          </span>
                          <div className="font-medium text-foreground">{order.customer_name || "Guest"}</div>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="text-sm text-muted-foreground">{order.customer_phone}</span>
                            {/* WhatsApp Button */}
                            {whatsappNumber && (
                              <a
                                href={`https://wa.me/${whatsappNumber}?text=Hi%20${encodeURIComponent(
                                  order.customer_name || "Customer"
                                )},%20regarding%20your%20Baker's%20Nation%20Order%20%23${order.order_no}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20"
                              >
                                <MessageCircle className="size-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                            {/* Call Button */}
                            <a
                              href={`tel:${order.customer_phone}`}
                              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary/20"
                            >
                              <Phone className="size-3" />
                              <span>Call</span>
                            </a>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Delivery Address
                          </span>
                          <p className="text-sm text-foreground/90">
                            {order.delivery_address || "Pick up / Dine-in at bakery"}
                          </p>
                          {order.notes && (
                            <p className="text-xs italic text-amber-600 dark:text-amber-400">
                              Note: {order.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Item Details: What was ordered */}
                      <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Ordered Items ({order.order_items.length})
                        </span>
                        <div className="mt-2 divide-y divide-border/40">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex items-start justify-between py-2 text-sm">
                              <div className="space-y-0.5">
                                <div className="font-medium text-foreground">
                                  <span className="font-bold text-primary">{item.quantity}x</span>{" "}
                                  {item.item_name}
                                  {item.variant_label && (
                                    <span className="ml-1 text-xs text-muted-foreground">
                                      ({item.variant_label})
                                    </span>
                                  )}
                                </div>

                                {/* Custom Cake & Birthday Attributes */}
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  {item.selected_flavour && (
                                    <Badge variant="outline" className="gap-1 text-[11px]">
                                      <span>🍰 {item.selected_flavour}</span>
                                    </Badge>
                                  )}
                                  {item.egg_preference && (
                                    <Badge variant="outline" className="gap-1 text-[11px]">
                                      <span>🥚 {item.egg_preference}</span>
                                    </Badge>
                                  )}
                                  {item.custom_image_url && (
                                    <a
                                      href={item.custom_image_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary hover:underline"
                                    >
                                      <Camera className="size-3" />
                                      <span>Custom Cake Photo ↗</span>
                                    </a>
                                  )}
                                  {item.cake_message && (
                                    <span className="italic text-primary">
                                      &quot;{item.cake_message}&quot;
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="font-semibold tabular-nums text-foreground">
                                ₹{item.line_total}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Subtotal & Delivery Fee Breakdown */}
                        <div className="mt-2 flex justify-between border-t border-border/40 pt-2 text-xs text-muted-foreground">
                          <span>
                            Subtotal: ₹{order.subtotal} • Delivery: ₹{order.delivery_fee}
                          </span>
                          <Link
                            href={`/order/${order.order_token}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                          >
                            <span>Live Tracking Link</span>
                            <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* =================================================================== */}
        {/* VIEW 2: CLIENT PROFILES & DIRECTORY (CRM VIEW)                     */}
        {/* =================================================================== */}
        <TabsContent value="clients" className="space-y-3">
          {clientProfiles.length === 0 ? (
            <Card className="flex flex-col items-center justify-center rounded-2xl border-dashed p-12 text-center">
              <Users className="size-12 text-muted-foreground/40" />
              <h3 className="mt-4 font-heading text-base font-semibold">No clients registered</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Client directory will populate automatically as soon as customers place orders.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clientProfiles.map((client) => {
                const whatsappNumber = cleanPhoneForWhatsApp(client.phone);
                const isRepeat = client.totalOrders > 1;

                return (
                  <Card
                    key={client.phone}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-5 shadow-xs"
                  >
                    <div>
                      {/* Client Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-heading text-base font-bold text-foreground">
                            {client.name}
                          </div>
                          <div className="text-sm font-medium text-muted-foreground">
                            {client.phone}
                          </div>
                        </div>

                        {isRepeat && (
                          <Badge className="gap-1 bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400">
                            <Sparkles className="size-3" />
                            <span>Repeat Client</span>
                          </Badge>
                        )}
                      </div>

                      {/* Primary Address */}
                      <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                        📍 {client.primaryAddress || "No delivery address provided"}
                      </p>

                      {/* Client Stats Box */}
                      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5 text-center text-xs">
                        <div>
                          <span className="text-muted-foreground">Orders Placed</span>
                          <div className="font-heading text-base font-bold text-foreground">
                            {client.totalOrders}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Spend</span>
                          <div className="font-heading text-base font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{client.totalSpent.toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>

                      {/* Last Order Date */}
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Last order: {formatISTDate(client.lastOrderDate)}
                      </p>
                    </div>

                    {/* Quick Contact Buttons */}
                    <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
                      {whatsappNumber && (
                        <a
                          href={`https://wa.me/${whatsappNumber}?text=Hi%20${encodeURIComponent(
                            client.name
                          )},%20greetings%20from%20Baker's%20Nation!`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <MessageCircle className="size-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      <a
                        href={`tel:${client.phone}`}
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        <Phone className="size-3.5" />
                        <span>Call</span>
                      </a>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
