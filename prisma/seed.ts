// prisma/seed.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DIRECT_URL or DATABASE_URL is required to seed the database.",
  );
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

async function resetDemoData() {
  console.log("Resetting demo data...");

  await prisma.reportExport.deleteMany();
  await prisma.billingSummary.deleteMany();
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
}

async function main() {
  await resetDemoData();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Creating brand...");

  const brand = await prisma.brand.create({
    data: {
      name: "Mo Beverages",
      slug: "mo-beverages",
      industry: "FMCG Beverages",
      websiteUrl: "https://moengage.local",
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
      name: "NCBA",
      slug: "ncba",
      industry: "Banking",
      contactName: "NCBA Demo Contact",
      contactEmail: "demo.ncba@moengage.local",
      status: "ACTIVE",
    },
  });

  console.log("Creating products...");

  const moXtra = await prisma.product.create({
    data: {
      brandId: brand.id,
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
      brandId: brand.id,
      name: "Mo Malto 330ml Can",
      slug: "mo-malto-330ml-can",
      sku: "MO-MALTO-330",
      category: "Malt Drink",
      unitLabel: "can",
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

  const brandAdmin = await prisma.user.create({
    data: {
      name: "Mo Beverages Brand Admin",
      email: "brand.admin@moengage.local",
      passwordHash,
      role: "BRAND_ADMIN",
      brandId: brand.id,
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
      brandId: brand.id,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const advertiserViewer = await prisma.user.create({
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

  const retailOps = await prisma.user.create({
    data: {
      name: "Retail Operations User",
      email: "retail.ops@moengage.local",
      passwordHash,
      role: "RETAIL_OPERATIONS",
      brandId: brand.id,
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log("Creating campaign...");

  const campaign = await prisma.campaign.create({
    data: {
      brandId: brand.id,
      advertiserId: vodacom.id,
      productId: moXtra.id,
      createdById: admin.id,
      name: "Vodacom Free 5GB Data Campaign",
      slug: "vodacom-free-5gb-data",
      offerTitle: "Scan to Claim Free 5GB Data",
      offerDescription:
        "Demo reward flow for investor presentation. Consumers scan, enter mobile number, verify OTP, and claim simulated free data.",
      rewardType: "FREE_DATA",
      status: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      fixedFeePerUnit: "0.0200",
      engagementFeePerScan: "0.0300",
      currency: "USD",
      rewardLimitType: "ONE_PER_MOBILE_PER_CAMPAIGN",
      maxClaimsPerMobile: 1,
    },
  });

  await prisma.campaignAssignment.create({
    data: {
      campaignId: campaign.id,
      userId: campaignManager.id,
    },
  });

  console.log("Creating batch...");

  const batch = await prisma.batch.create({
    data: {
      brandId: brand.id,
      campaignId: campaign.id,
      productId: moXtra.id,
      batchCode: "MOXTRA-VODACOM-DAR-001",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      estimatedUnitCount: 2400,
      unitsPerCarton: 24,
      status: "ACTIVE",
    },
  });

  console.log("Creating QR codes...");

  const consumerQr = await prisma.qRCode.create({
    data: {
      code: "mo-xtra-vodacom-free-5gb",
      type: "CONSUMER_CAMPAIGN",
      status: "ACTIVE",
      brandId: brand.id,
      advertiserId: vodacom.id,
      campaignId: campaign.id,
      productId: moXtra.id,
      batchId: batch.id,
      createdById: admin.id,
      label: "Mo Xtra Vodacom Consumer Campaign QR",
      destinationUrl: `${APP_BASE_URL}/q/mo-xtra-vodacom-free-5gb`,
      scanCount: 3,
    },
  });

  await prisma.qRCode.create({
    data: {
      code: "sample-label-mo-xtra-vodacom",
      type: "SAMPLE_LABEL",
      status: "ACTIVE",
      brandId: brand.id,
      advertiserId: vodacom.id,
      campaignId: campaign.id,
      productId: moXtra.id,
      batchId: batch.id,
      createdById: admin.id,
      label: "Sample Wrapped Can Label QR",
      destinationUrl: `${APP_BASE_URL}/q/sample-label-mo-xtra-vodacom`,
      scanCount: 0,
    },
  });

  const deliveryQr = await prisma.qRCode.create({
    data: {
      code: "delivery-moxtra-vodacom-dar-001",
      type: "BATCH_DELIVERY",
      status: "ACTIVE",
      brandId: brand.id,
      advertiserId: vodacom.id,
      campaignId: campaign.id,
      productId: moXtra.id,
      batchId: batch.id,
      createdById: admin.id,
      label: "Mo Xtra Vodacom Batch Delivery QR",
      destinationUrl: `${APP_BASE_URL}/d/delivery-moxtra-vodacom-dar-001`,
      scanCount: 1,
    },
  });

  console.log("Creating retailers...");

  const retailerOne = await prisma.retailer.create({
    data: {
      brandId: brand.id,
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

  const retailerTwo = await prisma.retailer.create({
    data: {
      brandId: brand.id,
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

  console.log("Creating delivery scan...");

  await prisma.deliveryScan.create({
    data: {
      qrCodeId: deliveryQr.id,
      brandId: brand.id,
      campaignId: campaign.id,
      batchId: batch.id,
      retailerId: retailerOne.id,
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
      notes: "Seeded demo delivery scan.",
    },
  });

  await prisma.deliveryScan.create({
    data: {
      qrCodeId: deliveryQr.id,
      brandId: brand.id,
      campaignId: campaign.id,
      batchId: batch.id,
      retailerId: retailerTwo.id,
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
      notes: "Seeded demo delivery scan.",
    },
  });

  console.log("Creating scan events...");

  const scanOne = await prisma.scanEvent.create({
    data: {
      qrCodeId: consumerQr.id,
      brandId: brand.id,
      advertiserId: vodacom.id,
      campaignId: campaign.id,
      productId: moXtra.id,
      batchId: batch.id,
      anonymousVisitorId: "demo-visitor-001",
      sessionId: "demo-session-001",
      ipHash: sha256("demo-ip-001"),
      userAgent: "Mozilla/5.0 Demo Browser",
      deviceType: "Mobile",
      os: "Android",
      browser: "Chrome",
      country: "Tanzania",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      suburb: "Kariakoo",
      latitude: "-6.8235000",
      longitude: "39.2695000",
      locationSource: "DEMO_SEED",
      isRepeatScan: false,
      isSuspicious: false,
      isBillable: true,
      isInternalTest: false,
    },
  });

  await prisma.scanEvent.create({
    data: {
      qrCodeId: consumerQr.id,
      brandId: brand.id,
      advertiserId: vodacom.id,
      campaignId: campaign.id,
      productId: moXtra.id,
      batchId: batch.id,
      anonymousVisitorId: "demo-visitor-001",
      sessionId: "demo-session-002",
      ipHash: sha256("demo-ip-001"),
      userAgent: "Mozilla/5.0 Demo Browser",
      deviceType: "Mobile",
      os: "Android",
      browser: "Chrome",
      country: "Tanzania",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      suburb: "Kariakoo",
      latitude: "-6.8235000",
      longitude: "39.2695000",
      locationSource: "DEMO_SEED",
      isRepeatScan: true,
      isSuspicious: false,
      isBillable: true,
      isInternalTest: false,
    },
  });

  await prisma.scanEvent.create({
    data: {
      qrCodeId: consumerQr.id,
      brandId: brand.id,
      advertiserId: vodacom.id,
      campaignId: campaign.id,
      productId: moXtra.id,
      batchId: batch.id,
      anonymousVisitorId: "demo-visitor-002",
      sessionId: "demo-session-003",
      ipHash: sha256("demo-ip-002"),
      userAgent: "Mozilla/5.0 iPhone Safari",
      deviceType: "Mobile",
      os: "iOS",
      browser: "Safari",
      country: "Tanzania",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      suburb: "Mlimani City",
      latitude: "-6.7700000",
      longitude: "39.2200000",
      locationSource: "DEMO_SEED",
      isRepeatScan: false,
      isSuspicious: false,
      isBillable: true,
      isInternalTest: false,
    },
  });

  console.log("Creating reward claim...");

  const mobileNumber = "+255700000001";
  const mobileNumberHash = sha256(mobileNumber);

  await prisma.rewardClaim.create({
    data: {
      scanEventId: scanOne.id,
      campaignId: campaign.id,
      brandId: brand.id,
      advertiserId: vodacom.id,
      mobileNumber,
      mobileNumberHash,
      mobileNumberLast4: "0001",
      status: "APPROVED",
      rewardType: "FREE_DATA",
      providerStatus: "SIMULATED",
      providerResponse: {
        message: "Demo free-data reward marked as claimed.",
      },
      claimedAt: new Date(),
    },
  });

  console.log("Creating billing summary...");

  await prisma.billingSummary.create({
    data: {
      brandId: brand.id,
      advertiserId: vodacom.id,
      campaignId: campaign.id,
      fixedFeePerUnit: "0.0200",
      estimatedUnitsPlaced: 1560,
      fixedFeeTotal: "31.2000",
      engagementFeePerScan: "0.0300",
      totalScanCount: 3,
      uniqueScanCount: 2,
      repeatScanCount: 1,
      suspiciousScanCount: 0,
      internalTestScanCount: 0,
      billableScanCount: 3,
      engagementFeeTotal: "0.0900",
      approvedRewardClaims: 1,
      duplicateRewardDeclines: 0,
      totalAmount: "31.2900",
      currency: "USD",
    },
  });

  console.log("\nSeed complete.");
  console.log("\nDemo login credentials:");
  console.table([
    {
      role: "ADMIN",
      email: "admin@moengage.local",
      password: DEMO_PASSWORD,
    },
    {
      role: "BRAND_ADMIN",
      email: "brand.admin@moengage.local",
      password: DEMO_PASSWORD,
    },
    {
      role: "CAMPAIGN_MANAGER",
      email: "campaign.manager@moengage.local",
      password: DEMO_PASSWORD,
    },
    {
      role: "ADVERTISER_VIEWER",
      email: "advertiser.viewer@moengage.local",
      password: DEMO_PASSWORD,
    },
    {
      role: "RETAIL_OPERATIONS",
      email: "retail.ops@moengage.local",
      password: DEMO_PASSWORD,
    },
  ]);
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
