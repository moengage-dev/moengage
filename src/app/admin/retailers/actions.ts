// src/app/admin/retailers/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createRetailer,
  updateRetailer,
} from "@/server/services/retailers.service";
import type { RetailerFormValues } from "@/server/services/retailers.service";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

export async function createRetailerAction(input: RetailerFormValues): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await createRetailer(input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/retailers");
    return { ok: true, message: "Retailer created successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateRetailerAction(id: string, input: RetailerFormValues): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await updateRetailer(id, input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/retailers");
    return { ok: true, message: "Retailer updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}
