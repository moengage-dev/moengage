// src/app/admin/brands/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createBrand,
  updateBrand,
  archiveBrand,
} from "@/server/services/brands.service";
import type { BrandFormValues } from "@/lib/validators/brand.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createBrandAction(
  input: BrandFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await createBrand(input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/brands");
    return { ok: true, message: "Brand created successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateBrandAction(
  id: string,
  input: BrandFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await updateBrand(id, input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/brands");
    return { ok: true, message: "Brand updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function archiveBrandAction(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    await archiveBrand(id);
    revalidatePath("/admin/brands");
    return { ok: true, message: "Brand archived." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}
