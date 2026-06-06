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

  // ─── BRANDS ───────────────────────────────────────────────────────────────
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
      industry: "FMCG Food & Snacks",
      websiteUrl: "https://brightfoods.local",
      status: "ACTIVE",
    },
  });

  // ─── ADVERTISERS ──────────────────────────────────────────────────────────
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
      slug: "ncba",
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

  // ─── PRODUCTS ─────────────────────────────────────────────────────────────
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

  // ─── USERS ────────────────────────────────────────────────────────────────
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

  const ncbaViewer = await prisma.user.create({
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

  // ─── CAMPAIGNS ────────────────────────────────────────────────────────────
  console.log("Creating campaigns...");

  // Campaign 1: Active – Vodacom Free 5GB Data (Mo Beverages)
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

  // Campaign 2: Active – NCBA Cashback (Bright Foods)
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
        "Scan any Bright Crisp pack, register your mobile, and receive simulated KES 50 cashback to your M-Pesa wallet.",
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

  // Campaign 3: Paused – SafeGuard Insurance (Mo Beverages / Mo Malto)
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
        "Eligible Mo Malto consumers can register for a complimentary 30-day personal accident cover from SafeGuard. Demo only.",
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

  // ─── CAMPAIGN ASSIGNMENTS ─────────────────────────────────────────────────
  await prisma.campaignAssignment.create({
    data: { campaignId: campaignVodacom.id, userId: campaignManager.id },
  });
  await prisma.campaignAssignment.create({
    data: { campaignId: campaignNCBA.id, userId: campaignManager.id },
  });

  // ─── BATCHES ──────────────────────────────────────────────────────────────
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

  // ─── QR CODES ─────────────────────────────────────────────────────────────
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
      scanCount: 0,
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
      scanCount: 0,
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
      scanCount: 0,
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
      scanCount: 0,
    },
  });

  const deliveryQrNbi = await prisma.qRCode.create({
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
      scanCount: 0,
    },
  });

  const deliveryQrMsa = await prisma.qRCode.create({
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
      scanCount: 0,
    },
  });

  // Internal test QR (non-billable)
  await prisma.qRCode.create({
    data: {
      code: "internal-test-mo-xtra-qa",
      type: "INTERNAL_TEST",
      status: "ACTIVE",
      brandId: moBeverages.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchDarVodacom.id,
      createdById: admin.id,
      label: "QA Internal Test QR – Mo Xtra",
      destinationUrl: `${APP_BASE_URL}/q/internal-test-mo-xtra-qa`,
      scanCount: 0,
    },
  });

  // Paused QR (shows inactive state)
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
      scanCount: 0,
    },
  });

  // ─── RETAILERS ────────────────────────────────────────────────────────────
  console.log("Creating retailers...");

  const retailerKariakoo = await prisma.retailer.create({
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

  const retailerMlimani = await prisma.retailer.create({
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

  const retailerNairobiCBD = await prisma.retailer.create({
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

  const retailerMombasa = await prisma.retailer.create({
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

  const retailerWestlands = await prisma.retailer.create({
    data: {
      brandId: moBeverages.id,
      name: "Westlands Supermarket",
      type: "SUPERMARKET",
      country: "Kenya",
      region: "Nairobi",
      city: "Nairobi",
      suburb: "Westlands",
      address: "Demo address, Westlands",
      latitude: "-1.2656000",
      longitude: "36.8062000",
    },
  });

  // ─── SCAN EVENTS ──────────────────────────────────────────────────────────
  console.log("Creating scan events...");

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000);

  const createScanHelper = async (args: { data: any }) => {
    const data = args.data;
    const fingerprintKey = data.anonymousVisitorId || data.ipHash || `seed-${Math.random()}`;
    const windowStartedAt = data.createdAt || new Date();
    return prisma.scanEvent.create({
      data: {
        ...data,
        fingerprintKey,
        windowStartedAt,
        firstScanAt: windowStartedAt,
        lastScanAt: windowStartedAt,
        hitCount: 1,
        repeatCount: data.isRepeatScan ? 1 : 0,
        suspiciousCount: data.isSuspicious ? 1 : 0,
        billableCount: data.isBillable ? 1 : 0,
      }
    });
  };

  // --- Vodacom campaign scans ---

  // Visitor A – first unique scan (billable)
  const scanV1 = await createScanHelper({
    data: {
      qrCodeId: consumerQrVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchDarVodacom.id,
      anonymousVisitorId: "demo-visitor-001",
      sessionId: "demo-session-001",
      ipHash: sha256("demo-ip-001"),
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
      locationSource: "DEMO_SEED",
      isRepeatScan: false,
      isSuspicious: false,
      isBillable: true,
      isInternalTest: false,
      createdAt: hoursAgo(48),
    },
  });

  // Visitor A – repeat scan (still billable, but marked repeat)
  await createScanHelper({
    data: {
      qrCodeId: consumerQrVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchDarVodacom.id,
      anonymousVisitorId: "demo-visitor-001",
      sessionId: "demo-session-002",
      ipHash: sha256("demo-ip-001"),
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
      locationSource: "DEMO_SEED",
      isRepeatScan: true,
      isSuspicious: false,
      isBillable: true,
      isInternalTest: false,
      createdAt: hoursAgo(47),
    },
  });

  // Visitor B – unique scan from different location (billable)
  const scanV2 = await createScanHelper({
    data: {
      qrCodeId: consumerQrVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchDarVodacom.id,
      anonymousVisitorId: "demo-visitor-002",
      sessionId: "demo-session-003",
      ipHash: sha256("demo-ip-002"),
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1",
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
      createdAt: hoursAgo(36),
    },
  });

  // Visitor C – unique scan, desktop (billable)
  const scanV3 = await createScanHelper({
    data: {
      qrCodeId: consumerQrVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchNairobiVodacom.id,
      anonymousVisitorId: "demo-visitor-003",
      sessionId: "demo-session-004",
      ipHash: sha256("demo-ip-003"),
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0",
      deviceType: "Desktop",
      os: "Windows",
      browser: "Chrome",
      country: "Kenya",
      region: "Nairobi",
      city: "Nairobi",
      suburb: "CBD",
      latitude: "-1.2830000",
      longitude: "36.8219000",
      locationSource: "DEMO_SEED",
      isRepeatScan: false,
      isSuspicious: false,
      isBillable: true,
      isInternalTest: false,
      createdAt: hoursAgo(24),
    },
  });

  // Visitor D – suspicious: high-frequency visitor (non-billable)
  await createScanHelper({
    data: {
      qrCodeId: consumerQrVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchDarVodacom.id,
      anonymousVisitorId: "demo-suspicious-visitor-001",
      sessionId: "demo-session-sus-001",
      ipHash: sha256("demo-ip-suspicious-001"),
      userAgent: "python-requests/2.31.0",
      deviceType: "Bot/Script",
      os: "Unknown",
      browser: "Unknown",
      country: "Tanzania",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      suburb: "Unknown",
      latitude: "-6.8235000",
      longitude: "39.2695000",
      locationSource: "DEMO_SEED",
      isRepeatScan: true,
      isSuspicious: true,
      suspiciousReason: "HIGH_FREQUENCY_VISITOR",
      isBillable: false,
      isInternalTest: false,
      createdAt: hoursAgo(12),
    },
  });

  // Visitor E – suspicious: same IP, high frequency (non-billable)
  await createScanHelper({
    data: {
      qrCodeId: consumerQrVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchDarVodacom.id,
      anonymousVisitorId: "demo-suspicious-visitor-002",
      sessionId: "demo-session-sus-002",
      ipHash: sha256("demo-ip-suspicious-001"),
      userAgent: "python-requests/2.31.0",
      deviceType: "Bot/Script",
      os: "Unknown",
      browser: "Unknown",
      country: "Tanzania",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      suburb: "Unknown",
      latitude: "-6.8235000",
      longitude: "39.2695000",
      locationSource: "DEMO_SEED",
      isRepeatScan: true,
      isSuspicious: true,
      suspiciousReason: "HIGH_FREQUENCY_VISITOR, HIGH_FREQUENCY_IP",
      isBillable: false,
      isInternalTest: false,
      createdAt: hoursAgo(11),
    },
  });

  // Internal test scan (non-billable, not suspicious)
  await createScanHelper({
    data: {
      qrCodeId: consumerQrVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      productId: moXtra.id,
      batchId: batchDarVodacom.id,
      anonymousVisitorId: "internal-qa-tester",
      sessionId: "demo-session-internal-001",
      ipHash: sha256("internal-ip-001"),
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
      locationSource: "DEMO_SEED",
      isRepeatScan: false,
      isSuspicious: false,
      suspiciousReason: "INTERNAL_TEST_QR",
      isBillable: false,
      isInternalTest: true,
      createdAt: hoursAgo(6),
    },
  });

  // --- NCBA campaign scans ---

  // Visitor F – NCBA unique scan (billable)
  const scanNCBA1 = await createScanHelper({
    data: {
      qrCodeId: consumerQrNCBA.id,
      brandId: brightFoods.id,
      advertiserId: ncba.id,
      campaignId: campaignNCBA.id,
      productId: brightCrisp.id,
      batchId: batchBrightNCBA.id,
      anonymousVisitorId: "demo-visitor-010",
      sessionId: "demo-session-ncba-001",
      ipHash: sha256("demo-ip-010"),
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
      locationSource: "DEMO_SEED",
      isRepeatScan: false,
      isSuspicious: false,
      isBillable: true,
      isInternalTest: false,
      createdAt: hoursAgo(20),
    },
  });

  // Visitor G – NCBA scan from Nairobi (billable)
  await createScanHelper({
    data: {
      qrCodeId: consumerQrNCBA.id,
      brandId: brightFoods.id,
      advertiserId: ncba.id,
      campaignId: campaignNCBA.id,
      productId: brightCrisp.id,
      batchId: batchBrightNCBA.id,
      anonymousVisitorId: "demo-visitor-011",
      sessionId: "demo-session-ncba-002",
      ipHash: sha256("demo-ip-011"),
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6) Safari/604.1",
      deviceType: "Mobile",
      os: "iOS",
      browser: "Safari",
      country: "Kenya",
      region: "Nairobi",
      city: "Nairobi",
      suburb: "Westlands",
      latitude: "-1.2656000",
      longitude: "36.8062000",
      locationSource: "DEMO_SEED",
      isRepeatScan: false,
      isSuspicious: false,
      isBillable: true,
      isInternalTest: false,
      createdAt: hoursAgo(10),
    },
  });

  // ─── REWARD CLAIMS ────────────────────────────────────────────────────────
  console.log("Creating reward claims...");

  // Vodacom – Approved claim (Visitor A)
  const mobileA = "+255700000001";
  await prisma.rewardClaim.create({
    data: {
      scanEventId: scanV1.id,
      campaignId: campaignVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      mobileNumber: mobileA,
      mobileNumberHash: sha256(mobileA),
      mobileNumberLast4: "0001",
      status: "APPROVED",
      rewardType: "FREE_DATA",
      providerStatus: "SIMULATED",
      providerResponse: {
        message: "Demo: 5GB free data reward provisioned.",
        reference: "DEMO-VDC-001",
      },
      claimedAt: hoursAgo(47),
      createdAt: hoursAgo(47),
    },
  });

  // Vodacom – Duplicate claim attempt (Visitor B, same campaign – different mobile, approved)
  const mobileB = "+255700000002";
  await prisma.rewardClaim.create({
    data: {
      scanEventId: scanV2.id,
      campaignId: campaignVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      mobileNumber: mobileB,
      mobileNumberHash: sha256(mobileB),
      mobileNumberLast4: "0002",
      status: "APPROVED",
      rewardType: "FREE_DATA",
      providerStatus: "SIMULATED",
      providerResponse: {
        message: "Demo: 5GB free data reward provisioned.",
        reference: "DEMO-VDC-002",
      },
      claimedAt: hoursAgo(35),
      createdAt: hoursAgo(35),
    },
  });

  // Vodacom – DECLINED DUPLICATE (Visitor C, same mobile as A attempting again)
  // We use scanV3 but same mobile hash as mobileA to simulate the duplicate
  await prisma.rewardClaim.create({
    data: {
      scanEventId: scanV3.id,
      campaignId: campaignVodacom.id,
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      mobileNumberHash: sha256("+255700000003"),
      mobileNumberLast4: "0003",
      status: "DECLINED_DUPLICATE",
      declineReason: "Mobile number +2557000***003 has already claimed a reward for this campaign.",
      rewardType: "FREE_DATA",
      providerStatus: "SIMULATED",
      providerResponse: {
        message: "Demo: Duplicate claim rejected.",
      },
      createdAt: hoursAgo(23),
    },
  });

  // NCBA – Approved claim
  const mobileNCBA1 = "+254700000010";
  await prisma.rewardClaim.create({
    data: {
      scanEventId: scanNCBA1.id,
      campaignId: campaignNCBA.id,
      brandId: brightFoods.id,
      advertiserId: ncba.id,
      mobileNumber: mobileNCBA1,
      mobileNumberHash: sha256(mobileNCBA1),
      mobileNumberLast4: "0010",
      status: "APPROVED",
      rewardType: "CASHBACK",
      providerStatus: "SIMULATED",
      providerResponse: {
        message: "Demo: KES 50 cashback simulated via M-Pesa.",
        reference: "DEMO-NCBA-001",
      },
      claimedAt: hoursAgo(19),
      createdAt: hoursAgo(19),
    },
  });

  // ─── DELIVERY SCANS ───────────────────────────────────────────────────────
  console.log("Creating delivery scans...");

  await prisma.deliveryScan.create({
    data: {
      qrCodeId: deliveryQrDar.id,
      brandId: moBeverages.id,
      campaignId: campaignVodacom.id,
      batchId: batchDarVodacom.id,
      retailerId: retailerKariakoo.id,
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
      retailerId: retailerMlimani.id,
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
      qrCodeId: deliveryQrNbi.id,
      brandId: moBeverages.id,
      campaignId: campaignVodacom.id,
      batchId: batchNairobiVodacom.id,
      retailerId: retailerNairobiCBD.id,
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
      qrCodeId: deliveryQrNbi.id,
      brandId: moBeverages.id,
      campaignId: campaignVodacom.id,
      batchId: batchNairobiVodacom.id,
      retailerId: retailerWestlands.id,
      scannedByUserId: retailOps.id,
      cartonsDelivered: 20,
      unitsPerCarton: 24,
      estimatedUnitsDelivered: 480,
      country: "Kenya",
      region: "Nairobi",
      city: "Nairobi",
      suburb: "Westlands",
      latitude: "-1.2656000",
      longitude: "36.8062000",
      locationSource: "DEMO_SEED",
      notes: "Westlands supermarket top-up.",
      createdAt: hoursAgo(36),
    },
  });

  await prisma.deliveryScan.create({
    data: {
      qrCodeId: deliveryQrMsa.id,
      brandId: brightFoods.id,
      campaignId: campaignNCBA.id,
      batchId: batchBrightNCBA.id,
      retailerId: retailerMombasa.id,
      scannedByUserId: retailOps.id,
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

  // ─── BILLING SUMMARIES ────────────────────────────────────────────────────
  console.log("Creating billing summaries...");

  await prisma.billingSummary.create({
    data: {
      brandId: moBeverages.id,
      advertiserId: vodacom.id,
      campaignId: campaignVodacom.id,
      fixedFeePerUnit: "0.0200",
      estimatedUnitsPlaced: 2760,
      fixedFeeTotal: "55.2000",
      engagementFeePerScan: "0.0300",
      totalScanCount: 7,
      uniqueScanCount: 3,
      repeatScanCount: 1,
      suspiciousScanCount: 2,
      internalTestScanCount: 1,
      billableScanCount: 4,
      engagementFeeTotal: "0.1200",
      approvedRewardClaims: 2,
      duplicateRewardDeclines: 1,
      totalAmount: "55.3200",
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
      totalScanCount: 2,
      uniqueScanCount: 2,
      repeatScanCount: 0,
      suspiciousScanCount: 0,
      internalTestScanCount: 0,
      billableScanCount: 2,
      engagementFeeTotal: "0.0500",
      approvedRewardClaims: 1,
      duplicateRewardDeclines: 0,
      totalAmount: "22.5500",
      currency: "USD",
    },
  });

  // ─── DONE ─────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete.\n");
  console.log("Demo login credentials:");
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
      scope: "Mo Beverages",
    },
    {
      role: "CAMPAIGN_MANAGER",
      email: "campaign.manager@moengage.local",
      password: DEMO_PASSWORD,
      scope: "Vodacom + NCBA campaigns",
    },
    {
      role: "ADVERTISER_VIEWER (Vodacom)",
      email: "advertiser.viewer@moengage.local",
      password: DEMO_PASSWORD,
      scope: "Vodacom",
    },
    {
      role: "ADVERTISER_VIEWER (NCBA)",
      email: "ncba.viewer@moengage.local",
      password: DEMO_PASSWORD,
      scope: "NCBA Bank",
    },
    {
      role: "RETAIL_OPERATIONS",
      email: "retail.ops@moengage.local",
      password: DEMO_PASSWORD,
      scope: "Mo Beverages deliveries",
    },
  ]);

  console.log("\nPublic QR scan URLs:");
  console.log(`  Consumer (Active): ${APP_BASE_URL}/q/mo-xtra-vodacom-free-5gb`);
  console.log(`  Consumer (Active): ${APP_BASE_URL}/q/bright-crisp-ncba-cashback`);
  console.log(`  Consumer (Paused): ${APP_BASE_URL}/q/paused-safeguard-cover-mo-malto`);
  console.log(`  Delivery (Dar):    ${APP_BASE_URL}/d/delivery-moxtra-vodacom-dar-001`);
  console.log(`  Delivery (Nbi):    ${APP_BASE_URL}/d/delivery-moxtra-vodacom-nbi-001`);
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
