"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  assignCampaignManager,
  unassignCampaignManager,
} from "@/server/services/campaigns.service";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function assignCampaignManagerAction(
  campaignId: string,
  managerId: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "BRAND_ADMIN" && user.role !== "ADMIN")) {
    return { ok: false, error: "Unauthorized" };
  }
  return assignCampaignManager(campaignId, managerId, user);
}

export async function unassignCampaignManagerAction(
  campaignId: string,
  managerId: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "BRAND_ADMIN" && user.role !== "ADMIN")) {
    return { ok: false, error: "Unauthorized" };
  }
  return unassignCampaignManager(campaignId, managerId, user);
}
