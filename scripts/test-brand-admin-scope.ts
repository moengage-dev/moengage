/**
 * Guarded service-level scope tests for Brand Admin pages.
 *
 * These tests verify that brand-scoped service functions enforce isolation
 * correctly and that cross-brand access is rejected server-side.
 *
 * REQUIRES: ALLOW_MUTATING_DB_TESTS=true environment variable (read-only assertions
 * are always safe, but the guard prevents accidental execution in CI pipelines
 * that don't expect DB access).
 *
 * Run with: ALLOW_MUTATING_DB_TESTS=true npx tsx scripts/test-brand-admin-scope.ts
 */

import prisma from "../src/lib/prisma";
import { getProductsPageData } from "../src/server/services/products.service";
import { getBatchesPageData } from "../src/server/services/batches.service";
import { getQRCodesPageData } from "../src/server/services/qr-codes.service";
import { getBrandDeliveryPageData } from "../src/server/services/delivery-scan.service";
import { createProduct } from "../src/server/services/products.service";
import type { CurrentUser } from "../src/lib/auth/get-current-user";

if (!process.env.ALLOW_MUTATING_DB_TESTS) {
  console.error("Set ALLOW_MUTATING_DB_TESTS=true to run this test suite.");
  process.exit(1);
}

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? `: ${detail}` : ""}`);
    failed++;
  }
}

function makeUser(overrides: Partial<CurrentUser>): CurrentUser {
  return {
    id: overrides.id ?? "test-user-id",
    role: overrides.role ?? "BRAND_ADMIN",
    email: overrides.email ?? "test@example.com",
    name: overrides.name ?? "Test User",
    isEmailVerified: overrides.isEmailVerified ?? true,
    brandId: overrides.brandId ?? null,
    advertiserId: overrides.advertiserId ?? null,
  };
}

async function run() {
  console.log("\n── Brand Admin Scope Tests ────────────────────────────────────────────\n");

  // Fetch real brand IDs from the database
  const brands = await prisma.brand.findMany({ take: 2, orderBy: { createdAt: "asc" } });
  if (brands.length < 1) {
    console.error("Need at least 1 brand in DB to run scope tests. Run seed first.");
    process.exit(1);
  }

  const brandA = brands[0];
  const brandB = brands[1] ?? brands[0]; // fallback to same if only 1 brand

  console.log(`Using Brand A: ${brandA.name} (${brandA.id})`);
  if (brandB.id !== brandA.id) console.log(`Using Brand B: ${brandB.name} (${brandB.id})`);

  // ── Test 1: Brand Admin sees only own-brand products ────────────────────────
  console.log("\n1. Brand Admin sees only own-brand products\n");
  {
    const user = makeUser({ brandId: brandA.id });
    const { products } = await getProductsPageData(user);
    const allOwnBrand = products.every((p) => p.brandId === brandA.id);
    check("All returned products belong to brand A", allOwnBrand);

    if (brandB.id !== brandA.id) {
      const hasOtherBrand = products.some((p) => p.brandId === brandB.id);
      check("No brand B products returned for brand A user", !hasOtherBrand);
    }
  }

  // ── Test 2: Brand Admin sees only own-brand batches ─────────────────────────
  console.log("\n2. Brand Admin sees only own-brand batches\n");
  {
    const user = makeUser({ brandId: brandA.id });
    const { batches } = await getBatchesPageData(user);
    const allOwnBrand = batches.every((b) => b.brandId === brandA.id);
    check("All returned batches belong to brand A", allOwnBrand);

    if (brandB.id !== brandA.id) {
      const hasOtherBrand = batches.some((b) => b.brandId === brandB.id);
      check("No brand B batches returned for brand A user", !hasOtherBrand);
    }
  }

  // ── Test 3: Brand Admin sees only own-brand QR codes ────────────────────────
  console.log("\n3. Brand Admin sees only own-brand QR codes\n");
  {
    const user = makeUser({ brandId: brandA.id });
    const { qrCodes } = await getQRCodesPageData(user);
    const allOwnBrand = qrCodes.every((q) => q.brandId === brandA.id || q.brandId === null);
    check("All returned QR codes belong to brand A (or unscoped)", allOwnBrand);

    if (brandB.id !== brandA.id) {
      const hasOtherBrand = qrCodes.some((q) => q.brandId === brandB.id);
      check("No brand B QR codes returned for brand A user", !hasOtherBrand);
    }
  }

  // ── Test 4: Delivery page forces server-side brand scope ─────────────────────
  console.log("\n4. Brand delivery page ignores URL brandId, forces server-side scope\n");
  {
    const user = makeUser({ brandId: brandA.id });
    // Pass brandB.id as a filter — should be ignored; results must be brand A only
    const result = await getBrandDeliveryPageData(user, { brandId: brandB.id } as never);
    const allOwnBrand = result.deliveryScans.every((d) => d.brandId === brandA.id);
    check(
      "Delivery results scoped to user.brandId regardless of filter.brandId",
      allOwnBrand,
      result.deliveryScans.length === 0 ? "(no scans, vacuously true)" : undefined
    );
  }

  // ── Test 5: Cross-brand product mutation is rejected ─────────────────────────
  console.log("\n5. Cross-brand product mutation is rejected\n");
  {
    if (brandB.id !== brandA.id) {
      // Brand A user tries to create a product under brand B
      const user = makeUser({ brandId: brandA.id });
      const result = await createProduct(
        {
          name: "SCOPE_TEST_PRODUCT",
          slug: "scope-test-product",
          brandId: brandB.id,
          status: "ACTIVE",
        },
        user
      );
      check("Cross-brand product creation rejected", !result.ok);
    } else {
      check("Cross-brand mutation test skipped (only 1 brand in DB)", true);
    }
  }

  // ── Test 6: Null brandId returns no data (fail-close) ───────────────────────
  console.log("\n6. Null brand scope returns empty data (fail-close)\n");
  {
    const user = makeUser({ brandId: null });
    const deliveryResult = await getBrandDeliveryPageData(user);
    check("Null brandId delivery returns empty scans", deliveryResult.deliveryScans.length === 0);
    check("Null brandId delivery returns empty retailers", deliveryResult.retailers.length === 0);

    const productResult = await getProductsPageData(user);
    check(
      "Null brandId products returns empty (BRAND_ADMIN with no brand = no data)",
      productResult.products.length === 0
    );
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n── Summary ────────────────────────────────────────────────────────────");
  console.log(`  ${passed} passed  |  ${failed} failed\n`);

  if (failed > 0) {
    console.error("FAIL — brand scope enforcement has regressions.");
    process.exit(1);
  } else {
    console.log("PASS — all brand scope checks passed.");
    process.exit(0);
  }
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
