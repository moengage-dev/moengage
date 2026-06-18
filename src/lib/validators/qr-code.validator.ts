// src/lib/validators/qr-code.validator.ts
import { z } from "zod";

export const QR_CODE_TYPES = [
  "CONSUMER_CAMPAIGN",
  "SAMPLE_LABEL",
  "BATCH_DELIVERY",
  "INTERNAL_TEST",
] as const;

export const QR_CODE_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "EXPIRED",
  "DISABLED",
] as const;

export type QRCodeType = (typeof QR_CODE_TYPES)[number];
export type QRCodeStatus = (typeof QR_CODE_STATUSES)[number];

const typeEnum = z.enum(QR_CODE_TYPES);
const statusEnum = z.enum(QR_CODE_STATUSES);

const optionalId = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().nullable().optional()
);

const optionalString = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().nullable().optional()
);

export const qrCodeSchema = z
  .object({
    code: z.preprocess(
      (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
      z
        .string()
        .regex(/^[a-zA-Z0-9-_]+$/, "Code must be URL-safe (only letters, numbers, hyphens, and underscores)")
        .nullable()
        .optional()
    ),
    type: typeEnum,
    status: statusEnum,
    brandId: optionalId,
    advertiserId: optionalId,
    campaignId: optionalId,
    productId: optionalId,
    batchId: optionalId,
    label: optionalString,
    destinationUrl: optionalString,
  })
  .superRefine((data, ctx) => {
    if (data.type === "CONSUMER_CAMPAIGN") {
      if (!data.brandId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Brand is required for Consumer Campaigns", path: ["brandId"] });
      }
      if (!data.advertiserId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Advertiser is required for Consumer Campaigns", path: ["advertiserId"] });
      }
      if (!data.campaignId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Campaign is required for Consumer Campaigns", path: ["campaignId"] });
      }
    }
    if (data.type === "SAMPLE_LABEL") {
      if (!data.brandId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Brand is required for Sample Labels", path: ["brandId"] });
      }
      if (!data.productId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Product is required for Sample Labels", path: ["productId"] });
      }
    }
    if (data.type === "INTERNAL_TEST" && !data.campaignId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Campaign is required for Internal Test QR codes",
        path: ["campaignId"],
      });
    }
    if (data.type === "BATCH_DELIVERY" && !data.batchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Batch is required for Batch Delivery QR codes",
        path: ["batchId"],
      });
    }
  });

export type QRCodeFormValues = z.infer<typeof qrCodeSchema>;
