// src/app/admin/users/users-client.tsx
"use client";

import React, { useState } from "react";
import { Plus, Pencil, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [editingUser, setEditingUser] = useState<UserRow | undefined>(
    undefined
  );

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

  return (
    <>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalUsers)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeUsers)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(verifiedUsers)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(inactiveUsers)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
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
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.email}
                  </TableCell>
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
                    <Badge
                      variant={user.isEmailVerified ? "default" : "secondary"}
                    >
                      {user.isEmailVerified ? "Verified" : "Unverified"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(user)}
                        title="Edit user"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>

                      {user.isActive ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Deactivate user"
                            >
                              <UserX className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="sr-only">Deactivate</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Deactivate user?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will prevent{" "}
                                <strong>{user.name ?? user.email}</strong> from
                                logging in. No data will be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeactivate(user)}
                              >
                                Deactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Activate user"
                          onClick={() => handleActivate(user)}
                        >
                          <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="sr-only">Activate</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="overflow-y-auto w-full sm:max-w-lg"
        >
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
              onSubmitAction={(values) =>
                updateUserAction(editingUser.id, values)
              }
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
