import "dotenv/config";
import prisma from "../src/lib/prisma";
import {
  getCampaignsPageData,
  updateCampaign,
  archiveCampaign
} from "../src/server/services/campaigns.service";
import {
  createBatch,
  updateBatch,
  closeBatch
} from "../src/server/services/batches.service";
import {
  updateQRCode,
  disableQRCode,
  generateQRCodeDownloadData,
  createQRCode
} from "../src/server/services/qr-codes.service";
import { getAdminHeatmapData } from "../src/server/services/heatmaps.service";
import { getRoleScopeFilters, getAssignedCampaignIds } from "../src/lib/auth/role-scope";
import type { CurrentUser } from "../src/lib/auth/get-current-user";

async function main() {
  // 1. Safety Guard
  if (process.env.ALLOW_MUTATING_DB_TESTS !== "true") {
    throw new Error(
      "Refusing to run an authorization mutation test. Set ALLOW_MUTATING_DB_TESTS=true only for a disposable/demo database."
    );
  }

  console.log("Starting authorization and scoping verification tests...");

  // Fetch the Campaign Manager user from seed
  const campaignManagerUser = await prisma.user.findFirst({
    where: { role: "CAMPAIGN_MANAGER" },
  });

  if (!campaignManagerUser) {
    throw new Error("No Campaign Manager user found in database. Please seed first.");
  }

  console.log(`Testing with Campaign Manager user: ${campaignManagerUser.name} (${campaignManagerUser.email})`);

  const scopedUser = {
    id: campaignManagerUser.id,
    role: campaignManagerUser.role,
    brandId: campaignManagerUser.brandId,
    advertiserId: campaignManagerUser.advertiserId,
  };

  const currentUser: CurrentUser = {
    id: campaignManagerUser.id,
    name: campaignManagerUser.name,
    email: campaignManagerUser.email,
    role: "CAMPAIGN_MANAGER",
    isEmailVerified: campaignManagerUser.isEmailVerified,
    brandId: campaignManagerUser.brandId,
    advertiserId: campaignManagerUser.advertiserId,
  };

  // Get assigned campaigns
  const assignedCampaignIds = await getAssignedCampaignIds(campaignManagerUser.id);
  console.log("Assigned Campaign IDs:", assignedCampaignIds);
  if (assignedCampaignIds.length === 0) {
    throw new Error("Seeded Campaign Manager has 0 assigned campaigns. Cannot perform visibility tests.");
  }

  // Find an unassigned campaign
  const unassignedCampaign = await prisma.campaign.findFirst({
    where: {
      id: { notIn: assignedCampaignIds },
    },
  });

  if (!unassignedCampaign) {
    throw new Error("No unassigned campaigns found in the database. Cannot perform authorization tests.");
  }
  console.log(`Unassigned Campaign Found: ${unassignedCampaign.name} (${unassignedCampaign.id})`);

  // Track created records for cleanup
  const cleanups = {
    campaignAssignments: [] as { campaignId: string; userId: string }[],
    campaigns: [] as string[],
    batches: [] as string[],
    qrCodes: [] as string[],
  };

  try {
    // ==========================================
    // PART 1: UNAUTHORIZED OPERATIONS (NEGATIVE TESTS)
    // ==========================================

    // --- Campaign Tests ---
    console.log("\n--- Testing Campaigns Scoping (Negative) ---");
    
    // A. Visibility Check
    const campaignsData = await getCampaignsPageData(scopedUser);
    const visibleCampaignIds = campaignsData.campaigns.map((c) => c.id);
    console.log("Visible Campaign IDs:", visibleCampaignIds);

    for (const id of visibleCampaignIds) {
      if (!assignedCampaignIds.includes(id)) {
        throw new Error(`Security Leak: Campaign ${id} is visible but not assigned!`);
      }
    }
    console.log("✔ Assigned campaigns are visible.");

    if (visibleCampaignIds.includes(unassignedCampaign.id)) {
      throw new Error("Security Leak: Unassigned campaign is visible to Campaign Manager!");
    }
    console.log("✔ Unassigned campaign is hidden.");

    // B. Update Unassigned (Negative)
    const originalUnassigned = await prisma.campaign.findUnique({
      where: { id: unassignedCampaign.id },
    });
    if (!originalUnassigned) throw new Error("Unassigned campaign disappeared!");

    const validUnassignedPayload = {
      brandId: unassignedCampaign.brandId,
      advertiserId: unassignedCampaign.advertiserId,
      productId: unassignedCampaign.productId ?? undefined,
      name: "Valid Campaign Mutation Attempt",
      slug: unassignedCampaign.slug,
      offerTitle: unassignedCampaign.offerTitle,
      offerDescription: unassignedCampaign.offerDescription ?? undefined,
      rewardType: unassignedCampaign.rewardType,
      status: unassignedCampaign.status,
      startDate: unassignedCampaign.startDate ? unassignedCampaign.startDate.toISOString().split("T")[0] : undefined,
      endDate: unassignedCampaign.endDate ? unassignedCampaign.endDate.toISOString().split("T")[0] : undefined,
      fixedFeePerUnit: unassignedCampaign.fixedFeePerUnit ? unassignedCampaign.fixedFeePerUnit.toString() : undefined,
      engagementFeePerScan: unassignedCampaign.engagementFeePerScan ? unassignedCampaign.engagementFeePerScan.toString() : undefined,
      currency: unassignedCampaign.currency,
      maxClaimsPerMobile: unassignedCampaign.maxClaimsPerMobile,
    };

    const negCampaignUpdateResult = await updateCampaign(unassignedCampaign.id, validUnassignedPayload, scopedUser);
    
    // Assert exactly rejected due to auth, not validation
    if (negCampaignUpdateResult.ok) {
      throw new Error("Security Leak: Campaign Manager successfully updated an unassigned campaign!");
    }
    if (negCampaignUpdateResult.error !== "Campaign not found") {
      throw new Error(`Test Failure: Expected 'Campaign not found' for unassigned campaign update, but got '${negCampaignUpdateResult.error}'`);
    }

    // Verify no mutation occurred
    const postUnassignedUpdate = await prisma.campaign.findUnique({
      where: { id: unassignedCampaign.id },
    });
    if (postUnassignedUpdate?.name !== originalUnassigned.name) {
      throw new Error("Security Breach: Database row modified despite rejected updateCampaign call!");
    }
    console.log("✔ Unassigned campaign update rejected & row unchanged.");

    // C. Brand Ownership Modification Check (Negative)
    const assignedCampaign = await prisma.campaign.findFirst({
      where: { id: { in: assignedCampaignIds } },
    });
    if (assignedCampaign) {
      const originalAssigned = await prisma.campaign.findUnique({
        where: { id: assignedCampaign.id },
      });
      if (!originalAssigned) throw new Error("Assigned campaign disappeared!");

      const ownershipModifyInput = {
        brandId: "hacked-brand-id", // Attempt to change brandId
        advertiserId: assignedCampaign.advertiserId,
        productId: assignedCampaign.productId ?? undefined,
        name: assignedCampaign.name,
        slug: assignedCampaign.slug,
        offerTitle: assignedCampaign.offerTitle,
        offerDescription: assignedCampaign.offerDescription ?? undefined,
        rewardType: assignedCampaign.rewardType,
        status: assignedCampaign.status,
        startDate: assignedCampaign.startDate ? assignedCampaign.startDate.toISOString().split("T")[0] : undefined,
        endDate: assignedCampaign.endDate ? assignedCampaign.endDate.toISOString().split("T")[0] : undefined,
        fixedFeePerUnit: assignedCampaign.fixedFeePerUnit ? assignedCampaign.fixedFeePerUnit.toString() : undefined,
        engagementFeePerScan: assignedCampaign.engagementFeePerScan ? assignedCampaign.engagementFeePerScan.toString() : undefined,
        currency: assignedCampaign.currency,
        maxClaimsPerMobile: assignedCampaign.maxClaimsPerMobile,
      };

      const negOwnershipResult = await updateCampaign(assignedCampaign.id, ownershipModifyInput, scopedUser);
      if (negOwnershipResult.ok) {
        throw new Error("Security Leak: Campaign Manager successfully changed the brandId of an assigned campaign!");
      }
      if (negOwnershipResult.error !== "Unauthorized to change brand ownership") {
        throw new Error(`Test Failure: Expected 'Unauthorized to change brand ownership' but got '${negOwnershipResult.error}'`);
      }

      // Verify no mutation occurred
      const postOwnership = await prisma.campaign.findUnique({
        where: { id: assignedCampaign.id },
      });
      if (postOwnership?.brandId !== originalAssigned.brandId) {
        throw new Error("Security Breach: Database brandId changed despite rejected updateCampaign call!");
      }
      console.log("✔ Assigned campaign brand modification rejected & row unchanged.");
    }

    // D. Archive Check on Unassigned Campaign (Negative)
    const originalArchiveState = await prisma.campaign.findUnique({
      where: { id: unassignedCampaign.id },
    });
    if (!originalArchiveState) throw new Error("Unassigned campaign disappeared!");

    const negArchiveResult = await archiveCampaign(unassignedCampaign.id, scopedUser);
    if (negArchiveResult.ok) {
      throw new Error("Security Leak: Campaign Manager successfully archived an unassigned campaign!");
    }
    if (negArchiveResult.error !== "Campaign not found") {
      throw new Error(`Test Failure: Expected 'Campaign not found' but got '${negArchiveResult.error}'`);
    }

    // Verify no mutation occurred
    const postArchive = await prisma.campaign.findUnique({
      where: { id: unassignedCampaign.id },
    });
    if (postArchive?.status !== originalArchiveState.status) {
      throw new Error("Security Breach: Campaign status modified despite rejected archiveCampaign call!");
    }
    console.log("✔ Unassigned campaign archiving rejected & status unchanged.");


    // --- Batch Tests ---
    console.log("\n--- Testing Batches Scoping (Negative) ---");

    // A. Create Batch on Unassigned Campaign (Negative)
    const batchCountBefore = await prisma.batch.count();
    const batchInput = {
      brandId: unassignedCampaign.brandId,
      campaignId: unassignedCampaign.id,
      productId: unassignedCampaign.productId ?? undefined,
      batchCode: "UNAUTH_BATCH_CODE",
      region: "Region",
      city: "City",
      estimatedUnitCount: 100,
      unitsPerCarton: 10,
      status: "ACTIVE" as const,
    };
    const negBatchCreateResult = await createBatch(batchInput, scopedUser);
    if (negBatchCreateResult.ok) {
      throw new Error("Security Leak: Campaign Manager created a batch for an unassigned campaign!");
    }
    if (negBatchCreateResult.error !== "Unauthorized to create batch for this campaign") {
      throw new Error(`Test Failure: Expected 'Unauthorized to create batch for this campaign' but got '${negBatchCreateResult.error}'`);
    }

    // Verify no mutation occurred
    const batchCountAfter = await prisma.batch.count();
    if (batchCountBefore !== batchCountAfter) {
      throw new Error("Security Breach: A new batch record was created in the database despite rejected createBatch call!");
    }
    console.log("✔ Batch creation on unassigned campaign rejected & row count unchanged.");

    // B. Update Batch belonging to Unassigned Campaign (Negative)
    const dummyBatchId = "cmq64oull0000000000000000";
    const batchUpdateInput = {
      brandId: unassignedCampaign.brandId,
      campaignId: unassignedCampaign.id,
      productId: unassignedCampaign.productId ?? undefined,
      batchCode: "DUMMY_CODE",
      region: "Updated Region",
      city: "Updated City",
      estimatedUnitCount: 200,
      unitsPerCarton: 20,
      status: "ACTIVE" as const,
    };
    const negBatchUpdateResult = await updateBatch(dummyBatchId, batchUpdateInput, scopedUser);
    if (negBatchUpdateResult.ok) {
      throw new Error("Security Leak: Campaign Manager successfully updated a batch belonging to an unassigned campaign!");
    }
    if (negBatchUpdateResult.error !== "Batch not found") {
      throw new Error(`Test Failure: Expected 'Batch not found' but got '${negBatchUpdateResult.error}'`);
    }
    console.log("✔ Batch update on unassigned campaign rejected.");

    // C. Update Batch campaign pointer swap to Unassigned (Negative)
    const assignedBatch = await prisma.batch.findFirst({
      where: { campaignId: { in: assignedCampaignIds } },
    });
    if (assignedBatch) {
      const originalAssignedBatch = await prisma.batch.findUnique({
        where: { id: assignedBatch.id },
      });
      if (!originalAssignedBatch) throw new Error("Assigned batch disappeared!");

      const batchHackedCampaignInput = {
        brandId: assignedBatch.brandId,
        campaignId: unassignedCampaign.id, // change pointer to unassigned campaign
        productId: assignedBatch.productId ?? undefined,
        batchCode: assignedBatch.batchCode,
        region: "Region",
        city: "City",
        estimatedUnitCount: 100,
        unitsPerCarton: 10,
        status: "ACTIVE" as const,
      };
      const negBatchHackedCampResult = await updateBatch(assignedBatch.id, batchHackedCampaignInput, scopedUser);
      if (negBatchHackedCampResult.ok) {
        throw new Error("Security Leak: Campaign Manager updated an assigned batch to point to an unassigned campaign!");
      }
      if (negBatchHackedCampResult.error !== "Batch not found") {
        throw new Error(`Test Failure: Expected 'Batch not found' but got '${negBatchHackedCampResult.error}'`);
      }

      // Verify no mutation occurred
      const postBatchUpdate = await prisma.batch.findUnique({
        where: { id: assignedBatch.id },
      });
      if (postBatchUpdate?.campaignId !== originalAssignedBatch.campaignId) {
        throw new Error("Security Breach: Batch campaignId changed despite rejected updateBatch call!");
      }
      console.log("✔ Batch update campaign pointer swap rejected & row unchanged.");
    }

    // D. Close Batch belonging to Unassigned Campaign (Negative)
    const negBatchCloseResult = await closeBatch(dummyBatchId, scopedUser);
    if (negBatchCloseResult.ok) {
      throw new Error("Security Leak: Campaign Manager closed a batch belonging to an unassigned campaign!");
    }
    if (negBatchCloseResult.error !== "Batch not found") {
      throw new Error(`Test Failure: Expected 'Batch not found' but got '${negBatchCloseResult.error}'`);
    }
    console.log("✔ Batch close on unassigned campaign rejected.");


    // --- QR Code Tests ---
    console.log("\n--- Testing QR Code Scoping (Negative) ---");

    // A. Create QR code for unassigned campaign
    const unauthorizedQrCode = `QR_CM_UNASSIGNED_${Date.now()}`;
    const qrCreateCountBefore = await prisma.qRCode.count();
    const qrCreateResult = await createQRCode({
      brandId: unassignedCampaign.brandId,
      advertiserId: unassignedCampaign.advertiserId,
      campaignId: unassignedCampaign.id,
      productId: unassignedCampaign.productId ?? undefined,
      code: unauthorizedQrCode,
      type: "CONSUMER_CAMPAIGN",
      status: "ACTIVE",
      label: "Unauthorized QR Create Attempt",
    }, scopedUser);
    if (qrCreateResult.ok) {
      throw new Error("Security Leak: Campaign Manager created a QR code for an unassigned campaign!");
    }
    if (qrCreateResult.error !== "QR Code not found") {
      throw new Error(`Test Failure: Expected 'QR Code not found' for unassigned QR create, but got '${qrCreateResult.error}'`);
    }
    const qrCreateCountAfter = await prisma.qRCode.count();
    if (qrCreateCountBefore !== qrCreateCountAfter) {
      throw new Error("Security Breach: QR row was created despite rejected createQRCode call!");
    }
    console.log("✔ QR creation on unassigned campaign rejected & row count unchanged.");

    // Find a QR code for unassigned campaign
    const unassignedQR = await prisma.qRCode.findFirst({
      where: { campaignId: { notIn: assignedCampaignIds } },
    });

    if (unassignedQR) {
      const originalQR = await prisma.qRCode.findUnique({
        where: { id: unassignedQR.id },
      });
      if (!originalQR) throw new Error("Unassigned QR disappeared!");

      const qrUpdateInput = {
        code: unassignedQR.code,
        type: unassignedQR.type,
        status: unassignedQR.status,
        brandId: unassignedQR.brandId ?? undefined,
        advertiserId: unassignedQR.advertiserId ?? undefined,
        campaignId: unassignedQR.campaignId ?? undefined,
        productId: unassignedQR.productId ?? undefined,
        batchId: unassignedQR.batchId ?? undefined,
        label: "Updated Label Attempt",
        destinationUrl: unassignedQR.destinationUrl ?? undefined,
      };

      // B. Update QR code on unassigned campaign
      const qrUpdateResult = await updateQRCode(unassignedQR.id, qrUpdateInput, scopedUser);
      if (qrUpdateResult.ok) {
        throw new Error("Security Leak: Campaign Manager updated a QR code belonging to an unassigned campaign!");
      }
      if (qrUpdateResult.error !== "QR Code not found") {
        throw new Error(`Test Failure: Expected 'QR Code not found' but got '${qrUpdateResult.error}'`);
      }

      // Verify no mutation
      const postQRUpdate = await prisma.qRCode.findUnique({
        where: { id: unassignedQR.id },
      });
      if (postQRUpdate?.label !== originalQR.label) {
        throw new Error("Security Breach: QR label modified despite rejected updateQRCode call!");
      }
      console.log("✔ QR update on unassigned campaign rejected & row unchanged.");

      // C. Disable QR code on unassigned campaign
      const qrDisableResult = await disableQRCode(unassignedQR.id, scopedUser);
      if (qrDisableResult.ok) {
        throw new Error("Security Leak: Campaign Manager disabled a QR code belonging to an unassigned campaign!");
      }
      if (qrDisableResult.error !== "QR Code not found") {
        throw new Error(`Test Failure: Expected 'QR Code not found' but got '${qrDisableResult.error}'`);
      }

      // Verify no mutation
      const postQRDisable = await prisma.qRCode.findUnique({
        where: { id: unassignedQR.id },
      });
      if (postQRDisable?.status !== originalQR.status) {
        throw new Error("Security Breach: QR status changed despite rejected disableQRCode call!");
      }
      console.log("✔ QR disable on unassigned campaign rejected & row unchanged.");

      // D. Download QR code image on unassigned campaign
      const qrDownloadResult = await generateQRCodeDownloadData(unassignedQR.id, "png", scopedUser);
      if (qrDownloadResult.ok) {
        throw new Error("Security Leak: Campaign Manager downloaded QR code belonging to an unassigned campaign!");
      }
      if (qrDownloadResult.error !== "Unauthorized") {
        throw new Error(`Test Failure: Expected 'Unauthorized' but got '${qrDownloadResult.error}'`);
      }
      console.log("✔ QR download on unassigned campaign rejected.");
    }

    // E. Update QR code to target Unassigned Campaign (Negative)
    const assignedQR = await prisma.qRCode.findFirst({
      where: { campaignId: { in: assignedCampaignIds } },
    });
    if (assignedQR) {
      const originalAssignedQR = await prisma.qRCode.findUnique({
        where: { id: assignedQR.id },
      });
      if (!originalAssignedQR) throw new Error("Assigned QR disappeared!");

      const qrHackedCampInput = {
        code: assignedQR.code,
        type: assignedQR.type,
        status: assignedQR.status,
        brandId: unassignedCampaign.brandId ?? undefined,
        advertiserId: unassignedCampaign.advertiserId ?? undefined,
        campaignId: unassignedCampaign.id, // change pointer to unassigned campaign
        productId: unassignedCampaign.productId ?? undefined,
        batchId: assignedQR.batchId ?? undefined,
        label: "Label",
        destinationUrl: assignedQR.destinationUrl ?? undefined,
      };
      const qrHackedCampResult = await updateQRCode(assignedQR.id, qrHackedCampInput, scopedUser);
      if (qrHackedCampResult.ok) {
        throw new Error("Security Leak: Campaign Manager updated an assigned QR code to point to an unassigned campaign!");
      }
      if (qrHackedCampResult.error !== "QR Code not found") {
        throw new Error(`Test Failure: Expected 'QR Code not found' but got '${qrHackedCampResult.error}'`);
      }

      // Verify no mutation
      const postQRHackedCamp = await prisma.qRCode.findUnique({
        where: { id: assignedQR.id },
      });
      if (postQRHackedCamp?.campaignId !== originalAssignedQR.campaignId) {
        throw new Error("Security Breach: QR campaignId changed despite rejected updateQRCode call!");
      }
      console.log("✔ QR update campaign pointer swap rejected & row unchanged.");

      // E.2. Update QR code with inconsistent relationship IDs on an assigned campaign (Negative)
      const qrInconsistentInput = {
        code: assignedQR.code,
        type: assignedQR.type,
        status: assignedQR.status,
        brandId: "inconsistent-brand-id", // intentionally wrong brand for the assigned campaign
        advertiserId: assignedQR.advertiserId ?? undefined,
        campaignId: assignedQR.campaignId ?? undefined,
        productId: assignedQR.productId ?? undefined,
        batchId: assignedQR.batchId ?? undefined,
        label: "Label",
        destinationUrl: assignedQR.destinationUrl ?? undefined,
      };
      const qrInconsistentResult = await updateQRCode(assignedQR.id, qrInconsistentInput, scopedUser);
      if (qrInconsistentResult.ok) {
        throw new Error("Security Leak: Campaign Manager updated a QR code with inconsistent relationship IDs!");
      }
      if (!qrInconsistentResult.error.includes("Provided brand does not match")) {
        throw new Error(`Test Failure: Expected 'Provided brand does not match...' but got '${qrInconsistentResult.error}'`);
      }

      // Verify no mutation
      const postQRInconsistent = await prisma.qRCode.findUnique({
        where: { id: assignedQR.id },
      });
      if (postQRInconsistent?.brandId !== originalAssignedQR.brandId) {
        throw new Error("Security Breach: QR brandId changed despite rejected updateQRCode call!");
      }
      console.log("✔ QR update with inconsistent relationship IDs rejected & row unchanged.");
    }

    // F. Advertiser Viewer QR mutations remain denied even for visible advertiser resources
    const advertiserViewerUser = await prisma.user.findFirst({
      where: { role: "ADVERTISER_VIEWER" },
    });
    if (advertiserViewerUser) {
      const advertiserScopedUser = {
        id: advertiserViewerUser.id,
        role: advertiserViewerUser.role,
        brandId: advertiserViewerUser.brandId,
        advertiserId: advertiserViewerUser.advertiserId,
      };
      const advertiserQrCode = `QR_ADV_DENIED_${Date.now()}`;
      const advertiserQrCountBefore = await prisma.qRCode.count();
      const advertiserCreateResult = await createQRCode({
        brandId: unassignedCampaign.brandId,
        advertiserId: unassignedCampaign.advertiserId,
        campaignId: unassignedCampaign.id,
        productId: unassignedCampaign.productId ?? undefined,
        code: advertiserQrCode,
        type: "CONSUMER_CAMPAIGN",
        status: "ACTIVE",
        label: "Advertiser QR Create Attempt",
      }, advertiserScopedUser);
      if (advertiserCreateResult.ok) {
        throw new Error("Security Leak: Advertiser Viewer created a QR code!");
      }
      if (advertiserCreateResult.error !== "Unauthorized") {
        throw new Error(`Test Failure: Expected 'Unauthorized' for Advertiser Viewer QR create, but got '${advertiserCreateResult.error}'`);
      }
      if (advertiserQrCountBefore !== await prisma.qRCode.count()) {
        throw new Error("Security Breach: QR row was created despite rejected Advertiser Viewer createQRCode call!");
      }

      if (assignedQR) {
        const advertiserUpdateResult = await updateQRCode(assignedQR.id, {
          code: assignedQR.code,
          type: assignedQR.type,
          status: assignedQR.status,
          brandId: assignedQR.brandId ?? undefined,
          advertiserId: assignedQR.advertiserId ?? undefined,
          campaignId: assignedQR.campaignId ?? undefined,
          productId: assignedQR.productId ?? undefined,
          batchId: assignedQR.batchId ?? undefined,
          label: "Advertiser Update Attempt",
          destinationUrl: assignedQR.destinationUrl ?? undefined,
        }, advertiserScopedUser);
        if (advertiserUpdateResult.ok) {
          throw new Error("Security Leak: Advertiser Viewer updated a QR code!");
        }
        if (advertiserUpdateResult.error !== "Unauthorized") {
          throw new Error(`Test Failure: Expected 'Unauthorized' for Advertiser Viewer QR update, but got '${advertiserUpdateResult.error}'`);
        }
      }
      console.log("✔ Advertiser Viewer QR create/update mutations rejected.");
    }

    // G. Retail Operations QR mutations are denied
    const retailOpsUser = await prisma.user.findFirst({
      where: { role: "RETAIL_OPERATIONS" },
    });
    if (retailOpsUser) {
      const retailScopedUser = {
        id: retailOpsUser.id,
        role: retailOpsUser.role,
        brandId: retailOpsUser.brandId,
        advertiserId: retailOpsUser.advertiserId,
      };
      const retailQrCode = `QR_RETAIL_DENIED_${Date.now()}`;
      const retailQrCountBefore = await prisma.qRCode.count();
      const retailCreateResult = await createQRCode({
        brandId: unassignedCampaign.brandId,
        advertiserId: unassignedCampaign.advertiserId,
        campaignId: unassignedCampaign.id,
        productId: unassignedCampaign.productId ?? undefined,
        code: retailQrCode,
        type: "CONSUMER_CAMPAIGN",
        status: "ACTIVE",
        label: "Retail QR Create Attempt",
      }, retailScopedUser);
      if (retailCreateResult.ok) {
        throw new Error("Security Leak: Retail Operations created a QR code!");
      }
      if (retailCreateResult.error !== "Unauthorized") {
        throw new Error(`Test Failure: Expected 'Unauthorized' for Retail Operations QR create, but got '${retailCreateResult.error}'`);
      }
      if (retailQrCountBefore !== await prisma.qRCode.count()) {
        throw new Error("Security Breach: QR row was created despite rejected Retail Operations createQRCode call!");
      }

      if (assignedQR) {
        const retailUpdateResult = await updateQRCode(assignedQR.id, {
          code: assignedQR.code,
          type: assignedQR.type,
          status: assignedQR.status,
          brandId: assignedQR.brandId ?? undefined,
          advertiserId: assignedQR.advertiserId ?? undefined,
          campaignId: assignedQR.campaignId ?? undefined,
          productId: assignedQR.productId ?? undefined,
          batchId: assignedQR.batchId ?? undefined,
          label: "Retail Update Attempt",
          destinationUrl: assignedQR.destinationUrl ?? undefined,
        }, retailScopedUser);
        if (retailUpdateResult.ok) {
          throw new Error("Security Leak: Retail Operations updated a QR code!");
        }
        if (retailUpdateResult.error !== "Unauthorized") {
          throw new Error(`Test Failure: Expected 'Unauthorized' for Retail Operations QR update, but got '${retailUpdateResult.error}'`);
        }
      }
      console.log("✔ Retail Operations QR create/update mutations rejected.");
    }


    // ==========================================
    // PART 2: AUTHORIZED OPERATIONS (POSITIVE TESTS)
    // ==========================================
    console.log("\n--- Testing Authorized Scope (Positive - Disposable Records) ---");

    // A. Campaign Creation as ADMIN & Assignment
    const tempCampaign = await prisma.campaign.create({
      data: {
        brandId: campaignManagerUser.brandId || "",
        advertiserId: unassignedCampaign.advertiserId,
        name: "CM Temp Test Campaign",
        slug: `cm-temp-test-${Date.now()}`,
        offerTitle: "Temp Offer Title",
        rewardType: "FREE_DATA",
        status: "ACTIVE",
        currency: "USD",
        maxClaimsPerMobile: 1,
        createdById: campaignManagerUser.id,
      }
    });
    cleanups.campaigns.push(tempCampaign.id);

    await prisma.campaignAssignment.create({
      data: {
        campaignId: tempCampaign.id,
        userId: campaignManagerUser.id,
      }
    });
    cleanups.campaignAssignments.push({ campaignId: tempCampaign.id, userId: campaignManagerUser.id });
    console.log(`✔ Created & assigned temporary campaign: ${tempCampaign.id}`);

    // B. Campaign list contains temporary campaign
    const postAssignCampaigns = await getCampaignsPageData(scopedUser);
    const visibleIds = postAssignCampaigns.campaigns.map((c) => c.id);
    if (!visibleIds.includes(tempCampaign.id)) {
      throw new Error("Security Failure: Assigned campaign is NOT visible to Campaign Manager!");
    }
    console.log("✔ Newly assigned campaign is visible.");

    // C. Campaign update works for Campaign Manager
    const validUpdatePayload = {
      brandId: tempCampaign.brandId,
      advertiserId: tempCampaign.advertiserId,
      productId: undefined,
      name: "CM Temp Test Campaign Updated",
      slug: tempCampaign.slug,
      offerTitle: tempCampaign.offerTitle,
      offerDescription: undefined,
      rewardType: tempCampaign.rewardType,
      status: tempCampaign.status,
      currency: tempCampaign.currency,
      maxClaimsPerMobile: tempCampaign.maxClaimsPerMobile,
    };
    const cUpdateResult = await updateCampaign(tempCampaign.id, validUpdatePayload, scopedUser);
    if (!cUpdateResult.ok) {
      throw new Error(`Authorization Failure: Campaign Manager failed to update assigned campaign. Error: ${cUpdateResult.error}`);
    }
    
    // Verify database row modified
    const verifiedCampaign = await prisma.campaign.findUnique({ where: { id: tempCampaign.id } });
    if (verifiedCampaign?.name !== "CM Temp Test Campaign Updated") {
      throw new Error("Database update verification failed: name was not changed in campaign row.");
    }
    console.log("✔ Campaign Manager successfully updated assigned campaign.");

    // D. Create Batch on Assigned Campaign
    const bCode = `BATCH_TEMP_${Date.now()}`;
    const posBatchCreateResult = await createBatch({
      brandId: tempCampaign.brandId,
      campaignId: tempCampaign.id,
      batchCode: bCode,
      status: "ACTIVE",
    }, scopedUser);

    if (!posBatchCreateResult.ok) {
      throw new Error(`Authorization Failure: CM failed to create batch for assigned campaign. Error: ${posBatchCreateResult.error}`);
    }
    const tempBatch = posBatchCreateResult.data;
    cleanups.batches.push(tempBatch.id);
    console.log(`✔ Created temporary batch: ${tempBatch.id}`);

    // E. Update Batch on Assigned Campaign
    const posBatchUpdateResult = await updateBatch(tempBatch.id, {
      brandId: tempBatch.brandId,
      campaignId: tempCampaign.id,
      batchCode: bCode,
      region: "South Coast",
      city: "Dar es Salaam",
      status: "ACTIVE",
    }, scopedUser);
    if (!posBatchUpdateResult.ok) {
      throw new Error(`Authorization Failure: CM failed to update batch. Error: ${posBatchUpdateResult.error}`);
    }

    // Verify database row updated
    const verifiedBatch = await prisma.batch.findUnique({ where: { id: tempBatch.id } });
    if (verifiedBatch?.region !== "South Coast") {
      throw new Error("Database verification failed: region not updated in batch.");
    }
    console.log("✔ Campaign Manager successfully updated batch on assigned campaign.");

    // F. Close Batch on Assigned Campaign
    const posBatchCloseResult = await closeBatch(tempBatch.id, scopedUser);
    if (!posBatchCloseResult.ok) {
      throw new Error(`Authorization Failure: CM failed to close batch. Error: ${posBatchCloseResult.error}`);
    }
    const verifiedClosedBatch = await prisma.batch.findUnique({ where: { id: tempBatch.id } });
    if (verifiedClosedBatch?.status !== "CLOSED") {
      throw new Error("Database verification failed: batch status not CLOSED.");
    }
    console.log("✔ Campaign Manager successfully closed batch.");

    // G. Create QR Code on Assigned Campaign
    const qrCodeVal = `QR_CM_TEMP_${Date.now()}`;
    const posQrCreateResult = await createQRCode({
      brandId: tempCampaign.brandId,
      advertiserId: tempCampaign.advertiserId,
      campaignId: tempCampaign.id,
      code: qrCodeVal,
      type: "CONSUMER_CAMPAIGN",
      status: "ACTIVE",
      label: "Disposable CM QR",
    }, scopedUser);
    if (!posQrCreateResult.ok) {
      throw new Error(`Authorization Failure: CM failed to create QR code. Error: ${posQrCreateResult.error}`);
    }
    const tempQR = posQrCreateResult.data;
    cleanups.qrCodes.push(tempQR.id);
    console.log(`✔ Created temporary QR: ${tempQR.id}`);

    // H. Update QR Code on Assigned Campaign
    const posQrUpdateResult = await updateQRCode(tempQR.id, {
      code: qrCodeVal,
      type: "CONSUMER_CAMPAIGN",
      status: "ACTIVE",
      brandId: tempCampaign.brandId,
      advertiserId: tempCampaign.advertiserId,
      campaignId: tempCampaign.id,
      label: "Disposable CM QR Updated",
    }, scopedUser);
    if (!posQrUpdateResult.ok) {
      throw new Error(`Authorization Failure: CM failed to update QR code. Error: ${posQrUpdateResult.error}`);
    }
    const verifiedQR = await prisma.qRCode.findUnique({ where: { id: tempQR.id } });
    if (verifiedQR?.label !== "Disposable CM QR Updated") {
      throw new Error("Database verification failed: QR label not updated.");
    }
    console.log("✔ Campaign Manager successfully updated QR code.");

    // I. Download QR Code on Assigned Campaign
    const posQrDownloadResult = await generateQRCodeDownloadData(tempQR.id, "png", scopedUser);
    if (!posQrDownloadResult.ok) {
      throw new Error(`Authorization Failure: CM failed to download QR code. Error: ${posQrDownloadResult.error}`);
    }
    console.log("✔ Campaign Manager successfully downloaded assigned campaign QR.");

    // J. Disable QR Code on Assigned Campaign
    const posQrDisableResult = await disableQRCode(tempQR.id, scopedUser);
    if (!posQrDisableResult.ok) {
      throw new Error(`Authorization Failure: CM failed to disable QR code. Error: ${posQrDisableResult.error}`);
    }
    const verifiedDisabledQR = await prisma.qRCode.findUnique({ where: { id: tempQR.id } });
    if (verifiedDisabledQR?.status !== "DISABLED") {
      throw new Error("Database verification failed: QR status not DISABLED.");
    }
    console.log("✔ Campaign Manager successfully disabled QR code.");


    // ==========================================
    // PART 3: REPORTS & HEATMAP SCOPING
    // ==========================================
    console.log("\n--- Testing Reports & Heatmap Scoping ---");
    
    // A. Reports scoping checks
    const reportsFilters = await getRoleScopeFilters(currentUser);
    if (!reportsFilters || !reportsFilters.campaignId || !reportsFilters.campaignId.in) {
      throw new Error("Security Leak: getRoleScopeFilters did not return scoped campaign filters for Campaign Manager!");
    }
    
    const scopedFilterCampaignIds = reportsFilters.campaignId.in;
    for (const id of scopedFilterCampaignIds) {
      if (!assignedCampaignIds.includes(id) && id !== tempCampaign.id) {
        throw new Error(`Security Leak: report scope includes unassigned campaign ${id}!`);
      }
    }
    console.log("✔ Reports role filters are correctly scoped.");

    // B. Heatmap scoping checks
    const heatmapData = await getAdminHeatmapData({}, currentUser);
    const { consumerEngagementMarkers, deliveryDistributionMarkers } = heatmapData;

    for (const marker of consumerEngagementMarkers) {
      const checkScan = await prisma.scanEvent.findUnique({
        where: { id: marker.id },
        select: { campaignId: true },
      });
      if (checkScan && checkScan.campaignId && !assignedCampaignIds.includes(checkScan.campaignId) && checkScan.campaignId !== tempCampaign.id) {
        throw new Error(`Security Leak: Heatmap consumer scans include unassigned campaign ${checkScan.campaignId}!`);
      }
    }
    
    for (const marker of deliveryDistributionMarkers) {
      const checkDelivery = await prisma.deliveryScan.findUnique({
        where: { id: marker.id },
        select: { campaignId: true },
      });
      if (checkDelivery && checkDelivery.campaignId && !assignedCampaignIds.includes(checkDelivery.campaignId) && checkDelivery.campaignId !== tempCampaign.id) {
        throw new Error(`Security Leak: Heatmap delivery scans include unassigned campaign ${checkDelivery.campaignId}!`);
      }
    }
    console.log("✔ Heatmaps are correctly scoped.");

    console.log("\nAll authorization and scoping tests passed successfully!");
  } finally {
    console.log("\nCleaning up test-created records...");
    for (const qrId of cleanups.qrCodes) {
      await prisma.qRCode.deleteMany({ where: { id: qrId } });
    }
    for (const bId of cleanups.batches) {
      await prisma.batch.deleteMany({ where: { id: bId } });
    }
    for (const assign of cleanups.campaignAssignments) {
      await prisma.campaignAssignment.deleteMany({
        where: { campaignId: assign.campaignId, userId: assign.userId },
      });
    }
    for (const campId of cleanups.campaigns) {
      await prisma.campaign.deleteMany({ where: { id: campId } });
    }
    await prisma.$disconnect();
    console.log("Cleanup complete.");
  }
}

main().catch((e) => {
  console.error("Test failed with error:", e);
  process.exit(1);
});
