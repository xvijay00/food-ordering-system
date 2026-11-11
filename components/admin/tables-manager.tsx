"use client";

import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Copy,
  Download,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RESTAURANT_CONFIG } from "@/lib/config";
import { useHydrated } from "@/lib/use-hydrated";
import type { RestaurantTable } from "@/types/database";

export function TablesManager({
  initialTables,
  configuredSiteUrl,
}: {
  initialTables: RestaurantTable[];
  configuredSiteUrl: string;
}) {
  const hydrated = useHydrated();
  const [tables, setTables] = React.useState<RestaurantTable[]>(initialTables);
  const [newTableNo, setNewTableNo] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [deleteTarget, setDeleteTarget] =
    React.useState<RestaurantTable | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const origin = React.useMemo(() => {
    if (configuredSiteUrl) return configuredSiteUrl.replace(/\/$/, "");
    if (hydrated && typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://localhost:3000";
  }, [configuredSiteUrl, hydrated]);

  const refreshTables = React.useCallback(async () => {
    const res = await fetch("/api/admin/tables", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { tables?: RestaurantTable[] };
    if (data.tables) setTables(data.tables);
  }, []);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number.parseInt(newTableNo, 10);
    if (!Number.isInteger(num) || num <= 0) {
      toast.error("Enter a valid positive table number.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_number: num, is_active: true }),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Failed to create table.");

      setNewTableNo("");
      toast.success(`Table ${num} added`);
      await refreshTables();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add table.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (
    table: RestaurantTable,
    nextActive: boolean
  ) => {
    setTables((prev) =>
      prev.map((row) =>
        row.id === table.id ? { ...row, is_active: nextActive } : row
      )
    );

    try {
      const res = await fetch("/api/admin/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: table.id, is_active: nextActive }),
      });
      if (!res.ok) throw new Error("Failed to update table.");
      toast.success(
        `Table ${table.table_number} ${nextActive ? "activated" : "deactivated"}`
      );
    } catch {
      setTables((prev) =>
        prev.map((row) =>
          row.id === table.id ? { ...row, is_active: !nextActive } : row
        )
      );
      toast.error("Could not update table");
    }
  };

  const handleDeleteTable = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/tables?id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete table.");
      toast.success(`Table ${deleteTarget.table_number} deleted`);
      setDeleteTarget(null);
      await refreshTables();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Table QR link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  const handleDownloadPng = (tableNumber: number) => {
    const canvasEl = document.getElementById(
      `qr-canvas-table-${tableNumber}`
    ) as HTMLCanvasElement | null;
    if (!canvasEl) return;

    const pngUrl = canvasEl.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = pngUrl;
    anchor.download = `table-${tableNumber}-qr.png`;
    anchor.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Tables & QR Codes
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage dine-in tables and download printable QR ordering codes for{" "}
            {RESTAURANT_CONFIG.name}.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => window.print()}
          className="min-h-10 gap-2 rounded-xl"
        >
          <Printer className="size-4" aria-hidden="true" />
          <span>Print all QR codes</span>
        </Button>
      </div>

      {/* Add Table Form */}
      <form
        onSubmit={handleAddTable}
        className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card/60 p-4 print:hidden"
      >
        <div className="space-y-1.5">
          <label htmlFor="new-table-no" className="block text-sm font-medium">
            Add Table Number
          </label>
          <Input
            id="new-table-no"
            type="number"
            min={1}
            required
            value={newTableNo}
            onChange={(e) => setNewTableNo(e.target.value)}
            placeholder="e.g., 11"
            className="h-10 w-40 rounded-xl"
          />
        </div>
        <Button
          type="submit"
          disabled={creating}
          className="min-h-10 gap-1.5 rounded-xl"
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>{creating ? "Adding..." : "Add Table"}</span>
        </Button>
      </form>

      {/* Interactive Tables & QR Grid (screen view) */}
      {tables.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground print:hidden">
          No tables created yet. Add your first table above.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:hidden">
            {tables.map((table) => {
              const qrUrl = `${origin}/?type=dine&table=${table.table_number}`;

              return (
                <Card
                  key={table.id}
                  className="flex flex-col justify-between rounded-2xl"
                >
                  <CardHeader className="flex-row items-center justify-between gap-2 border-b border-border/60 py-3">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold">
                        Table {table.table_number}
                      </CardTitle>
                      <Badge
                        variant={table.is_active ? "secondary" : "outline"}
                        className="text-[11px]"
                      >
                        {table.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <Switch
                      aria-label={`Toggle active state for Table ${table.table_number}`}
                      checked={table.is_active}
                      onCheckedChange={(checked) =>
                        void handleToggleActive(table, checked)
                      }
                    />
                  </CardHeader>

                  <CardContent className="flex flex-col items-center gap-3.5 p-4">
                    <div className="rounded-2xl bg-white p-2 ring-1 ring-border">
                      <QRCodeCanvas
                        id={`qr-canvas-table-${table.table_number}`}
                        value={qrUrl}
                        size={320}
                        level="M"
                        includeMargin
                        className="!h-[148px] !w-[148px]"
                        title={`QR code for Table ${table.table_number}`}
                      />
                    </div>

                    <p className="w-full truncate text-center font-mono text-[11px] text-muted-foreground">
                      /?type=dine&table={table.table_number}
                    </p>

                    <div className="flex w-full items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPng(table.table_number)}
                        aria-label={`Download QR as PNG for Table ${table.table_number}`}
                        className="min-h-9 flex-1 gap-1.5 rounded-xl text-xs"
                      >
                        <Download className="size-3.5" aria-hidden="true" />
                        <span>Download QR as PNG</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Copy URL for Table ${table.table_number}`}
                        onClick={() => void handleCopyUrl(qrUrl)}
                        className="size-9 shrink-0 rounded-xl"
                      >
                        <Copy className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete Table ${table.table_number}`}
                        onClick={() => setDeleteTarget(table)}
                        className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Print-friendly QR grid (hidden on screen, shown when printing) */}
          <div className="hidden print:block">
            <div className="mb-4 text-center">
              <h1 className="font-heading text-xl font-bold text-black">
                {RESTAURANT_CONFIG.name} — Dine-In Table QR Codes
              </h1>
              <p className="text-xs text-neutral-600">
                Scan the QR code to view menu &amp; place your order
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {tables.map((table) => {
                const qrUrl = `${origin}/?type=dine&table=${table.table_number}`;

                return (
                  <div
                    key={table.id}
                    className="flex break-inside-avoid flex-col items-center justify-center rounded-xl border border-neutral-300 bg-white p-4 text-center"
                  >
                    <QRCodeCanvas
                      value={qrUrl}
                      size={180}
                      level="M"
                      includeMargin
                      bgColor="#ffffff"
                      fgColor="#000000"
                      title={`Printable QR code for Table ${table.table_number}`}
                    />
                    <p className="mt-2 text-lg font-bold text-black">
                      Table {table.table_number}
                    </p>
                    <p className="text-[11px] text-neutral-600">
                      Scan to order
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Delete Table {deleteTarget?.table_number}?
            </DialogTitle>
            <DialogDescription>
              This permanently removes the table. Past orders will still remain
              in order history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDeleteTable()}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

