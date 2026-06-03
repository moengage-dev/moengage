// src/lib/validators/batch.validator.ts
import { z } from "zod";

const optionalString = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalId = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalPositiveInt = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  },
  z.number().int("Must be a whole number").positive("Must be greater than 0").optional()
);

export const batchSchema = z.object({
  brandId: z.string().min(1, "Brand is required"),
  campaignId: z.string().min(1, "Campaign is required"),
  productId: optionalId,
  batchCode: z.string().min(2, "Batch code must be at least 2 characters").trim(),
  region: optionalString,
  city: optionalString,
  estimatedUnitCount: optionalPositiveInt,
  unitsPerCarton: optionalPositiveInt,
  status: z.enum(["CREATED", "ACTIVE", "DELIVERING", "DELIVERED", "CLOSED"]),
});

export type BatchFormValues = z.infer<typeof batchSchema>;

export function emptyStringToUndefined(
  v: string | undefined | null
): string | undefined {
  if (!v || v.trim() === "") return undefined;
  return v;
}
