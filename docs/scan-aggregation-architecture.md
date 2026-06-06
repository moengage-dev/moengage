# Scan Aggregation and Rate Limiting Architecture

This document explains the production scan aggregation architecture and the edge rate-limiting design introduced to ensure high-performance, race-condition-free, and scalable tracking.

---

## 1. Scan Aggregation Architecture

### The Problem: Raw Database Growth
In the original design, every scanned QR code resulted in a new `ScanEvent` row inserted into the database. Under high-frequency automated traffic, campaign refreshes, or malicious scrape attempts, this approach:
- Bloated the database table size rapidly, inflating storage costs.
- Degraded query performance on indexes and dashboards due to scanning millions of rows.
- Led to transaction timeouts and exhausted pool connections under concurrent spikes.

### The Solution: 30-Second Deterministic Buckets
To scale scan tracking, we transition to an **aggregated, row-collapsed** approach. 
- Scans are grouped by a unique composite key: `(qrCodeId, fingerprintKey, windowStartedAt)`.
- **windowStartedAt**: Rounded down to the nearest 30 seconds:
  ```typescript
  const windowStartedAt = new Date(Math.floor(now.getTime() / 30000) * 30000);
  ```
- **fingerprintKey**: Uniquely identifies the client:
  - `visitor:${anonymousVisitorId}` if tracked.
  - `ip:${ipHash}` fallback.
  - `unknown:${randomUUID}` if no identifier exists.

Any scans occurring within the same 30-second window for the same visitor/IP are collapsed into **exactly one row** in the database.

---

## 2. Concurrency and Atomicity: Why We Use PostgreSQL `ON CONFLICT`

### The Concurrency Race Condition
Using an application-level check-and-insert flow (e.g., querying `prisma.scanEvent.findFirst` and checking if a bucket exists, then calling `prisma.scanEvent.create` or `prisma.scanEvent.update`) introduces a race condition under high concurrency.
If 100 requests arrive at the same time:
1. All 100 concurrent threads execute the `findFirst` query simultaneously.
2. None of them find an existing row for the current 30-second window.
3. All 100 try to execute `create` at the same time.
4. This results in primary key/unique constraint violations or multiple duplicated rows, breaking the bucket collapse guarantee.

### Atomic Resolution with `ON CONFLICT`
To solve this, the aggregation service bypasses standard ORM create/update methods and runs an atomic PostgreSQL native query:

```sql
INSERT INTO "ScanEvent" (...)
VALUES (...)
ON CONFLICT ("qrCodeId", "fingerprintKey", "windowStartedAt")
DO UPDATE SET
  "hitCount" = "ScanEvent"."hitCount" + 1,
  "repeatCount" = "ScanEvent"."repeatCount" + EXCLUDED."repeatCount",
  "suspiciousCount" = "ScanEvent"."suspiciousCount" + EXCLUDED."suspiciousCount",
  "billableCount" = "ScanEvent"."billableCount" + EXCLUDED."billableCount",
  "lastScanAt" = GREATEST("ScanEvent"."lastScanAt", EXCLUDED."lastScanAt"),
  "isRepeatScan" = "ScanEvent"."isRepeatScan" OR EXCLUDED."isRepeatScan",
  "isSuspicious" = "ScanEvent"."isSuspicious" OR EXCLUDED."isSuspicious",
  "isBillable" = (("ScanEvent"."billableCount" + EXCLUDED."billableCount") > 0),
  "suspiciousReason" = COALESCE("ScanEvent"."suspiciousReason", EXCLUDED."suspiciousReason");
```

- **Database-Level Locking**: PostgreSQL handles this query atomically. It locks the matching index partition, ensuring that concurrent requests either insert the row or wait to update it sequentially. No race conditions or duplicate rows are possible.

---

## 3. Metrics and Counters

Because scan events are collapsed, the columns are defined as follows:

| Column | Type | Meaning |
| :--- | :--- | :--- |
| `hitCount` | `Int` | Total scan attempts recorded in this 30-second bucket. |
| `repeatCount` | `Int` | Total scans classified as repeats (returning visitor). |
| `suspiciousCount` | `Int` | Total scans flagged as suspicious (abusive/rate-limited). |
| `billableCount` | `Int` | Total scans qualifying for billing (non-suspicious/valid). |

### Impact on Analytics and Queries
- **Physical Row Count ≠ Total Scans**: Calling `COUNT(*)` or `prisma.scanEvent.count()` only returns the number of active 30-second aggregation buckets. It **does not** represent the traffic volume.
- **Calculating Totals**: All analytics, dashboards, and export reports must sum the counters instead of counting rows:
  - **Total Scans**: `SUM(hitCount)`
  - **Total Billable Scans**: `SUM(billableCount)`
  - **Total Suspicious Scans**: `SUM(suspiciousCount)`
  - **Total Repeat Scans**: `SUM(repeatCount)`

---

## 4. OTP Rate Limiting: Upstash vs. In-Memory Map

In early stages, rate limits for OTP verify/start endpoints were handled via an in-memory `Map` in standard middleware/helper code.

### The Problem with In-Memory Maps on Vercel Edge
Vercel Edge functions and Serverless runtimes execute in transient, sandboxed containers across global regions:
- **No Shared Memory**: Serverless functions run in isolated processes. A request routed to region `iad1` has no access to the memory Map in region `fra1`.
- **Instance Lifecycles (Cold Starts)**: Serverless containers spin down after inactivity, wiping out the in-memory rate limit Map. 
- **Bypass Vulnerability**: An attacker can cycle their requests or distribute traffic to easily bypass rate limits because the memory state is constantly fragmented and reset.

### The Solution: Upstash Redis
By replacing the in-memory Map with `@upstash/redis` and `@upstash/ratelimit`:
- **Shared Global State**: All serverless containers query a centralized, highly-available Redis store.
- **Consistency**: Rate limit counters are tracked globally across all regions, instances, and spin-ups.
- **Security**: Ensures strict rate-limit lockouts (e.g., 3 OTP sends per hour per phone number) are enforced reliably regardless of serverless scaling behavior.
