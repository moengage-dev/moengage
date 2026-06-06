"use server";

import { requireRole } from "@/lib/auth/require-role";
import { 
  generateCampaignBillingSummary, 
  regenerateAllCampaignBillingSummaries 
} from "@/server/services/billing.service";
import { revalidatePath } from "next/cache";

export async function generateCampaignBillingSummaryAction(campaignId: string) {
  try {
    const user = await requireRole(["ADMIN"]);
    await generateCampaignBillingSummary(campaignId, user.id);
    
    revalidatePath("/admin/billing");
    revalidatePath("/brand/billing");
    revalidatePath("/advertiser/billing");
    revalidatePath("/admin/reports");
    
    return { ok: true, message: "Billing summary generated successfully." };
  } catch (error: any) {
    console.error("[GENERATE_BILLING_SUMMARY_ACTION]", error);
    return { ok: false, error: error.message || "Failed to generate billing summary." };
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
  } catch (error: any) {
    console.error("[REGENERATE_ALL_BILLING_SUMMARIES_ACTION]", error);
    return { ok: false, error: error.message || "Failed to regenerate billing summaries." };
  }
}
