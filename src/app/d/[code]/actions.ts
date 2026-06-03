// src/app/d/[code]/actions.ts
"use server";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createDeliveryScan } from "@/server/services/delivery-scan.service";
import type { DeliveryScanFormValues } from "@/lib/validators/delivery-scan.validator";
import { revalidatePath } from "next/cache";

export async function createDeliveryScanAction(input: DeliveryScanFormValues) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { ok: false as const, error: "You must be logged in to log delivery scans." };
    }

    if (user.role !== "RETAIL_OPERATIONS" && user.role !== "ADMIN") {
      return { ok: false as const, error: "Unauthorized. Retail Operations or Admin access required." };
    }

    const result = await createDeliveryScan(input, user.id);

    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }

    // Revalidate relevant cache paths
    revalidatePath("/retail");
    revalidatePath("/retail/deliveries");
    revalidatePath(`/d/${input.qrCodeId}`);

    return {
      ok: true as const,
      message: "Delivery scan successfully recorded.",
      deliveryScanId: result.data.id,
    };
  } catch (error) {
    console.error("[createDeliveryScanAction] Unexpected error:", error);
    return {
      ok: false as const,
      error: "An unexpected system error occurred while processing the scan.",
    };
  }
}
