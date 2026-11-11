"use client";

import * as React from "react";
import { Edit, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import type { StaffMemberRow } from "@/app/api/admin/staff/route";
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
import type { StaffRole } from "@/types/database";

export function StaffManager({
  initialStaff,
  currentUserId,
}: {
  initialStaff: StaffMemberRow[];
  currentUserId: string;
}) {
  const [staffList, setStaffList] =
    React.useState<StaffMemberRow[]>(initialStaff);

  const [addOpen, setAddOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newRole, setNewRole] = React.useState<StaffRole>("kitchen");
  const [creating, setCreating] = React.useState(false);

  const [editTarget, setEditTarget] = React.useState<StaffMemberRow | null>(
    null
  );
  const [editName, setEditName] = React.useState("");
  const [editRole, setEditRole] = React.useState<StaffRole>("kitchen");
  const [savingEdit, setSavingEdit] = React.useState(false);

  const [deleteTarget, setDeleteTarget] =
    React.useState<StaffMemberRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const refreshStaff = React.useCallback(async () => {
    const res = await fetch("/api/admin/staff", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { staff?: StaffMemberRow[] };
    if (data.staff) setStaffList(data.staff);
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Failed to create staff.");

      toast.success(`Added ${newName.trim()} (${newRole})`);
      setAddOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("kitchen");
      await refreshStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed.");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSavingEdit(true);

    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          name: editName.trim(),
          role: editRole,
        }),
      });
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Update failed.");

      toast.success("Staff profile updated");
      setEditTarget(null);
      await refreshStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(
        `/api/admin/staff?id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      );
      const result = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Delete failed.");

      toast.success(`Removed ${deleteTarget.name}`);
      setDeleteTarget(null);
      await refreshStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Staff Accounts
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage admin, kitchen, and delivery team access.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setAddOpen(true)}
          className="min-h-10 gap-2 rounded-xl"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          <span>Add Staff</span>
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="border-b border-border/60 py-3.5">
          <CardTitle className="text-base">
            Team Members ({staffList.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-0">
          {staffList.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No staff profiles found.
            </p>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-label="Staff members table"
              className="admin-table-wrapper"
            >
              <table className="admin-responsive-table w-full text-left text-sm">
                <caption className="sr-only">Staff accounts</caption>
                <thead className="sticky top-0 z-10 border-b border-border/60 bg-muted/50 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Role
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
                  {staffList.map((member) => {
                    const isSelf = member.id === currentUserId;
                    return (
                      <tr key={member.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold">
                          <div className="flex items-center gap-2">
                            <span>{member.name}</span>
                            {isSelf && (
                              <Badge variant="outline" className="text-[10px]">
                                You
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td data-label="Email" className="px-4 py-3 text-muted-foreground">
                          {member.email ?? "—"}
                        </td>
                        <td data-label="Role" className="px-4 py-3">
                          <Badge
                            variant={
                              member.role === "admin" ? "default" : "secondary"
                            }
                            className="gap-1 capitalize"
                          >
                            {member.role === "admin" && (
                              <ShieldCheck
                                className="size-3"
                                aria-hidden="true"
                              />
                            )}
                            <span>{member.role}</span>
                          </Badge>
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
                              onClick={() => {
                                setEditTarget(member);
                                setEditName(member.name);
                                setEditRole(member.role);
                              }}
                              className="min-h-8 gap-1 rounded-lg px-2.5 text-xs"
                            >
                              <Edit className="size-3.5" aria-hidden="true" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={isSelf}
                              aria-label={`Remove ${member.name}`}
                              onClick={() => setDeleteTarget(member)}
                              className="size-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
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

      {/* Add Staff Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Creates a confirmed Supabase Auth user and assigns their staff
              role.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-staff-name" className="block text-sm font-medium">
                Full Name <span aria-hidden="true">*</span>
              </label>
              <Input
                id="new-staff-name"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Arjun Mehta"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-staff-email"
                className="block text-sm font-medium"
              >
                Email <span aria-hidden="true">*</span>
              </label>
              <Input
                id="new-staff-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="kitchen@restaurant.com"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="new-staff-password"
                className="block text-sm font-medium"
              >
                Password <span aria-hidden="true">*</span>
              </label>
              <Input
                id="new-staff-password"
                type="password"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-staff-role" className="block text-sm font-medium">
                Role <span aria-hidden="true">*</span>
              </label>
              <Select
                value={newRole}
                onValueChange={(v) => setNewRole(v as StaffRole)}
              >
                <SelectTrigger
                  id="new-staff-role"
                  className="w-full rounded-xl data-[size=default]:h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="gap-1.5">
                <Plus className="size-4" aria-hidden="true" />
                <span>{creating ? "Creating..." : "Create Staff"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff display name or role permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-staff-name" className="block text-sm font-medium">
                Name <span aria-hidden="true">*</span>
              </label>
              <Input
                id="edit-staff-name"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-staff-role" className="block text-sm font-medium">
                Role
              </label>
              <Select
                value={editRole}
                disabled={editTarget?.id === currentUserId}
                onValueChange={(v) => setEditRole(v as StaffRole)}
              >
                <SelectTrigger
                  id="edit-staff-role"
                  className="w-full rounded-xl data-[size=default]:h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Staff Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes their staff login account and revokes
              panel access.
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
              onClick={() => void handleDeleteStaff()}
            >
              {deleting ? "Removing..." : "Remove Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

