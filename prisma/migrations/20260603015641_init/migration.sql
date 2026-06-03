-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'BRAND_ADMIN', 'CAMPAIGN_MANAGER', 'ADVERTISER_VIEWER', 'RETAIL_OPERATIONS');

-- CreateEnum
CREATE TYPE "BrandStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdvertiserStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('CREATED', 'ACTIVE', 'DELIVERING', 'DELIVERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QRCodeType" AS ENUM ('CONSUMER_CAMPAIGN', 'SAMPLE_LABEL', 'BATCH_DELIVERY', 'INTERNAL_TEST');

-- CreateEnum
CREATE TYPE "QRCodeStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED', 'DISABLED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('FREE_DATA', 'AIRTIME', 'WALLET', 'INSURANCE', 'VOUCHER', 'CASHBACK', 'OTHER');

-- CreateEnum
CREATE TYPE "RewardLimitType" AS ENUM ('ONE_PER_MOBILE_PER_CAMPAIGN');

-- CreateEnum
CREATE TYPE "RewardClaimStatus" AS ENUM ('STARTED', 'APPROVED', 'DECLINED_DUPLICATE', 'DECLINED_SUSPICIOUS', 'FAILED');

-- CreateEnum
CREATE TYPE "RewardProviderStatus" AS ENUM ('SIMULATED', 'PENDING', 'FULFILLED', 'FAILED');

-- CreateEnum
CREATE TYPE "OtpStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('IP', 'GPS', 'MANUAL', 'DEMO_SEED');

