// prisma/seed.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to seed the database.");
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  ssl:
    process.env.PG_SSL_REJECT_UNAUTHORIZED === "true"
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const DEMO_PASSWORD = "DemoPass123!";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function last4(mobile: string) {
  return mobile.replace(/\D/g, "").slice(-4);
}

function bucketTime(date: Date) {
  return new Date(Math.floor(date.getTime() / 30_000) * 30_000);
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function resetDemoData() {
  console.log("Resetting all demo data...");

  await prisma.reportExport.deleteMany();
  await prisma.billingSummary.deleteMany();
  await prisma.rewardClaimAttempt.deleteMany();
  await prisma.rewardClaim.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.otpVerification.deleteMany();
  await prisma.deliveryScan.deleteMany();
  await prisma.scanEvent.deleteMany();
  await prisma.campaignAssignment.deleteMany();
  await prisma.qRCode.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.product.deleteMany();
  await prisma.retailer.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.advertiser.deleteMany();
  await prisma.brand.deleteMany();

  console.log("Existing data cleared.");
}

async function createScanBucket(input: {
  qrCodeId: string;
  brandId?: string | null;
  advertiserId?: string | null;
  campaignId?: string | null;
  productId?: string | null;
  batchId?: string | null;
  anonymousVisitorId: string;
  ipSeed: string;
  userAgent: string;
  deviceType: string;
  os: string;
  browser: string;
  country: string;
  region: string;
  city: string;
  suburb: string;
  latitude: string;
  longitude: string;
  createdAt: Date;
  hitCount: number;
  repeatCount: number;
  suspiciousCount: number;
  billableCount: number;
  isSuspicious?: boolean;
  suspiciousReason?: string | null;
  isInternalTest?: boolean;
}) {
  const windowStartedAt = bucketTime(input.createdAt);
  const isRepeatScan = input.repeatCount > 0;
  const isSuspicious = input.isSuspicious ?? input.suspiciousCount > 0;
  const isBillable = input.billableCount > 0;
  const isInternalTest = input.isInternalTest ?? false;

  return prisma.scanEvent.create({
    data: {
      qrCodeId: input.qrCodeId,
      brandId: input.brandId,
      advertiserId: input.advertiserId,
      campaignId: input.campaignId,
      productId: input.productId,
      batchId: input.batchId,

      anonymousVisitorId: input.anonymousVisitorId,
      sessionId: `seed-session-${crypto.randomUUID()}`,
      ipHash: sha256(input.ipSeed),
      userAgent: input.userAgent,
      deviceType: input.deviceType,
      os: input.os,
      browser: input.browser,

      country: input.country,
      region: input.region,
      city: input.city,
      suburb: input.suburb,
      latitude: input.latitude,
      longitude: input.longitude,
      locationSource: "DEMO_SEED",

      isRepeatScan,
      isSuspicious,
      suspiciousReason: input.suspiciousReason ?? null,
      isBillable,
      isInternalTest,

      fingerprintKey: `visitor:${input.anonymousVisitorId}`,
      windowStartedAt,
      firstScanAt: input.createdAt,
      lastScanAt: new Date(input.createdAt.getTime() + Math.min(input.hitCount, 29) * 1000),
      hitCount: input.hitCount,
      repeatCount: input.repeatCount,
      suspiciousCount: input.suspiciousCount,
      billableCount: input.billableCount,
      createdAt: input.createdAt,
    },
  });
}

async function main() {
  await resetDemoData();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Creating brands...");
  const moBeverages = await prisma.brand.create({
    data: {
      name: "Mo Beverages",
      slug: "mo-beverages",
      industry: "FMCG Beverages",
      websiteUrl: "https://mobeverages.local",
      status: "ACTIVE",
    },
  });

  const brightFoods = await prisma.brand.create({
    data: {
      name: "Bright Foods",
      slug: "bright-foods",
      industry: "FMCG Snacks",
      websiteUrl: "https://brightfoods.local",
      status: "ACTIVE",
    },
  });

  console.log("Creating advertisers...");
  const vodacom = await prisma.advertiser.create({
    data: {
      name: "Vodacom",
      slug: "vodacom",
      industry: "Telecom",
      contactName: "Vodacom Demo Contact",
      contactEmail: "demo.vodacom@moengage.local",
      status: "ACTIVE",
    },
  });

  const ncba = await prisma.advertiser.create({
    data: {
      name: "NCBA Bank",
      slug: "ncba-bank",
      industry: "Banking & Fintech",
      contactName: "NCBA Demo Contact",
      contactEmail: "demo.ncba@moengage.local",
      status: "ACTIVE",
    },
  });

  const safeguard = await prisma.advertiser.create({
    data: {
      name: "SafeGuard Insurance",
      slug: "safeguard-insurance",
      industry: "Insurance",
      contactName: "SafeGuard Demo Contact",
      contactEmail: "demo.safeguard@moengage.local",
      status: "ACTIVE",
    },
  });

  console.log("Creating products...");
  const moXtra = await prisma.product.create({
    data: {
      brandId: moBeverages.id,
      name: "Mo Xtra 330ml Can",
      slug: "mo-xtra-330ml-can",
      sku: "MO-XTRA-330",
      category: "Energy Drink",
      unitLabel: "can",
      status: "ACTIVE",
    },
  });

  const moMalto = await prisma.product.create({
    data: {
      brandId: moBeverages.id,
      name: "Mo Malto 330ml Can",
      slug: "mo-malto-330ml-can",
      sku: "MO-MALTO-330",
      category: "Malt Drink",
      unitLabel: "can",
      status: "ACTIVE",
    },
  });

  const brightCrisp = await prisma.product.create({
    data: {
      brandId: brightFoods.id,
      name: "Bright Crisp Maize Snack 80g",
      slug: "bright-crisp-maize-80g",
      sku: "BF-CRISP-080",
      category: "Snacks",
      unitLabel: "pack",
      status: "ACTIVE",
    },
  });

  console.log("Creating users...");
  const admin = await prisma.user.create({
    data: {
      name: "Platform Admin",
      email: "admin@moengage.local",
      passwordHash,
      role: "ADMIN",
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.create({
    data: {
      name: "Mo Beverages Brand Admin",
      email: "brand.admin@moengage.local",
      passwordHash,
      role: "BRAND_ADMIN",
      brandId: moBeverages.id,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const campaignManager = await prisma.user.create({
    data: {
      name: "Campaign Manager",
      email: "campaign.manager@moengage.local",
      passwordHash,
      role: "CAMPAIGN_MANAGER",
      brandId: moBeverages.id,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.create({
    data: {
      name: "Vodacom Advertiser Viewer",
      email: "advertiser.viewer@moengage.local",
      passwordHash,
      role: "ADVERTISER_VIEWER",
      advertiserId: vodacom.id,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.create({
    data: {
      name: "NCBA Advertiser Viewer",
      email: "ncba.viewer@moengage.local",
      passwordHash,
      role: "ADVERTISER_VIEWER",
      advertiserId: ncba.id,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const retailOps = await prisma.user.create({
    data: {
      name: "Retail Operations User",
      email: "retail.ops@moengage.local",
      passwordHash,
      role: "RETAIL_OPERATIONS",
      brandId: moBeverages.id,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const brightRetailOps = await prisma.user.create({
    data: {
      name: "Bright Foods Retail Operations",
      email: "bright.retail.ops@moengage.local",
      passwordHash,
      role: "RETAIL_OPERATIONS",
      brandId: brightFoods.id,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log("Creating campaigns...");
  const campaignVodacom = await prisma.campaign.create({
    data: {
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      productId: moXtra.id,
      createdById: admin.id,
      name: "Vodacom Free 5GB Data Campaign",
      slug: "vodacom-free-5gb-data",
      offerTitle: "Scan to Claim Free 5GB Data",
      offerDescription:
        "Consumers scan, enter mobile number, verify OTP, and claim simulated free data. Valid on Mo Xtra cans.",
      rewardType: "FREE_DATA",
      status: "ACTIVE",
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      fixedFeePerUnit: "0.0200",
      engagementFeePerScan: "0.0300",
      currency: "USD",
      rewardLimitType: "ONE_PER_MOBILE_PER_CAMPAIGN",
      maxClaimsPerMobile: 1,
    },
  });

  const campaignNCBA = await prisma.campaign.create({
    data: {
      brandId: brightFoods.id,
      advertiserId: ncba.id,
      productId: brightCrisp.id,
      createdById: admin.id,
      name: "NCBA Cashback Campaign",
      slug: "ncba-cashback-bright-foods",
      offerTitle: "Scan to Earn KES 50 Cashback",
      offerDescription:
        "Scan a Bright Crisp pack, enter mobile number, verify OTP, and claim simulated cashback.",
      rewardType: "CASHBACK",
      status: "ACTIVE",
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      fixedFeePerUnit: "0.0150",
      engagementFeePerScan: "0.0250",
      currency: "USD",
      rewardLimitType: "ONE_PER_MOBILE_PER_CAMPAIGN",
      maxClaimsPerMobile: 1,
    },
  });

  const campaignSafeguard = await prisma.campaign.create({
    data: {
      brandId: moBeverages.id,
      advertiserId: safeguard.id,
      productId: moMalto.id,
      createdById: admin.id,
      name: "SafeGuard Free 30-Day Cover",
      slug: "safeguard-free-30-day-cover",
      offerTitle: "Scan to Activate Free 30-Day Insurance",
      offerDescription:
        "Eligible Mo Malto consumers can register for a complimentary 30-day personal accident cover. Demo only.",
      rewardType: "INSURANCE",
      status: "PAUSED",
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      fixedFeePerUnit: "0.0300",
      engagementFeePerScan: "0.0500",
      currency: "USD",
      rewardLimitType: "ONE_PER_MOBILE_PER_CAMPAIGN",
      maxClaimsPerMobile: 1,
    },
  });

  await prisma.campaignAssignment.create({
    data: { campaignId: campaignVodacom.id, userId: campaignManager.id },
  });

  await prisma.campaignAssignment.create({
    data: { campaignId: campaignNCBA.id, userId: campaignManager.id },
  });

  console.log("Creating batches...");
  const batchDarVodacom = await prisma.batch.create({
    data: {
      brandId: moBeverages.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchCode: "MOXTRA-VODACOM-DAR-001",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      estimatedUnitCount: 2400,
      unitsPerCarton: 24,
      status: "ACTIVE",
    },
  });

  const batchNairobiVodacom = await prisma.batch.create({
    data: {
      brandId: moBeverages.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchCode: "MOXTRA-VODACOM-NBI-001",
      region: "Nairobi",
      city: "Nairobi",
      estimatedUnitCount: 1200,
      unitsPerCarton: 24,
      status: "ACTIVE",
    },
  });

  const batchBrightNCBA = await prisma.batch.create({
    data: {
      brandId: brightFoods.id,
      campaignId: campaignNCBA.id,
      productId: brightCrisp.id,
      batchCode: "BFCRISP-NCBA-MSA-001",
      region: "Coast",
      city: "Mombasa",
      estimatedUnitCount: 3000,
      unitsPerCarton: 30,
      status: "ACTIVE",
    },
  });

  console.log("Creating QR codes...");
  const consumerQrVodacom = await prisma.qRCode.create({
    data: {
      code: "mo-xtra-vodacom-free-5gb",
      type: "CONSUMER_CAMPAIGN",
      status: "ACTIVE",
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchDarVodacom.id,
      createdById: admin.id,
      label: "Mo Xtra – Vodacom Free 5GB Consumer QR",
      destinationUrl: `${APP_BASE_URL}/q/mo-xtra-vodacom-free-5gb`,
      scanCount: 12,
    },
  });

  const consumerQrNCBA = await prisma.qRCode.create({
    data: {
      code: "bright-crisp-ncba-cashback",
      type: "CONSUMER_CAMPAIGN",
      status: "ACTIVE",
      brandId: brightFoods.id,
      advertiserId: ncba.id,
      campaignId: campaignNCBA.id,
      productId: brightCrisp.id,
      batchId: batchBrightNCBA.id,
      createdById: admin.id,
      label: "Bright Crisp – NCBA Cashback Consumer QR",
      destinationUrl: `${APP_BASE_URL}/q/bright-crisp-ncba-cashback`,
      scanCount: 5,
    },
  });

  await prisma.qRCode.create({
    data: {
      code: "sample-label-mo-xtra-vodacom",
      type: "SAMPLE_LABEL",
      status: "ACTIVE",
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchDarVodacom.id,
      createdById: admin.id,
      label: "Sample Wrapped Can Label QR",
      destinationUrl: `${APP_BASE_URL}/q/sample-label-mo-xtra-vodacom`,
    },
  });

  const internalTestQr = await prisma.qRCode.create({
    data: {
      code: "internal-test-mo-xtra-vodacom",
      type: "INTERNAL_TEST",
      status: "ACTIVE",
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchDarVodacom.id,
      createdById: admin.id,
      label: "Internal QA Test QR",
      destinationUrl: `${APP_BASE_URL}/q/internal-test-mo-xtra-vodacom`,
      scanCount: 2,
    },
  });

  const deliveryQrDar = await prisma.qRCode.create({
    data: {
      code: "delivery-moxtra-vodacom-dar-001",
      type: "BATCH_DELIVERY",
      status: "ACTIVE",
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchDarVodacom.id,
      createdById: admin.id,
      label: "Mo Xtra Vodacom – Dar es Salaam Delivery QR",
      destinationUrl: `${APP_BASE_URL}/d/delivery-moxtra-vodacom-dar-001`,
      scanCount: 2,
    },
  });

  const deliveryQrNairobi = await prisma.qRCode.create({
    data: {
      code: "delivery-moxtra-vodacom-nbi-001",
      type: "BATCH_DELIVERY",
      status: "ACTIVE",
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchNairobiVodacom.id,
      createdById: admin.id,
      label: "Mo Xtra Vodacom – Nairobi Delivery QR",
      destinationUrl: `${APP_BASE_URL}/d/delivery-moxtra-vodacom-nbi-001`,
      scanCount: 1,
    },
  });

  const deliveryQrMombasa = await prisma.qRCode.create({
    data: {
      code: "delivery-bfcrisp-ncba-msa-001",
      type: "BATCH_DELIVERY",
      status: "ACTIVE",
      brandId: brightFoods.id,
      advertiserId: ncba.id,
      campaignId: campaignNCBA.id,
      productId: brightCrisp.id,
      batchId: batchBrightNCBA.id,
      createdById: admin.id,
      label: "Bright Crisp NCBA – Mombasa Delivery QR",
      destinationUrl: `${APP_BASE_URL}/d/delivery-bfcrisp-ncba-msa-001`,
      scanCount: 1,
    },
  });

  await prisma.qRCode.create({
    data: {
      code: "paused-safeguard-cover-mo-malto",
      type: "CONSUMER_CAMPAIGN",
      status: "PAUSED",
      brandId: moBeverages.id,
      advertiserId: safeguard.id,
      campaignId: campaignSafeguard.id,
      productId: moMalto.id,
      createdById: admin.id,
      label: "SafeGuard Insurance – Mo Malto QR (Paused)",
      destinationUrl: `${APP_BASE_URL}/q/paused-safeguard-cover-mo-malto`,
    },
  });

  console.log("Creating retailers...");
  const kariakoo = await prisma.retailer.create({
    data: {
      brandId: moBeverages.id,
      name: "Kariakoo Demo Outlet",
      type: "RETAILER",
      country: "Tanzania",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      suburb: "Kariakoo",
      address: "Demo address, Kariakoo",
      latitude: "-6.8235000",
      longitude: "39.2695000",
    },
  });

  const mlimani = await prisma.retailer.create({
    data: {
      brandId: moBeverages.id,
      name: "Mlimani City Demo Retailer",
      type: "SUPERMARKET",
      country: "Tanzania",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      suburb: "Mlimani City",
      address: "Demo address, Mlimani City",
      latitude: "-6.7700000",
      longitude: "39.2200000",
    },
  });

  const nairobiCBD = await prisma.retailer.create({
    data: {
      brandId: moBeverages.id,
      name: "Nairobi CBD Wholesale",
      type: "WHOLESALER",
      country: "Kenya",
      region: "Nairobi",
      city: "Nairobi",
      suburb: "CBD",
      address: "Demo address, Nairobi CBD",
      latitude: "-1.2830000",
      longitude: "36.8219000",
    },
  });

  const mombasaKiosk = await prisma.retailer.create({
    data: {
      brandId: brightFoods.id,
      name: "Mombasa Old Town Kiosk",
      type: "KIOSK",
      country: "Kenya",
      region: "Coast",
      city: "Mombasa",
      suburb: "Old Town",
      address: "Demo address, Mombasa Old Town",
      latitude: "-4.0580000",
      longitude: "39.6650000",
    },
  });

  console.log("Creating aggregated scan buckets...");

  const scanVodacomMixed = await createScanBucket({
    qrCodeId: consumerQrVodacom.id,
    brandId: moBeverages.id,
    advertiserId: vodacom.id,
    campaignId: campaignVodacom.id,
    productId: moXtra.id,
    batchId: batchDarVodacom.id,
    anonymousVisitorId: "demo-vodacom-mixed-visitor",
    ipSeed: "demo-ip-mixed",
    userAgent: "Mozilla/5.0 (Android 13; Mobile) Chrome/120.0",
    deviceType: "Mobile",
    os: "Android",
    browser: "Chrome",
    country: "Tanzania",
    region: "Dar es Salaam",
    city: "Dar es Salaam",
    suburb: "Kariakoo",
    latitude: "-6.8235000",
    longitude: "39.2695000",
    createdAt: hoursAgo(6),
    hitCount: 9,
    repeatCount: 8,
    suspiciousCount: 2,
    billableCount: 7,
    isSuspicious: true,
    suspiciousReason: "HIGH_FREQUENCY_VISITOR",
  });

  const scanVodacomNormal = await createScanBucket({
    qrCodeId: consumerQrVodacom.id,
    brandId: moBeverages.id,
    advertiserId: vodacom.id,
    campaignId: campaignVodacom.id,
    productId: moXtra.id,
    batchId: batchNairobiVodacom.id,
    anonymousVisitorId: "demo-vodacom-normal-visitor",
    ipSeed: "demo-ip-normal",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1",
    deviceType: "Mobile",
    os: "iOS",
    browser: "Safari",
    country: "Kenya",
    region: "Nairobi",
    city: "Nairobi",
    suburb: "CBD",
    latitude: "-1.2830000",
    longitude: "36.8219000",
    createdAt: hoursAgo(12),
    hitCount: 3,
    repeatCount: 2,
    suspiciousCount: 0,
    billableCount: 3,
  });

  await createScanBucket({
    qrCodeId: internalTestQr.id,
    brandId: moBeverages.id,
    advertiserId: vodacom.id,
    campaignId: campaignVodacom.id,
    productId: moXtra.id,
    batchId: batchDarVodacom.id,
    anonymousVisitorId: "internal-qa-tester",
    ipSeed: "internal-qa-ip",
    userAgent: "Mozilla/5.0 QA-Internal-Test",
    deviceType: "Desktop",
    os: "macOS",
    browser: "Chrome",
    country: "Kenya",
    region: "Nairobi",
    city: "Nairobi",
    suburb: "Westlands",
    latitude: "-1.2656000",
    longitude: "36.8062000",
    createdAt: hoursAgo(18),
    hitCount: 2,
    repeatCount: 0,
    suspiciousCount: 0,
    billableCount: 0,
    suspiciousReason: "INTERNAL_TEST_QR",
    isInternalTest: true,
  });

  const scanNCBA = await createScanBucket({
    qrCodeId: consumerQrNCBA.id,
    brandId: brightFoods.id,
    advertiserId: ncba.id,
    campaignId: campaignNCBA.id,
    productId: brightCrisp.id,
    batchId: batchBrightNCBA.id,
    anonymousVisitorId: "demo-ncba-visitor",
    ipSeed: "demo-ip-ncba",
    userAgent: "Mozilla/5.0 (Android 12; Mobile) Chrome/119.0",
    deviceType: "Mobile",
    os: "Android",
    browser: "Chrome",
    country: "Kenya",
    region: "Coast",
    city: "Mombasa",
    suburb: "Old Town",
    latitude: "-4.0580000",
    longitude: "39.6650000",
    createdAt: hoursAgo(9),
    hitCount: 5,
    repeatCount: 1,
    suspiciousCount: 0,
    billableCount: 5,
  });

  console.log("Creating reward claims...");
  const mobileVodacomA = "+255700000001";
  await prisma.rewardClaim.create({
    data: {
      scanEventId: scanVodacomMixed.id,
      campaignId: campaignVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      mobileNumber: mobileVodacomA,
      mobileNumberHash: sha256(mobileVodacomA),
      mobileNumberLast4: last4(mobileVodacomA),
      status: "APPROVED",
      rewardType: "FREE_DATA",
      providerStatus: "SIMULATED",
      providerResponse: {
        message: "Demo: 5GB free data reward provisioned.",
        reference: "DEMO-VDC-001",
      },
      claimedAt: hoursAgo(5),
      createdAt: hoursAgo(5),
    },
  });
  await prisma.rewardClaimAttempt.create({
    data: {
      scanEventId: scanVodacomMixed.id,
      campaignId: campaignVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      mobileNumberHash: sha256(mobileVodacomA),
      mobileNumberLast4: last4(mobileVodacomA),
      status: "APPROVED",
      ipHash: sha256("demo-reward-ip-vodacom-a"),
      userAgent: "Mozilla/5.0 Demo Reward Claim",
      createdAt: hoursAgo(5),
    },
  });

  const mobileVodacomB = "+255700000002";
  await prisma.rewardClaim.create({
    data: {
      scanEventId: scanVodacomNormal.id,
      campaignId: campaignVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      mobileNumber: mobileVodacomB,
      mobileNumberHash: sha256(mobileVodacomB),
      mobileNumberLast4: last4(mobileVodacomB),
      status: "APPROVED",
      rewardType: "FREE_DATA",
      providerStatus: "SIMULATED",
      providerResponse: {
        message: "Demo: 5GB free data reward provisioned.",
        reference: "DEMO-VDC-002",
      },
      claimedAt: hoursAgo(11),
      createdAt: hoursAgo(11),
    },
  });
  await prisma.rewardClaimAttempt.create({
    data: {
      scanEventId: scanVodacomNormal.id,
      campaignId: campaignVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      mobileNumberHash: sha256(mobileVodacomB),
      mobileNumberLast4: last4(mobileVodacomB),
      status: "APPROVED",
      ipHash: sha256("demo-reward-ip-vodacom-b"),
      userAgent: "Mozilla/5.0 Demo Reward Claim",
      createdAt: hoursAgo(11),
    },
  });

  const mobileDeclined = "+255700000003";
  await prisma.rewardClaimAttempt.create({
    data: {
      scanEventId: scanVodacomNormal.id,
      campaignId: campaignVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      mobileNumberHash: sha256(mobileDeclined),
      mobileNumberLast4: last4(mobileDeclined),
      status: "DECLINED_DUPLICATE",
      failureReason: "A reward was already approved for this campaign and mobile number.",
      ipHash: sha256("demo-reward-ip-duplicate"),
      userAgent: "Mozilla/5.0 Demo Duplicate Reward Attempt",
      createdAt: hoursAgo(10),
    },
  });

  const mobileNCBA = "+254700000010";
  await prisma.rewardClaim.create({
    data: {
      scanEventId: scanNCBA.id,
      campaignId: campaignNCBA.id,
      brandId: brightFoods.id,
      advertiserId: ncba.id,
      mobileNumber: mobileNCBA,
      mobileNumberHash: sha256(mobileNCBA),
      mobileNumberLast4: last4(mobileNCBA),
      status: "APPROVED",
      rewardType: "CASHBACK",
      providerStatus: "SIMULATED",
      providerResponse: {
        message: "Demo: KES 50 cashback simulated.",
        reference: "DEMO-NCBA-001",
      },
      claimedAt: hoursAgo(8),
      createdAt: hoursAgo(8),
    },
  });
  await prisma.rewardClaimAttempt.create({
    data: {
      scanEventId: scanNCBA.id,
      campaignId: campaignNCBA.id,
      brandId: brightFoods.id,
      advertiserId: ncba.id,
      mobileNumberHash: sha256(mobileNCBA),
      mobileNumberLast4: last4(mobileNCBA),
      status: "APPROVED",
      ipHash: sha256("demo-reward-ip-ncba"),
      userAgent: "Mozilla/5.0 Demo Reward Claim",
      createdAt: hoursAgo(8),
    },
  });

  console.log("Creating delivery scans...");
  await prisma.deliveryScan.create({
    data: {
      qrCodeId: deliveryQrDar.id,
      brandId: moBeverages.id,
      campaignId: campaignVodacom.id,
      batchId: batchDarVodacom.id,
      retailerId: kariakoo.id,
      scannedByUserId: retailOps.id,
      cartonsDelivered: 40,
      unitsPerCarton: 24,
      estimatedUnitsDelivered: 960,
      country: "Tanzania",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      suburb: "Kariakoo",
      latitude: "-6.8235000",
      longitude: "39.2695000",
      locationSource: "DEMO_SEED",
      notes: "First drop-off at Kariakoo market depot.",
      createdAt: hoursAgo(72),
    },
  });

  await prisma.deliveryScan.create({
    data: {
      qrCodeId: deliveryQrDar.id,
      brandId: moBeverages.id,
      campaignId: campaignVodacom.id,
      batchId: batchDarVodacom.id,
      retailerId: mlimani.id,
      scannedByUserId: retailOps.id,
      cartonsDelivered: 25,
      unitsPerCarton: 24,
      estimatedUnitsDelivered: 600,
      country: "Tanzania",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      suburb: "Mlimani City",
      latitude: "-6.7700000",
      longitude: "39.2200000",
      locationSource: "DEMO_SEED",
      notes: "Drop-off at Mlimani City supermarket.",
      createdAt: hoursAgo(60),
    },
  });

  await prisma.deliveryScan.create({
    data: {
      qrCodeId: deliveryQrNairobi.id,
      brandId: moBeverages.id,
      campaignId: campaignVodacom.id,
      batchId: batchNairobiVodacom.id,
      retailerId: nairobiCBD.id,
      scannedByUserId: retailOps.id,
      cartonsDelivered: 30,
      unitsPerCarton: 24,
      estimatedUnitsDelivered: 720,
      country: "Kenya",
      region: "Nairobi",
      city: "Nairobi",
      suburb: "CBD",
      latitude: "-1.2830000",
      longitude: "36.8219000",
      locationSource: "DEMO_SEED",
      notes: "Nairobi CBD wholesale drop-off.",
      createdAt: hoursAgo(48),
    },
  });

  await prisma.deliveryScan.create({
    data: {
      qrCodeId: deliveryQrMombasa.id,
      brandId: brightFoods.id,
      campaignId: campaignNCBA.id,
      batchId: batchBrightNCBA.id,
      retailerId: mombasaKiosk.id,
      scannedByUserId: brightRetailOps.id,
      cartonsDelivered: 50,
      unitsPerCarton: 30,
      estimatedUnitsDelivered: 1500,
      country: "Kenya",
      region: "Coast",
      city: "Mombasa",
      suburb: "Old Town",
      latitude: "-4.0580000",
      longitude: "39.6650000",
      locationSource: "DEMO_SEED",
      notes: "Mombasa Old Town kiosk distribution.",
      createdAt: hoursAgo(24),
    },
  });

  console.log("Creating billing summaries...");
  await prisma.billingSummary.create({
    data: {
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      fixedFeePerUnit: "0.0200",
      estimatedUnitsPlaced: 2280,
      fixedFeeTotal: "45.6000",
      engagementFeePerScan: "0.0300",
      totalScanCount: 14,
      uniqueScanCount: 3,
      repeatScanCount: 10,
      suspiciousScanCount: 2,
      internalTestScanCount: 2,
      billableScanCount: 10,
      engagementFeeTotal: "0.3000",
      approvedRewardClaims: 2,
      duplicateRewardDeclines: 1,
      totalAmount: "45.9000",
      currency: "USD",
    },
  });

  await prisma.billingSummary.create({
    data: {
      brandId: brightFoods.id,
      advertiserId: ncba.id,
      campaignId: campaignNCBA.id,
      fixedFeePerUnit: "0.0150",
      estimatedUnitsPlaced: 1500,
      fixedFeeTotal: "22.5000",
      engagementFeePerScan: "0.0250",
      totalScanCount: 5,
      uniqueScanCount: 1,
      repeatScanCount: 1,
      suspiciousScanCount: 0,
      internalTestScanCount: 0,
      billableScanCount: 5,
      engagementFeeTotal: "0.1250",
      approvedRewardClaims: 1,
      duplicateRewardDeclines: 0,
      totalAmount: "22.6250",
      currency: "USD",
    },
  });

  console.log("\n✅ Seed complete.\n");

  console.log("Demo login credentials:");
  console.table([
    { role: "ADMIN", email: "admin@moengage.local", password: DEMO_PASSWORD },
    { role: "BRAND_ADMIN", email: "brand.admin@moengage.local", password: DEMO_PASSWORD },
    { role: "CAMPAIGN_MANAGER", email: "campaign.manager@moengage.local", password: DEMO_PASSWORD },
    { role: "ADVERTISER_VIEWER", email: "advertiser.viewer@moengage.local", password: DEMO_PASSWORD },
    { role: "ADVERTISER_VIEWER", email: "ncba.viewer@moengage.local", password: DEMO_PASSWORD },
    { role: "RETAIL_OPERATIONS", email: "retail.ops@moengage.local", password: DEMO_PASSWORD },
    { role: "RETAIL_OPERATIONS", email: "bright.retail.ops@moengage.local", password: DEMO_PASSWORD },
  ]);

  console.log("\nPublic QR scan URLs:");
  console.log(`Consumer Active: ${APP_BASE_URL}/q/mo-xtra-vodacom-free-5gb`);
  console.log(`Consumer Active: ${APP_BASE_URL}/q/bright-crisp-ncba-cashback`);
  console.log(`Consumer Paused: ${APP_BASE_URL}/q/paused-safeguard-cover-mo-malto`);
  console.log(`Internal Test:   ${APP_BASE_URL}/q/internal-test-mo-xtra-vodacom`);
  console.log(`Delivery Dar:    ${APP_BASE_URL}/d/delivery-moxtra-vodacom-dar-001`);
  console.log(`Delivery Nbi:    ${APP_BASE_URL}/d/delivery-moxtra-vodacom-nbi-001`);
  console.log(`Delivery Msa:    ${APP_BASE_URL}/d/delivery-bfcrisp-ncba-msa-001`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
