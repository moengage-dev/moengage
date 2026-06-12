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
      isSuspicious: true,
      isBillable: true,
      suspiciousCount: true,
      billableCount: true,
      suspiciousReason: true,
      qrCode: { select: { type: true } },
    },
  });

  if (!scan) {
    throw new Error("Aggregate scan bucket not found.");
  }

  const beforeState = {
    isSuspicious: scan.isSuspicious,
    isBillable: scan.isBillable,
    billableCount: scan.billableCount,
    suspiciousCount: scan.suspiciousCount,
    suspiciousReason: scan.suspiciousReason,
  };

  let updateData;
  if (markSuspicious) {
    updateData = {
      isSuspicious: true,
      suspiciousReason: "MANUALLY_FLAGGED",
      isBillable: false,
      suspiciousCount: scan.hitCount,
      billableCount: 0,
    };
  } else {
    const isBillable =
      !scan.isInternalTest && scan.qrCode.type !== "BATCH_DELIVERY";
    updateData = {
      isSuspicious: false,
      suspiciousReason: null,
      isBillable,
      suspiciousCount: 0,
      billableCount: isBillable ? scan.hitCount : 0,
    };
  }

  const afterState = {
    isSuspicious: updateData.isSuspicious,
    isBillable: updateData.isBillable,
    billableCount: updateData.billableCount,
    suspiciousCount: updateData.suspiciousCount,
    suspiciousReason: updateData.suspiciousReason,
  };

  await prisma.$transaction([
    prisma.scanEvent.update({
      where: { id: scanEventId },
      data: updateData,
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "OVERRIDE_SUSPICIOUS_SCAN",
        entityType: "ScanEvent",
        entityId: scanEventId,
        metadata: { before: beforeState, after: afterState },
      },
    }),
  ]);

  revalidatePath("/admin/suspicious-scans");
  revalidatePath("/admin/billing");
  revalidatePath("/admin/reports");
}