-- CreateEnum
CREATE TYPE "RetailerType" AS ENUM ('RETAILER', 'DISTRIBUTOR', 'KIOSK', 'SUPERMARKET', 'WHOLESALER', 'OUTLET', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('CAMPAIGN_SUMMARY_CSV', 'CAMPAIGN_SUMMARY_PDF', 'SCAN_EVENTS_CSV', 'REWARD_CLAIMS_CSV', 'DELIVERY_SCANS_CSV', 'BILLING_SUMMARY_PDF');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "brandId" TEXT,
    "advertiserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "status" "BrandStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advertiser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "status" "AdvertiserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "unitLabel" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "productId" TEXT,
    "createdById" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "offerTitle" TEXT NOT NULL,
    "offerDescription" TEXT,
    "rewardType" "RewardType" NOT NULL DEFAULT 'FREE_DATA',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "fixedFeePerUnit" DECIMAL(10,4),
    "engagementFeePerScan" DECIMAL(10,4),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "rewardLimitType" "RewardLimitType" NOT NULL DEFAULT 'ONE_PER_MOBILE_PER_CAMPAIGN',
    "maxClaimsPerMobile" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT,
    "batchCode" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "estimatedUnitCount" INTEGER,
    "unitsPerCarton" INTEGER,
    "status" "BatchStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "QRCodeType" NOT NULL,
    "status" "QRCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "brandId" TEXT,
    "advertiserId" TEXT,
    "campaignId" TEXT,
    "productId" TEXT,
    "batchId" TEXT,
    "createdById" TEXT,
    "destinationUrl" TEXT,
    "label" TEXT,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanEvent" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "brandId" TEXT,
    "advertiserId" TEXT,
    "campaignId" TEXT,
    "productId" TEXT,
    "batchId" TEXT,
    "anonymousVisitorId" TEXT,
    "sessionId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "os" TEXT,
    "browser" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "suburb" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "locationSource" "LocationSource" NOT NULL DEFAULT 'IP',
    "isRepeatScan" BOOLEAN NOT NULL DEFAULT false,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "suspiciousReason" TEXT,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "isInternalTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardClaim" (
    "id" TEXT NOT NULL,
    "scanEventId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "brandId" TEXT,
    "advertiserId" TEXT,
    "otpVerificationId" TEXT,
    "mobileNumber" TEXT,
    "mobileNumberHash" TEXT NOT NULL,
    "mobileNumberLast4" TEXT,
    "status" "RewardClaimStatus" NOT NULL,
    "declineReason" TEXT,
    "rewardType" "RewardType" NOT NULL,
    "providerStatus" "RewardProviderStatus" NOT NULL DEFAULT 'SIMULATED',
    "providerResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpVerification" (
    "id" TEXT NOT NULL,
    "mobileNumber" TEXT,
    "mobileNumberHash" TEXT NOT NULL,
    "codeHash" TEXT,
    "status" "OtpStatus" NOT NULL DEFAULT 'PENDING',
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retailer" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "name" TEXT NOT NULL,
    "type" "RetailerType",
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "suburb" TEXT,
    "address" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryScan" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "brandId" TEXT,
    "campaignId" TEXT,
    "batchId" TEXT,
    "retailerId" TEXT,
    "scannedByUserId" TEXT,
    "cartonsDelivered" INTEGER NOT NULL,
    "unitsPerCarton" INTEGER NOT NULL,
    "estimatedUnitsDelivered" INTEGER NOT NULL,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "suburb" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "locationSource" "LocationSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingSummary" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "advertiserId" TEXT,
    "campaignId" TEXT NOT NULL,
    "fixedFeePerUnit" DECIMAL(10,4),
    "estimatedUnitsPlaced" INTEGER NOT NULL DEFAULT 0,
    "fixedFeeTotal" DECIMAL(12,4),
    "engagementFeePerScan" DECIMAL(10,4),
    "totalScanCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueScanCount" INTEGER NOT NULL DEFAULT 0,
    "repeatScanCount" INTEGER NOT NULL DEFAULT 0,
    "suspiciousScanCount" INTEGER NOT NULL DEFAULT 0,
    "internalTestScanCount" INTEGER NOT NULL DEFAULT 0,
    "billableScanCount" INTEGER NOT NULL DEFAULT 0,
    "engagementFeeTotal" DECIMAL(12,4),
    "approvedRewardClaims" INTEGER NOT NULL DEFAULT 0,
    "duplicateRewardDeclines" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,4),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "advertiserId" TEXT,
    "campaignId" TEXT,
    "generatedById" TEXT,
    "type" "ReportType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAssignment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_brandId_idx" ON "User"("brandId");

-- CreateIndex
CREATE INDEX "User_advertiserId_idx" ON "User"("advertiserId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_status_idx" ON "Brand"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Advertiser_slug_key" ON "Advertiser"("slug");

-- CreateIndex
CREATE INDEX "Advertiser_status_idx" ON "Advertiser"("status");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Product_brandId_slug_key" ON "Product"("brandId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_brandId_idx" ON "Campaign"("brandId");

-- CreateIndex
CREATE INDEX "Campaign_advertiserId_idx" ON "Campaign"("advertiserId");

-- CreateIndex
CREATE INDEX "Campaign_productId_idx" ON "Campaign"("productId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_startDate_endDate_idx" ON "Campaign"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batchCode_key" ON "Batch"("batchCode");

-- CreateIndex
CREATE INDEX "Batch_brandId_idx" ON "Batch"("brandId");

-- CreateIndex
CREATE INDEX "Batch_campaignId_idx" ON "Batch"("campaignId");

-- CreateIndex
CREATE INDEX "Batch_productId_idx" ON "Batch"("productId");

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "QRCode_code_key" ON "QRCode"("code");

-- CreateIndex
CREATE INDEX "QRCode_type_idx" ON "QRCode"("type");

-- CreateIndex
CREATE INDEX "QRCode_status_idx" ON "QRCode"("status");

-- CreateIndex
CREATE INDEX "QRCode_brandId_idx" ON "QRCode"("brandId");

-- CreateIndex
CREATE INDEX "QRCode_advertiserId_idx" ON "QRCode"("advertiserId");

-- CreateIndex
CREATE INDEX "QRCode_campaignId_idx" ON "QRCode"("campaignId");

-- CreateIndex
CREATE INDEX "QRCode_productId_idx" ON "QRCode"("productId");

-- CreateIndex
CREATE INDEX "QRCode_batchId_idx" ON "QRCode"("batchId");

-- CreateIndex
CREATE INDEX "ScanEvent_qrCodeId_idx" ON "ScanEvent"("qrCodeId");

-- CreateIndex
CREATE INDEX "ScanEvent_brandId_idx" ON "ScanEvent"("brandId");

-- CreateIndex
CREATE INDEX "ScanEvent_advertiserId_idx" ON "ScanEvent"("advertiserId");

-- CreateIndex
CREATE INDEX "ScanEvent_campaignId_idx" ON "ScanEvent"("campaignId");

-- CreateIndex
CREATE INDEX "ScanEvent_productId_idx" ON "ScanEvent"("productId");

-- CreateIndex
CREATE INDEX "ScanEvent_batchId_idx" ON "ScanEvent"("batchId");

-- CreateIndex
CREATE INDEX "ScanEvent_anonymousVisitorId_idx" ON "ScanEvent"("anonymousVisitorId");

-- CreateIndex
CREATE INDEX "ScanEvent_ipHash_idx" ON "ScanEvent"("ipHash");

-- CreateIndex
CREATE INDEX "ScanEvent_isRepeatScan_idx" ON "ScanEvent"("isRepeatScan");

-- CreateIndex
CREATE INDEX "ScanEvent_isSuspicious_idx" ON "ScanEvent"("isSuspicious");

-- CreateIndex
CREATE INDEX "ScanEvent_isBillable_idx" ON "ScanEvent"("isBillable");

-- CreateIndex
CREATE INDEX "ScanEvent_createdAt_idx" ON "ScanEvent"("createdAt");

-- CreateIndex
CREATE INDEX "RewardClaim_scanEventId_idx" ON "RewardClaim"("scanEventId");

-- CreateIndex
CREATE INDEX "RewardClaim_campaignId_idx" ON "RewardClaim"("campaignId");

-- CreateIndex
CREATE INDEX "RewardClaim_brandId_idx" ON "RewardClaim"("brandId");

-- CreateIndex
CREATE INDEX "RewardClaim_advertiserId_idx" ON "RewardClaim"("advertiserId");

-- CreateIndex
CREATE INDEX "RewardClaim_mobileNumberHash_idx" ON "RewardClaim"("mobileNumberHash");

-- CreateIndex
CREATE INDEX "RewardClaim_status_idx" ON "RewardClaim"("status");

-- CreateIndex
CREATE INDEX "RewardClaim_createdAt_idx" ON "RewardClaim"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardClaim_campaignId_mobileNumberHash_key" ON "RewardClaim"("campaignId", "mobileNumberHash");

-- CreateIndex
CREATE INDEX "OtpVerification_mobileNumberHash_idx" ON "OtpVerification"("mobileNumberHash");

-- CreateIndex
CREATE INDEX "OtpVerification_status_idx" ON "OtpVerification"("status");

-- CreateIndex
CREATE INDEX "OtpVerification_expiresAt_idx" ON "OtpVerification"("expiresAt");

-- CreateIndex
CREATE INDEX "Retailer_brandId_idx" ON "Retailer"("brandId");

-- CreateIndex
CREATE INDEX "Retailer_city_idx" ON "Retailer"("city");

-- CreateIndex
CREATE INDEX "Retailer_region_idx" ON "Retailer"("region");

-- CreateIndex
CREATE INDEX "DeliveryScan_qrCodeId_idx" ON "DeliveryScan"("qrCodeId");

-- CreateIndex
CREATE INDEX "DeliveryScan_brandId_idx" ON "DeliveryScan"("brandId");

-- CreateIndex
CREATE INDEX "DeliveryScan_campaignId_idx" ON "DeliveryScan"("campaignId");

-- CreateIndex
CREATE INDEX "DeliveryScan_batchId_idx" ON "DeliveryScan"("batchId");

-- CreateIndex
CREATE INDEX "DeliveryScan_retailerId_idx" ON "DeliveryScan"("retailerId");

-- CreateIndex
CREATE INDEX "DeliveryScan_scannedByUserId_idx" ON "DeliveryScan"("scannedByUserId");

-- CreateIndex
CREATE INDEX "DeliveryScan_createdAt_idx" ON "DeliveryScan"("createdAt");

-- CreateIndex
CREATE INDEX "BillingSummary_brandId_idx" ON "BillingSummary"("brandId");

-- CreateIndex
CREATE INDEX "BillingSummary_advertiserId_idx" ON "BillingSummary"("advertiserId");

-- CreateIndex
CREATE INDEX "BillingSummary_campaignId_idx" ON "BillingSummary"("campaignId");

-- CreateIndex
CREATE INDEX "BillingSummary_generatedAt_idx" ON "BillingSummary"("generatedAt");

-- CreateIndex
CREATE INDEX "ReportExport_brandId_idx" ON "ReportExport"("brandId");

-- CreateIndex
CREATE INDEX "ReportExport_advertiserId_idx" ON "ReportExport"("advertiserId");

-- CreateIndex
CREATE INDEX "ReportExport_campaignId_idx" ON "ReportExport"("campaignId");

-- CreateIndex
CREATE INDEX "ReportExport_generatedById_idx" ON "ReportExport"("generatedById");

-- CreateIndex
CREATE INDEX "ReportExport_type_idx" ON "ReportExport"("type");

-- CreateIndex
CREATE INDEX "ReportExport_createdAt_idx" ON "ReportExport"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "CampaignAssignment_campaignId_idx" ON "CampaignAssignment"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignAssignment_userId_idx" ON "CampaignAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAssignment_campaignId_userId_key" ON "CampaignAssignment"("campaignId", "userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_scanEventId_fkey" FOREIGN KEY ("scanEventId") REFERENCES "ScanEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_otpVerificationId_fkey" FOREIGN KEY ("otpVerificationId") REFERENCES "OtpVerification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retailer" ADD CONSTRAINT "Retailer_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryScan" ADD CONSTRAINT "DeliveryScan_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryScan" ADD CONSTRAINT "DeliveryScan_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryScan" ADD CONSTRAINT "DeliveryScan_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryScan" ADD CONSTRAINT "DeliveryScan_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryScan" ADD CONSTRAINT "DeliveryScan_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryScan" ADD CONSTRAINT "DeliveryScan_scannedByUserId_fkey" FOREIGN KEY ("scannedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingSummary" ADD CONSTRAINT "BillingSummary_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingSummary" ADD CONSTRAINT "BillingSummary_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingSummary" ADD CONSTRAINT "BillingSummary_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAssignment" ADD CONSTRAINT "CampaignAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAssignment" ADD CONSTRAINT "CampaignAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
