-- AlterTable
ALTER TABLE "ScanEvent" 
ADD COLUMN     "billableCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "fingerprintKey" TEXT,
ADD COLUMN     "firstScanAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hitCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastScanAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "repeatCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "suspiciousCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "windowStartedAt" TIMESTAMP(3);

-- Backfill data for existing rows
UPDATE "ScanEvent" SET
  "fingerprintKey" = COALESCE("anonymousVisitorId", "ipHash", 'unknown_' || "id"),
  "windowStartedAt" = "createdAt",
  "firstScanAt" = "createdAt",
  "lastScanAt" = "createdAt",
  "hitCount" = 1,
  "repeatCount" = CASE WHEN "isRepeatScan" = true THEN 1 ELSE 0 END,
  "suspiciousCount" = CASE WHEN "isSuspicious" = true THEN 1 ELSE 0 END,
  "billableCount" = CASE WHEN "isBillable" = true THEN 1 ELSE 0 END;

-- Make fingerprintKey and windowStartedAt NOT NULL
ALTER TABLE "ScanEvent" ALTER COLUMN "fingerprintKey" SET NOT NULL;
ALTER TABLE "ScanEvent" ALTER COLUMN "windowStartedAt" SET NOT NULL;

-- CreateUniqueIndex
CREATE UNIQUE INDEX "scan_event_window_unique" ON "ScanEvent"("qrCodeId", "fingerprintKey", "windowStartedAt");

-- CreateIndex
CREATE INDEX "ScanEvent_qrCodeId_windowStartedAt_idx" ON "ScanEvent"("qrCodeId", "windowStartedAt");

-- CreateIndex
CREATE INDEX "ScanEvent_qrCodeId_createdAt_idx" ON "ScanEvent"("qrCodeId", "createdAt");

-- CreateIndex
CREATE INDEX "ScanEvent_fingerprintKey_lastScanAt_idx" ON "ScanEvent"("fingerprintKey", "lastScanAt");
