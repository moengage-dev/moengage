// src/app/admin/users/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  createUnassignedUser,
  type UserRow,
} from "@/server/services/users.service";
import type { CreateUserFormValues, UpdateUserFormValues } from "@/lib/validators/user.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createUserAction(
  input: CreateUserFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await createUser(input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/users");
    return { ok: true, message: "User created successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateUserAction(
  id: string,
  input: UpdateUserFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await updateUser(id, input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/users");
    return { ok: true, message: "User updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function deactivateUserAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["ADMIN"]);
    const result = await deactivateUser(id, user.id);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/users");
    return { ok: true, message: "User deactivated." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function activateUserAction(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await activateUser(id);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/users");
    return { ok: true, message: "User activated." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function createUnassignedUserAction(input: {
  name: string;
  email: string;
  password: string;
  role: "BRAND_ADMIN" | "CAMPAIGN_MANAGER" | "ADVERTISER_VIEWER";
}): Promise<ActionResult & { user?: UserRow }> {
  try {
    await requireRole(["ADMIN"]);
    const result = await createUnassignedUser(input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/users");
    revalidatePath("/admin/brands");
    revalidatePath("/admin/advertisers");
    return { ok: true, message: "User created successfully.", user: result.data };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}
