// src/app/admin/suspicious-scans/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/require-role";
import { revalidatePath } from "next/cache";

export async function toggleScanSuspicious(scanEventId: string, markSuspicious: boolean) {
  const user = await requireRole(["ADMIN"]);

  const scan = await prisma.scanEvent.findUnique({
    where: { id: scanEventId },
    select: {
      hitCount: true,
      isInternalTest: true,
      qrCode: { select: { type: true } },
    },
  });

  if (!scan) {
    throw new Error("Aggregate scan bucket not found.");
  }

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
    const isBillable =
      !scan.isInternalTest && scan.qrCode.type !== "BATCH_DELIVERY";
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
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "OVERRIDE_SUSPICIOUS_SCAN",
      entityType: "ScanEvent",
      entityId: scanEventId,
      metadata: { before: !markSuspicious, after: markSuspicious },
    }
  });

  revalidatePath("/admin/suspicious-scans");
  revalidatePath("/admin/billing");
  revalidatePath("/admin/reports");
}
