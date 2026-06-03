// src/lib/validators/campaign.validator.ts
import { z } from "zod";

const optionalString = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalId = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalDecimal = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a positive number (e.g. 1.50)")
    .optional()
);

const optionalDate = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)")
    .optional()
);

export const campaignSchema = z
  .object({
    brandId: z.string().min(1, "Brand is required"),
    advertiserId: z.string().min(1, "Advertiser is required"),
    productId: optionalId,
    name: z.string().min(2, "Name must be at least 2 characters"),
    slug: z
      .string()
      .min(1, "Slug is required")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens only"
      ),
    offerTitle: z.string().min(2, "Offer title must be at least 2 characters"),
    offerDescription: optionalString,
    rewardType: z.enum([
      "FREE_DATA",
      "AIRTIME",
      "WALLET",
      "INSURANCE",
      "VOUCHER",
      "CASHBACK",
      "OTHER",
    ]),
    status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED", "ARCHIVED"]),
    startDate: optionalDate,
    endDate: optionalDate,
    fixedFeePerUnit: optionalDecimal,
    engagementFeePerScan: optionalDecimal,
    currency: z.string().min(1, "Currency is required").default("USD"),
    maxClaimsPerMobile: z.coerce
      .number()
      .int()
      .min(1, "Must be at least 1")
      .default(1),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    { message: "End date must be on or after start date", path: ["endDate"] }
  );

export type CampaignFormValues = z.infer<typeof campaignSchema>;

export function emptyStringToUndefined(
  v: string | undefined | null
): string | undefined {
  if (!v || v.trim() === "") return undefined;
  return v;
}
