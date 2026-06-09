-- CreateTable
CREATE TABLE "RewardClaimAttempt" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "brandId" TEXT,
    "advertiserId" TEXT,
    "scanEventId" TEXT,
    "mobileNumberHash" TEXT NOT NULL,
    "mobileNumberLast4" TEXT,
    "status" "RewardClaimStatus" NOT NULL,
    "failureReason" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardClaimAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RewardClaimAttempt_campaignId_idx" ON "RewardClaimAttempt"("campaignId");

-- CreateIndex
CREATE INDEX "RewardClaimAttempt_brandId_idx" ON "RewardClaimAttempt"("brandId");

-- CreateIndex
CREATE INDEX "RewardClaimAttempt_advertiserId_idx" ON "RewardClaimAttempt"("advertiserId");

-- CreateIndex
CREATE INDEX "RewardClaimAttempt_mobileNumberHash_idx" ON "RewardClaimAttempt"("mobileNumberHash");

-- CreateIndex
CREATE INDEX "RewardClaimAttempt_status_idx" ON "RewardClaimAttempt"("status");

-- CreateIndex
CREATE INDEX "RewardClaimAttempt_createdAt_idx" ON "RewardClaimAttempt"("createdAt");

-- AddForeignKey
ALTER TABLE "RewardClaimAttempt" ADD CONSTRAINT "RewardClaimAttempt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaimAttempt" ADD CONSTRAINT "RewardClaimAttempt_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaimAttempt" ADD CONSTRAINT "RewardClaimAttempt_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaimAttempt" ADD CONSTRAINT "RewardClaimAttempt_scanEventId_fkey" FOREIGN KEY ("scanEventId") REFERENCES "ScanEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill any legacy duplicate rows into the append-only attempt table.
INSERT INTO "RewardClaimAttempt" (
    "id",
    "campaignId",
    "brandId",
    "advertiserId",
    "scanEventId",
    "mobileNumberHash",
    "mobileNumberLast4",
    "status",
    "failureReason",
    "createdAt"
)
SELECT
    'legacy_' || md5(random()::text || clock_timestamp()::text || "id"),
    "campaignId",
    "brandId",
    "advertiserId",
    "scanEventId",
    "mobileNumberHash",
    "mobileNumberLast4",
    "status",
    COALESCE("declineReason", 'A reward was already approved for this campaign and mobile number.'),
    "createdAt"
FROM "RewardClaim"
WHERE "status" = 'DECLINED_DUPLICATE';

-- RewardClaim remains the unique canonical claim record. Duplicate outcomes
-- now live only in RewardClaimAttempt.
DELETE FROM "RewardClaim"
WHERE "status" = 'DECLINED_DUPLICATE';
