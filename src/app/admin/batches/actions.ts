// src/app/admin/batches/actions.ts
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
    await requireRole(["ADMIN"]);
    const result = await createBatch(input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/batches");
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
    await requireRole(["ADMIN"]);
    const result = await updateBatch(id, input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/batches");
    return { ok: true, message: "Batch updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function closeBatchAction(id: string): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    await closeBatch(id);
    revalidatePath("/admin/batches");
    return { ok: true, message: "Batch closed." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}
