-- Migration: billing_summary_unique_campaign
--
-- Purpose: Enforce exactly one BillingSummary row per campaign so that concurrent
--          billing generation cannot create duplicate summaries.
--
-- Duplicate-cleanup policy (runs before the unique index is created):
--   For each campaignId that has more than one BillingSummary row, we KEEP the row
--   with the most recent generatedAt (and the largest id as a tie-breaker) and DELETE
--   all others. In a clean installation this DELETE removes zero rows.
--
-- Steps:
--   1. Remove duplicate rows (safe no-op if none exist).
--   2. Drop the now-superseded non-unique index (BillingSummary_campaignId_idx).
--   3. Create the unique index (BillingSummary_campaignId_key).

-- Step 1: Remove duplicate BillingSummary rows, keeping the canonical row
-- (most recently generated, then largest id) for each campaignId.
DELETE FROM "BillingSummary"
WHERE id NOT IN (
  SELECT DISTINCT ON ("campaignId") id
  FROM "BillingSummary"
  ORDER BY "campaignId", "generatedAt" DESC, id DESC
);

-- Step 2: Drop the non-unique index that is now superseded by the unique constraint.
DROP INDEX IF EXISTS "BillingSummary_campaignId_idx";

-- Step 3: Create the unique constraint index.
CREATE UNIQUE INDEX "BillingSummary_campaignId_key" ON "BillingSummary"("campaignId");
