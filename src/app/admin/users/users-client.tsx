// src/app/admin/users/users-client.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Plus, Pencil, UserX, UserCheck, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserForm } from "@/components/forms/user-form";
import {
  createUserAction,
  updateUserAction,
  deactivateUserAction,
  activateUserAction,
} from "@/app/admin/users/actions";
import type {
  UserRow,
  BrandOption,
  AdvertiserOption,
} from "@/server/services/users.service";
import { formatDate, formatStatusLabel, formatNumber } from "@/lib/format";

type Props = {
  users: UserRow[];
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  inactiveUsers: number;
};

function roleVariant(
  role: string
): "default" | "secondary" | "destructive" | "outline" {
  if (role === "ADMIN") return "destructive";
  if (role === "BRAND_ADMIN") return "default";
  return "secondary";
}

export function UsersClient({
  users,
  brands,
  advertisers,
  totalUsers,
  activeUsers,
  verifiedUsers,
  inactiveUsers,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      if (!matchesRole) return false;
      if (!q) return true;
      return (
        (u.name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.brandName ?? "").toLowerCase().includes(q) ||
        (u.advertiserName ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, roleFilter]);

  function openCreate() {
    setEditingUser(undefined);
    setSheetOpen(true);
  }

  function openEdit(user: UserRow) {
    setEditingUser(user);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
  }

  async function handleDeactivate(user: UserRow) {
    const result = await deactivateUserAction(user.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  async function handleActivate(user: UserRow) {
    const result = await activateUserAction(user.id);
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  const hasActiveFilters = searchQuery !== "" || roleFilter !== "ALL";

  function clearFilters() {
    setSearchQuery("");
    setRoleFilter("ALL");
  }

  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-primary">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Total Users</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(totalUsers)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-teal">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Active</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(activeUsers)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-brand-yellow">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Verified</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(verifiedUsers)}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-muted-foreground/40">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Inactive</span>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">{formatNumber(inactiveUsers)}</div>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, email, brand, or advertiser…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search users"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[200px]" aria-label="Filter by role">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="BRAND_ADMIN">Brand Admin</SelectItem>
            <SelectItem value="CAMPAIGN_MANAGER">Campaign Manager</SelectItem>
            <SelectItem value="ADVERTISER_VIEWER">Advertiser Viewer</SelectItem>
            <SelectItem value="RETAIL_OPERATIONS">Retail Operations</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Advertiser</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {hasActiveFilters
                    ? "No users match your search or filter."
                    : "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleVariant(user.role)}>
                      {formatStatusLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.brandName ?? "—"}</TableCell>
                  <TableCell>{user.advertiserName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isEmailVerified ? "default" : "secondary"}>
                      {user.isEmailVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit user"
                              onClick={() => openEdit(user)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Edit user</TooltipContent>
                        </Tooltip>

                        {user.isActive ? (
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Deactivate user"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <UserX className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top">Deactivate user</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate user?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will prevent <strong>{user.name ?? user.email}</strong> from
                                  logging in. No data will be deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeactivate(user)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Deactivate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Activate user"
                                onClick={() => handleActivate(user)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Activate user</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingUser ? "Edit User" : "Add User"}</SheetTitle>
            <SheetDescription>
              {editingUser
                ? "Update user details below."
                : "Fill in the details to create a new user."}
            </SheetDescription>
          </SheetHeader>
          {editingUser ? (
            <UserForm
              key={editingUser.id}
              mode="edit"
              initialData={editingUser}
              brands={brands}
              advertisers={advertisers}
              onSubmitAction={(values) => updateUserAction(editingUser.id, values)}
              onSuccess={handleSheetSuccess}
            />
          ) : (
            <UserForm
              key="create"
              mode="create"
              brands={brands}
              advertisers={advertisers}
              onSubmitAction={createUserAction}
              onSuccess={handleSheetSuccess}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
