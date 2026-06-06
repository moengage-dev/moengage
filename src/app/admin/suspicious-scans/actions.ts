// src/app/admin/suspicious-scans/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { revalidatePath } from "next/cache";

export async function toggleScanSuspicious(scanEventId: string, markSuspicious: boolean) {
  await requireRole(["ADMIN"]);

  const scan = await prisma.scanEvent.findUnique({
    where: { id: scanEventId },
    select: { hitCount: true, isInternalTest: true },
  });

  if (!scan) return;

  if (markSuspicious) {
    await prisma.scanEvent.update({
      where: { id: scanEventId },
      data: {
        isSuspicious: true,
        suspiciousReason: "MANUALLY_FLAGGED",
        isBillable: false,
        suspiciousCount: scan.hitCount,
        billableCount: 0,
      },
    });
  } else {
    const isBillable = !scan.isInternalTest;
    await prisma.scanEvent.update({
      where: { id: scanEventId },
      data: {
        isSuspicious: false,
        suspiciousReason: null,
        isBillable,
        suspiciousCount: 0,
        billableCount: isBillable ? scan.hitCount : 0,
      },
    });
  }

  revalidatePath("/admin/suspicious-scans");
  revalidatePath("/admin/billing");
  revalidatePath("/admin/reports");
}
