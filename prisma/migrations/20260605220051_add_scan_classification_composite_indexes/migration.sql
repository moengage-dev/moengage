-- NOTE: These indexes use CONCURRENTLY to avoid locking the ScanEvent table on production.
-- CONCURRENTLY cannot run inside a transaction, so `prisma migrate deploy` will wrap this
-- in a transaction and it will fail. Run these statements manually on production:
--
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "ScanEvent_campaignId_anonymousVisitorId_createdAt_idx"
--     ON "ScanEvent"("campaignId", "anonymousVisitorId", "createdAt");
--
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "ScanEvent_campaignId_ipHash_createdAt_idx"
--     ON "ScanEvent"("campaignId", "ipHash", "createdAt");
--
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "ScanEvent_anonymousVisitorId_createdAt_idx"
--     ON "ScanEvent"("anonymousVisitorId", "createdAt");
--
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "ScanEvent_ipHash_createdAt_idx"
--     ON "ScanEvent"("ipHash", "createdAt");
--
-- For local/preview DBs (no traffic), non-concurrent creation is safe:

-- CreateIndex
CREATE INDEX "ScanEvent_campaignId_anonymousVisitorId_createdAt_idx" ON "ScanEvent"("campaignId", "anonymousVisitorId", "createdAt");

-- CreateIndex
CREATE INDEX "ScanEvent_campaignId_ipHash_createdAt_idx" ON "ScanEvent"("campaignId", "ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "ScanEvent_anonymousVisitorId_createdAt_idx" ON "ScanEvent"("anonymousVisitorId", "createdAt");

-- CreateIndex
CREATE INDEX "ScanEvent_ipHash_createdAt_idx" ON "ScanEvent"("ipHash", "createdAt");
