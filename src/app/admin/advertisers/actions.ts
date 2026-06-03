// src/app/admin/advertisers/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createAdvertiser,
  updateAdvertiser,
  archiveAdvertiser,
} from "@/server/services/advertisers.service";
import type { AdvertiserFormValues } from "@/lib/validators/advertiser.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createAdvertiserAction(
  input: AdvertiserFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await createAdvertiser(input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/advertisers");
    return { ok: true, message: "Advertiser created successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateAdvertiserAction(
  id: string,
  input: AdvertiserFormValues
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    const result = await updateAdvertiser(id, input);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/advertisers");
    return { ok: true, message: "Advertiser updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function archiveAdvertiserAction(
  id: string
): Promise<ActionResult> {
  try {
    await requireRole(["ADMIN"]);
    await archiveAdvertiser(id);
    revalidatePath("/admin/advertisers");
    return { ok: true, message: "Advertiser archived." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}
