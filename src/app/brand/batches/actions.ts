"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createBatch,
  updateBatch,
  closeBatch,
} from "@/server/services/batches.service";
import type { BatchFormValues } from "@/lib/validators/batch.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createBatchAction(
  input: BatchFormValues
): Promise<ActionResult> {
  try {
    const user = await requireRole(["BRAND_ADMIN"]);
    const result = await createBatch(input, user);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/brand/batches");
    return { ok: true, message: "Batch created successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateBatchAction(
  id: string,
  input: BatchFormValues
): Promise<ActionResult> {
  try {
    const user = await requireRole(["BRAND_ADMIN"]);
    const result = await updateBatch(id, input, user);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/brand/batches");
    return { ok: true, message: "Batch updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function closeBatchAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["BRAND_ADMIN"]);
    await closeBatch(id, user);
    revalidatePath("/brand/batches");
    return { ok: true, message: "Batch closed." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}
