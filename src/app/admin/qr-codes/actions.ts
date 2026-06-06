// src/app/admin/qr-codes/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createQRCode,
  updateQRCode,
  disableQRCode,
} from "@/server/services/qr-codes.service";
import type { QRCodeFormValues } from "@/lib/validators/qr-code.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createQRCodeAction(
  input: QRCodeFormValues
): Promise<ActionResult> {
  try {
    const user = await requireRole(["ADMIN"]);
    const result = await createQRCode(input, user);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/qr-codes");
    return { ok: true, message: "QR Code created successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateQRCodeAction(
  id: string,
  input: QRCodeFormValues
): Promise<ActionResult> {
  try {
    const user = await requireRole(["ADMIN"]);
    const result = await updateQRCode(id, input, user);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/qr-codes");
    return { ok: true, message: "QR Code updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function disableQRCodeAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["ADMIN"]);
    const result = await disableQRCode(id, user);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/qr-codes");
    return { ok: true, message: "QR Code disabled." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}
