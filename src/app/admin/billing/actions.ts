"use server";

import { requireRole } from "@/lib/auth/require-role";
import { 
  generateCampaignBillingSummary, 
  regenerateAllCampaignBillingSummaries 
} from "@/server/services/billing.service";
import { revalidatePath } from "next/cache";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function generateCampaignBillingSummaryAction(campaignId: string) {
  try {
    const user = await requireRole(["ADMIN"]);
    await generateCampaignBillingSummary(campaignId, user.id);
    
    revalidatePath("/admin/billing");
    revalidatePath("/brand/billing");
    revalidatePath("/advertiser/billing");
    revalidatePath("/admin/reports");
    
    return { ok: true, message: "Billing summary generated successfully." };
  } catch (error: unknown) {
    console.error("[GENERATE_BILLING_SUMMARY_ACTION]", error);
    return {
      ok: false,
      error: getErrorMessage(error, "Failed to generate billing summary."),
    };
  }
}

export async function regenerateAllBillingSummariesAction() {
  try {
    const user = await requireRole(["ADMIN"]);
    await regenerateAllCampaignBillingSummaries(user.id);
    
    revalidatePath("/admin/billing");
    revalidatePath("/brand/billing");
    revalidatePath("/advertiser/billing");
    revalidatePath("/admin/reports");
    
    return { ok: true, message: "All billing summaries regenerated successfully." };
  } catch (error: unknown) {
    console.error("[REGENERATE_ALL_BILLING_SUMMARIES_ACTION]", error);
    return {
      ok: false,
      error: getErrorMessage(error, "Failed to regenerate billing summaries."),
    };
  }
}
