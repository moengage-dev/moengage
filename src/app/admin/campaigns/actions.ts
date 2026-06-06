// src/app/admin/campaigns/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createCampaign,
  updateCampaign,
  archiveCampaign,
} from "@/server/services/campaigns.service";
import type { CampaignFormValues } from "@/lib/validators/campaign.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createCampaignAction(
  input: CampaignFormValues
): Promise<ActionResult> {
  try {
    const user = await requireRole(["ADMIN"]);
    const result = await createCampaign(input, user);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/campaigns");
    return { ok: true, message: "Campaign created successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateCampaignAction(
  id: string,
  input: CampaignFormValues
): Promise<ActionResult> {
  try {
    const user = await requireRole(["ADMIN"]);
    const result = await updateCampaign(id, input, user);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/campaigns");
    return { ok: true, message: "Campaign updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function archiveCampaignAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["ADMIN"]);
    await archiveCampaign(id, user);
    revalidatePath("/admin/campaigns");
    return { ok: true, message: "Campaign archived." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}
