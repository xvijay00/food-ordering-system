"use client";

import * as React from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit,
  Eye,
  EyeOff,
  FolderCog,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { VegIndicator } from "@/components/customer/veg-indicator";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { compressImageToMax800 } from "@/lib/compress-image";
import { formatPrice } from "@/lib/format";
import type { Category, MenuItemWithRelations } from "@/types/database";

type EditableVariant = {
  label: string;
  price: string;
};

type EditableAddon = {
  name: string;
  price: string;
  is_active: boolean;
};

type MenuManagerProps = {
  initialCategories: Category[];
  initialItems: MenuItemWithRelations[];
};

export function MenuManager({
  initialCategories,
  initialItems,
}: MenuManagerProps) {
  const [categories, setCategories] =
    React.useState<Category[]>(initialCategories);
  const [items, setItems] =
    React.useState<MenuItemWithRelations[]>(initialItems);
  const [selectedCategoryId, setSelectedCategoryId] =
    React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Category Manager modal state
  const [catManagerOpen, setCatManagerOpen] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState("");
  const [editingCatId, setEditingCatId] = React.useState<string | null>(null);
  const [editingCatName, setEditingCatName] = React.useState("");
  const [catBusy, setCatBusy] = React.useState(false);

  // Add/Edit Item dialog state
  const [itemDialogOpen, setItemDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] =
    React.useState<MenuItemWithRelations | null>(null);
  const [itemCategoryId, setItemCategoryId] = React.useState("");
  const [itemName, setItemName] = React.useState("");
  const [itemDescription, setItemDescription] = React.useState("");
  const [itemPrice, setItemPrice] = React.useState("");
  const [itemImageUrl, setItemImageUrl] = React.useState<string | null>(null);
  const [itemIsVeg, setItemIsVeg] = React.useState(true);
  const [itemIsBestseller, setItemIsBestseller] = React.useState(false);
  const [variants, setVariants] = React.useState<EditableVariant[]>([]);
  const [addons, setAddons] = React.useState<EditableAddon[]>([]);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [savingItem, setSavingItem] = React.useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] =
    React.useState<MenuItemWithRelations | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const refreshMenu = React.useCallback(async () => {
    const res = await fetch("/api/admin/menu", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      categories?: Category[];
      items?: MenuItemWithRelations[];
    };
    if (data.categories) setCategories(data.categories);
    if (data.items) setItems(data.items);
  }, []);

  const groupedSections = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return categories
      .filter(
        (cat) => selectedCategoryId === "all" || cat.id === selectedCategoryId
      )
      .map((category) => {
        const categoryItems = items.filter((item) => {
          if (item.category_id !== category.id) return false;
          if (query && !item.name.toLowerCase().includes(query)) return false;
          return true;
        });

        return { category, items: categoryItems };
      })
      .filter((section) => {
        if (selectedCategoryId !== "all") return true;
        if (searchQuery.trim().length > 0) return section.items.length > 0;
        return true;
      });
  }, [categories, items, searchQuery, selectedCategoryId]);

  // Category Manager Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim().length < 2) {
      toast.error("Category name must be at least 2 characters.");
      return;
    }

    setCatBusy(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          is_active: true,
        }),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Failed to add category.");
      setNewCatName("");
      toast.success("Category added");
      await refreshMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add category.");
    } finally {
      setCatBusy(false);
    }
  };

  const handleSaveCategoryRename = async (categoryId: string) => {
    if (editingCatName.trim().length < 2) {
      toast.error("Category name must be at least 2 characters.");
      return;
    }

    setCatBusy(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoryId, name: editingCatName.trim() }),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Rename failed.");
      setEditingCatId(null);
      toast.success("Category renamed");
      await refreshMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rename failed.");
    } finally {
      setCatBusy(false);
    }
  };

  const handleToggleCategoryHidden = async (cat: Category) => {
    setCatBusy(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, is_active: !cat.is_active }),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Update failed.");
      toast.success(
        cat.is_active ? `${cat.name} hidden` : `${cat.name} visible`
      );
      await refreshMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setCatBusy(false);
    }
  };

  const handleMoveCategory = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setCategories(reordered);

    setCatBusy(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
      });
      if (!res.ok) throw new Error("Failed to reorder categories.");
      toast.success("Category order updated");
      await refreshMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reorder failed.");
      await refreshMenu();
    } finally {
      setCatBusy(false);
    }
  };

  // Item Dialog Handlers
  const openNewItem = () => {
    setEditingItem(null);
    setItemCategoryId(
      selectedCategoryId !== "all"
        ? selectedCategoryId
        : (categories[0]?.id ?? "")
    );
    setItemName("");
    setItemDescription("");
    setItemPrice("");
    setItemImageUrl(null);
    setItemIsVeg(true);
    setItemIsBestseller(false);
    setVariants([]);
    setAddons([]);
    setItemDialogOpen(true);
  };

  const openEditItem = (item: MenuItemWithRelations) => {
    setEditingItem(item);
    setItemCategoryId(item.category_id);
    setItemName(item.name);
    setItemDescription(item.description ?? "");
    setItemPrice(String(item.price));
    setItemImageUrl(item.image_url);
    setItemIsVeg(item.is_veg);
    setItemIsBestseller(item.is_bestseller);
    setVariants(
      (item.item_variants ?? []).map((v) => ({
        label: v.label,
        price: String(v.price),
      }))
    );
    setAddons(
      (item.item_addons ?? []).map((a) => ({
        name: a.name,
        price: String(a.price),
        is_active: a.is_active,
      }))
    );
    setItemDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const compressed = await compressImageToMax800(file);
      const formData = new FormData();
      formData.append("file", compressed);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !result.url) {
        throw new Error(result.error ?? "Upload failed.");
      }

      setItemImageUrl(result.url);
      toast.success("Image compressed (<= 800px) & uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(itemPrice);

    if (!itemCategoryId) {
      toast.error("Please choose a category.");
      return;
    }
    if (itemName.trim().length < 2) {
      toast.error("Item name must be at least 2 characters.");
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      toast.error("Please enter a valid price.");
      return;
    }

    const cleanedVariants = variants
      .filter((v) => v.label.trim().length > 0)
      .map((v) => ({
        label: v.label.trim(),
        price: Math.max(0, Number(v.price) || 0),
      }));

    const cleanedAddons = addons
      .filter((a) => a.name.trim().length > 0)
      .map((a) => ({
        name: a.name.trim(),
        price: Math.max(0, Number(a.price) || 0),
        is_active: a.is_active,
      }));

    setSavingItem(true);
    try {
      const payload = {
        ...(editingItem ? { id: editingItem.id } : {}),
        category_id: itemCategoryId,
        name: itemName.trim(),
        description: itemDescription.trim() || null,
        price: numericPrice,
        image_url: itemImageUrl,
        is_veg: itemIsVeg,
        is_bestseller: itemIsBestseller,
        variants: cleanedVariants,
        addons: cleanedAddons,
      };

      const res = await fetch("/api/admin/menu", {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Failed to save item.");

      toast.success(editingItem ? "Item updated" : "Item added");
      setItemDialogOpen(false);
      await refreshMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSavingItem(false);
    }
  };

  const handleToggleAvailability = async (
    item: MenuItemWithRelations,
    nextAvailable: boolean
  ) => {
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, is_available: nextAvailable } : row
      )
    );

    try {
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_available: nextAvailable }),
      });
      if (!res.ok) throw new Error("Update failed.");
      toast.success(
        `${item.name} is now ${nextAvailable ? "available" : "unavailable"}`
      );
    } catch {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, is_available: !nextAvailable }
            : row
        )
      );
      toast.error("Could not update availability");
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/menu?id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      );
      const result = (await res.json()) as {
        error?: string;
        markedUnavailable?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(result.error ?? "Failed to delete item.");

      if (result.markedUnavailable) {
        toast.info(result.message);
      } else {
        toast.success(result.message ?? `Deleted ${deleteTarget.name}`);
      }

      setDeleteTarget(null);
      await refreshMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Menu Management
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length} items across {categories.length} categories
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCatManagerOpen(true)}
            className="min-h-10 gap-2 rounded-xl"
          >
            <FolderCog className="size-4" aria-hidden="true" />
            <span>Manage Categories</span>
          </Button>
          <Button
            type="button"
            onClick={openNewItem}
            disabled={categories.length === 0}
            className="min-h-10 gap-2 rounded-xl"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Add item</span>
          </Button>
        </div>
      </div>

      {/* Top Search & Category Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items..."
            aria-label="Search menu items"
            className="h-10 rounded-xl pl-9"
          />
        </div>

        <div className="w-full sm:w-56">
          <Select
            value={selectedCategoryId}
            onValueChange={setSelectedCategoryId}
          >
            <SelectTrigger
              aria-label="Filter by category"
              className="w-full rounded-xl data-[size=default]:h-10"
            >
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                  {!cat.is_active ? " (Hidden)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grouped Items by Category */}
      {groupedSections.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No menu items match your search or filter.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedSections.map(({ category, items: sectionItems }) => (
            <Card key={category.id} className="rounded-2xl">
              <CardHeader className="flex-row items-center justify-between gap-2 border-b border-border/60 py-3.5">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold">
                    {category.name}
                  </CardTitle>
                  {!category.is_active && (
                    <Badge variant="outline" className="text-xs">
                      Hidden
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {sectionItems.length}{" "}
                  {sectionItems.length === 1 ? "item" : "items"}
                </Badge>
              </CardHeader>

              <CardContent className="p-3 sm:p-0">
                {sectionItems.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    No items in this category yet.
                  </p>
                ) : (
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label={`${category.name} items`}
                    className="admin-table-wrapper"
                  >
                    <table className="admin-responsive-table w-full text-left text-sm">
                      <caption className="sr-only">
                        {category.name} menu items
                      </caption>
                      <thead className="sticky top-0 z-10 border-b border-border/60 bg-muted/50 text-xs text-muted-foreground uppercase">
                        <tr>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Item
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Diet
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Price
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Available
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-right font-semibold"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {sectionItems.map((item) => {
                          const variantsCount =
                            item.item_variants?.length ?? 0;
                          const addonsCount = item.item_addons?.length ?? 0;

                          return (
                            <tr
                              key={item.id}
                              className="transition-colors hover:bg-muted/30"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted/60 ring-1 ring-border/50">
                                    {item.image_url ? (
                                      <Image
                                        src={item.image_url}
                                        alt={item.name}
                                        fill
                                        sizes="48px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div
                                        aria-hidden="true"
                                        className="flex size-full items-center justify-center text-muted-foreground/50"
                                      >
                                        <UtensilsCrossed className="size-5" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-semibold text-foreground">
                                        {item.name}
                                      </span>
                                      {item.is_bestseller && (
                                        <Badge
                                          variant="secondary"
                                          className="gap-1 bg-amber-500/15 text-[10px] text-amber-700 dark:text-amber-300"
                                        >
                                          <Sparkles
                                            className="size-2.5"
                                            aria-hidden="true"
                                          />
                                          Bestseller
                                        </Badge>
                                      )}
                                    </div>
                                    {(variantsCount > 0 || addonsCount > 0) && (
                                      <p className="text-xs text-muted-foreground">
                                        {variantsCount} variants · {addonsCount}{" "}
                                        add-ons
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td data-label="Diet" className="px-4 py-3">
                                <div className="inline-flex items-center gap-1.5">
                                  <VegIndicator isVeg={item.is_veg} />
                                  <span className="text-xs text-muted-foreground">
                                    {item.is_veg ? "Veg" : "Non-veg"}
                                  </span>
                                </div>
                              </td>

                              <td
                                data-label="Price"
                                className="px-4 py-3 font-semibold tabular-nums"
                              >
                                {formatPrice(Number(item.price))}
                              </td>

                              <td data-label="Available" className="px-4 py-3">
                                <Switch
                                  aria-label={`Toggle availability for ${item.name}`}
                                  checked={item.is_available}
                                  onCheckedChange={(checked) =>
                                    void handleToggleAvailability(item, checked)
                                  }
                                />
                              </td>

                              <td
                                data-label="Actions"
                                className="px-4 py-3 text-right"
                              >
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditItem(item)}
                                    className="min-h-8 gap-1 rounded-lg px-2.5 text-xs"
                                  >
                                    <Edit
                                      className="size-3.5"
                                      aria-hidden="true"
                                    />
                                    <span>Edit</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Delete ${item.name}`}
                                    onClick={() => setDeleteTarget(item)}
                                    className="size-8 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Manager Dialog */}
      <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Category Manager</DialogTitle>
            <DialogDescription>
              Add, rename, reorder, or hide categories from the customer menu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCategory} className="flex gap-2">
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="New category name..."
              aria-label="New category name"
              className="h-10 rounded-xl"
            />
            <Button
              type="submit"
              disabled={catBusy}
              className="min-h-10 shrink-0 rounded-xl"
            >
              Add
            </Button>
          </form>

          <ul className="divide-y divide-border/60 rounded-xl border">
            {categories.map((cat, index) => (
              <li
                key={cat.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3"
              >
                {editingCatId === cat.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      aria-label="Edit category name"
                      className="h-9 rounded-lg"
                    />
                    <Button
                      type="button"
                      size="icon"
                      aria-label="Save category name"
                      disabled={catBusy}
                      onClick={() => void handleSaveCategoryRename(cat.id)}
                      className="size-9 shrink-0"
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Cancel rename"
                      onClick={() => setEditingCatId(null)}
                      className="size-9 shrink-0"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          !cat.is_active
                            ? "text-muted-foreground line-through"
                            : ""
                        }`}
                      >
                        {cat.name}
                      </span>
                      {!cat.is_active && (
                        <Badge variant="outline" className="text-[10px]">
                          Hidden
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Move ${cat.name} up`}
                        disabled={catBusy || index === 0}
                        onClick={() => void handleMoveCategory(index, -1)}
                        className="size-8"
                      >
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Move ${cat.name} down`}
                        disabled={catBusy || index === categories.length - 1}
                        onClick={() => void handleMoveCategory(index, 1)}
                        className="size-8"
                      >
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Rename ${cat.name}`}
                        disabled={catBusy}
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditingCatName(cat.name);
                        }}
                        className="size-8"
                      >
                        <Edit className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={
                          cat.is_active
                            ? `Hide ${cat.name}`
                            : `Show ${cat.name}`
                        }
                        disabled={catBusy}
                        onClick={() => void handleToggleCategoryHidden(cat)}
                        className="size-8"
                      >
                        {cat.is_active ? (
                          <Eye className="size-4" aria-hidden="true" />
                        ) : (
                          <EyeOff className="size-4 text-muted-foreground" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit item" : "Add item"}
            </DialogTitle>
            <DialogDescription>
              Configure dish details, upload an image (resized to max 800px), and
              manage variants or add-ons.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="dish-name" className="block text-sm font-medium">
                  Name <span aria-hidden="true">*</span>
                </label>
                <Input
                  id="dish-name"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Paneer Tikka"
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="dish-category"
                  className="block text-sm font-medium"
                >
                  Category <span aria-hidden="true">*</span>
                </label>
                <Select value={itemCategoryId} onValueChange={setItemCategoryId}>
                  <SelectTrigger
                    id="dish-category"
                    className="w-full rounded-xl data-[size=default]:h-10"
                  >
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="dish-price" className="block text-sm font-medium">
                  Price (₹) <span aria-hidden="true">*</span>
                </label>
                <Input
                  id="dish-price"
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="260"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dish-desc" className="block text-sm font-medium">
                Description
              </label>
              <Textarea
                id="dish-desc"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="Short dish description..."
                className="min-h-18 rounded-xl"
              />
            </div>

            {/* Image Upload with Client-Side Max 800px Compression */}
            <div className="space-y-2">
              <label htmlFor="dish-image" className="block text-sm font-medium">
                Image (uploaded to menu-images, max 800px)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {itemImageUrl && (
                  <div className="relative size-18 overflow-hidden rounded-xl ring-1 ring-border">
                    <Image
                      src={itemImageUrl}
                      alt="Dish preview"
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => setItemImageUrl(null)}
                      className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                )}

                <label
                  htmlFor="dish-image"
                  className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-input px-3.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  {uploadingImage ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="size-4" aria-hidden="true" />
                  )}
                  <span>
                    {uploadingImage ? "Compressing & uploading..." : "Upload Image"}
                  </span>
                  <input
                    id="dish-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={uploadingImage}
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Veg & Bestseller Flags */}
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                htmlFor="dish-veg"
                className="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs font-medium"
              >
                <span>Vegetarian</span>
                <Switch
                  id="dish-veg"
                  checked={itemIsVeg}
                  onCheckedChange={setItemIsVeg}
                />
              </label>
              <label
                htmlFor="dish-bestseller"
                className="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs font-medium"
              >
                <span>Bestseller</span>
                <Switch
                  id="dish-bestseller"
                  checked={itemIsBestseller}
                  onCheckedChange={setItemIsBestseller}
                />
              </label>
            </div>

            {/* Variants */}
            <div className="space-y-2 rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Variants (Label + Price)
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setVariants((prev) => [...prev, { label: "", price: "" }])
                  }
                  className="h-7 gap-1 text-xs"
                >
                  <Plus className="size-3" aria-hidden="true" />
                  <span>Add row</span>
                </Button>
              </div>
              {variants.map((variant, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={variant.label}
                    onChange={(e) =>
                      setVariants((prev) =>
                        prev.map((v, i) =>
                          i === idx ? { ...v, label: e.target.value } : v
                        )
                      )
                    }
                    placeholder="Label (e.g., Half)"
                    aria-label={`Variant ${idx + 1} label`}
                    className="h-9 rounded-lg"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={variant.price}
                    onChange={(e) =>
                      setVariants((prev) =>
                        prev.map((v, i) =>
                          i === idx ? { ...v, price: e.target.value } : v
                        )
                      )
                    }
                    placeholder="Price"
                    aria-label={`Variant ${idx + 1} price`}
                    className="h-9 w-28 rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove variant ${idx + 1}`}
                    onClick={() =>
                      setVariants((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="size-9 shrink-0"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add-ons */}
            <div className="space-y-2 rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Add-ons (Name + Price)
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setAddons((prev) => [
                      ...prev,
                      { name: "", price: "0", is_active: true },
                    ])
                  }
                  className="h-7 gap-1 text-xs"
                >
                  <Plus className="size-3" aria-hidden="true" />
                  <span>Add row</span>
                </Button>
              </div>
              {addons.map((addon, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={addon.name}
                    onChange={(e) =>
                      setAddons((prev) =>
                        prev.map((a, i) =>
                          i === idx ? { ...a, name: e.target.value } : a
                        )
                      )
                    }
                    placeholder="Name (e.g., Extra Cheese)"
                    aria-label={`Add-on ${idx + 1} name`}
                    className="h-9 rounded-lg"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={addon.price}
                    onChange={(e) =>
                      setAddons((prev) =>
                        prev.map((a, i) =>
                          i === idx ? { ...a, price: e.target.value } : a
                        )
                      )
                    }
                    placeholder="Price"
                    aria-label={`Add-on ${idx + 1} price`}
                    className="h-9 w-28 rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove add-on ${idx + 1}`}
                    onClick={() =>
                      setAddons((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="size-9 shrink-0"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setItemDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingItem || uploadingImage}>
                {savingItem
                  ? "Saving..."
                  : editingItem
                    ? "Save changes"
                    : "Add item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              If this item has past orders, it will be marked unavailable instead
              of deleted to keep historical order records intact.
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
              onClick={() => void handleDeleteItem()}
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
