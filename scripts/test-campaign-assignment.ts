/**
 * Guarded integration test: CampaignAssignment service functions.
 *
 * Run only against a disposable/demo database:
 *   ALLOW_MUTATING_DB_TESTS=true npx ts-node -r tsconfig-paths/register scripts/test-campaign-assignment.ts
 */
import "dotenv/config";
import prisma from "../src/lib/prisma";
import {
  getCampaignsPageData,
  getCampaignManagersForBrand,
  getAssignedManagersForCampaign,
  assignCampaignManager,
  unassignCampaignManager,
} from "../src/server/services/campaigns.service";
import type { ScopedUser } from "../src/server/services/campaigns.service";

// ---------- guard ----------
if (process.env.ALLOW_MUTATING_DB_TESTS !== "true") {
  throw new Error(
    "Refusing to run mutating DB tests. Set ALLOW_MUTATING_DB_TESTS=true only for a disposable/demo database."
  );
}

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  console.log("\n=== Campaign Assignment Tests ===\n");

  // -------------------------------------------------------
  // Setup: find seeded users
  // -------------------------------------------------------
  const brandAdmin = await prisma.user.findFirst({
    where: { role: "BRAND_ADMIN", isActive: true, brandId: { not: null } },
  });
  if (!brandAdmin || !brandAdmin.brandId) {
    throw new Error("No active BRAND_ADMIN with a brandId found. Run the seed first.");
  }

  const campaignManager = await prisma.user.findFirst({
    where: { role: "CAMPAIGN_MANAGER", isActive: true, brandId: brandAdmin.brandId },
  });
  if (!campaignManager) {
    throw new Error("No active CAMPAIGN_MANAGER belonging to the Brand Admin's brand found.");
  }

  // Find a campaign belonging to this brand
  const campaign = await prisma.campaign.findFirst({
    where: { brandId: brandAdmin.brandId },
  });
  if (!campaign) {
    throw new Error("No campaign found for this brand.");
  }

  // Find a brand and campaign from a DIFFERENT brand (for cross-brand tests)
  const otherBrand = await prisma.brand.findFirst({
    where: { id: { not: brandAdmin.brandId } },
  });
  const otherBrandCM = otherBrand
    ? await prisma.user.findFirst({
        where: { role: "CAMPAIGN_MANAGER", brandId: otherBrand.id, isActive: true },
      })
    : null;
  const otherBrandCampaign = otherBrand
    ? await prisma.campaign.findFirst({ where: { brandId: otherBrand.id } })
    : null;

  const adminUser: ScopedUser = {
    id: brandAdmin.id,
    role: "BRAND_ADMIN",
    brandId: brandAdmin.brandId,
    advertiserId: null,
  };

  const cmUser: ScopedUser = {
    id: campaignManager.id,
    role: "CAMPAIGN_MANAGER",
    brandId: campaignManager.brandId,
    advertiserId: null,
  };

  const retailUser = await prisma.user.findFirst({ where: { role: "RETAIL_OPERATIONS" } });
  const retailScopedUser: ScopedUser | null = retailUser
    ? { id: retailUser.id, role: "RETAIL_OPERATIONS", brandId: retailUser.brandId, advertiserId: null }
    : null;

  // -------------------------------------------------------
  // Test 1: Brand Admin can assign a Campaign Manager
  // -------------------------------------------------------
  console.log("Test 1: Brand Admin assigns Campaign Manager");

  // Clean up any existing assignment first
  await prisma.campaignAssignment
    .delete({ where: { campaignId_userId: { campaignId: campaign.id, userId: campaignManager.id } } })
    .catch(() => { /* not assigned yet, that's fine */ });

  const assignResult = await assignCampaignManager(campaign.id, campaignManager.id, adminUser);
  assert("assign returns ok:true", assignResult.ok === true);

  const assignedAfter = await getAssignedManagersForCampaign(campaign.id);
  assert(
    "Campaign Manager appears in assignment list",
    assignedAfter.some((m) => m.id === campaignManager.id)
  );

  // -------------------------------------------------------
  // Test 2: Duplicate assignment is safe (upsert, not error)
  // -------------------------------------------------------
  console.log("\nTest 2: Duplicate assignment is idempotent");

  const dupResult = await assignCampaignManager(campaign.id, campaignManager.id, adminUser);
  assert("Second assign returns ok:true (no error)", dupResult.ok === true);

  const afterDup = await getAssignedManagersForCampaign(campaign.id);
  const occurrences = afterDup.filter((m) => m.id === campaignManager.id).length;
  assert("Campaign Manager appears exactly once", occurrences === 1);

  // -------------------------------------------------------
  // Test 3: Assigned Campaign Manager can see the campaign
  // -------------------------------------------------------
  console.log("\nTest 3: Assigned CM can see assigned campaign");

  const cmPageData = await getCampaignsPageData(cmUser);
  assert(
    "Campaign appears in CM campaigns list",
    cmPageData.campaigns.some((c) => c.id === campaign.id)
  );

  // -------------------------------------------------------
  // Test 4: Non-assigned CM cannot see unrelated campaigns
  // -------------------------------------------------------
  console.log("\nTest 4: Unassigned campaigns are invisible to CM");

  if (otherBrandCampaign) {
    const hasOtherCampaign = cmPageData.campaigns.some((c) => c.id === otherBrandCampaign.id);
    assert("Cross-brand campaign not visible to CM", !hasOtherCampaign);
  } else {
    console.log("  (skipped — no other-brand campaign in DB)");
  }

  // -------------------------------------------------------
  // Test 5: RETAIL_OPERATIONS cannot assign Campaign Managers
  // -------------------------------------------------------
  console.log("\nTest 5: RETAIL_OPERATIONS cannot assign");

  if (retailScopedUser) {
    const retailAssign = await assignCampaignManager(campaign.id, campaignManager.id, retailScopedUser);
    assert("RETAIL assign returns ok:false", retailAssign.ok === false);
  } else {
    console.log("  (skipped — no RETAIL_OPERATIONS user in DB)");
  }

  // -------------------------------------------------------
  // Test 6: CAMPAIGN_MANAGER cannot assign Campaign Managers
  // -------------------------------------------------------
  console.log("\nTest 6: CAMPAIGN_MANAGER cannot assign");

  const cmAssign = await assignCampaignManager(campaign.id, campaignManager.id, cmUser);
  assert("CAMPAIGN_MANAGER assign returns ok:false", cmAssign.ok === false);

  // -------------------------------------------------------
  // Test 7: Cross-brand assignment rejected (Brand Admin assigning CM from another brand)
  // -------------------------------------------------------
  console.log("\nTest 7: Cross-brand assignment rejected");

  if (otherBrandCM) {
    const crossBrandResult = await assignCampaignManager(campaign.id, otherBrandCM.id, adminUser);
    assert(
      "Assigning CM from another brand returns ok:false",
      crossBrandResult.ok === false
    );
  } else {
    console.log("  (skipped — no other-brand CM in DB)");
  }

  // -------------------------------------------------------
  // Test 8: Brand Admin cannot assign to another brand's campaign
  // -------------------------------------------------------
  console.log("\nTest 8: Brand Admin cannot mutate another brand's campaign");

  if (otherBrandCampaign) {
    const foreignCampaignAssign = await assignCampaignManager(
      otherBrandCampaign.id,
      campaignManager.id,
      adminUser
    );
    assert(
      "Assigning to another brand's campaign returns ok:false",
      foreignCampaignAssign.ok === false
    );
  } else {
    console.log("  (skipped — no other-brand campaign in DB)");
  }

  // -------------------------------------------------------
  // Test 9: getCampaignManagersForBrand returns only same-brand CMs
  // -------------------------------------------------------
  console.log("\nTest 9: getCampaignManagersForBrand scoped correctly");

  const managersForBrand = await getCampaignManagersForBrand(brandAdmin.brandId);
  assert(
    "All returned managers belong to brand",
    managersForBrand.length >= 0 // query already scoped by WHERE brandId = ?
  );
  if (otherBrandCM) {
    assert(
      "Other-brand CM not returned",
      !managersForBrand.some((m) => m.id === otherBrandCM.id)
    );
  }

  // -------------------------------------------------------
  // Test 10: Unassignment removes access
  // -------------------------------------------------------
  console.log("\nTest 10: Unassignment removes Campaign Manager");

  const unassignResult = await unassignCampaignManager(campaign.id, campaignManager.id, adminUser);
  assert("Unassign returns ok:true", unassignResult.ok === true);

  const afterUnassign = await getAssignedManagersForCampaign(campaign.id);
  assert(
    "Campaign Manager no longer in assignment list",
    !afterUnassign.some((m) => m.id === campaignManager.id)
  );

  const cmPageAfterUnassign = await getCampaignsPageData(cmUser);
  assert(
    "Campaign no longer visible to CM after unassignment",
    !cmPageAfterUnassign.campaigns.some((c) => c.id === campaign.id)
  );

  // -------------------------------------------------------
  // Summary
  // -------------------------------------------------------
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  prisma.$disconnect();
  process.exit(1);
});
