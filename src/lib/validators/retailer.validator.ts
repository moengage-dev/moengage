// src/lib/validators/retailer.validator.ts
import { z } from "zod";

const RETAILER_TYPES = [
  "RETAILER",
  "DISTRIBUTOR",
  "KIOSK",
  "SUPERMARKET",
  "WHOLESALER",
  "OUTLET",
  "OTHER",
] as const;

const optionalString = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().nullable().optional()
);

const optionalDecimal = z.preprocess(
  (v) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? v : n;
  },
  z.number().nullable().optional()
);

export const retailerSchema = z.object({
  brandId: optionalString,
  name: z.string().min(1, "Retailer name is required"),
  type: z.enum(RETAILER_TYPES).nullable().optional(),
  country: optionalString,
  region: optionalString,
  city: optionalString,
  suburb: optionalString,
  address: optionalString,
  latitude: optionalDecimal.superRefine((v, ctx) => {
    if (v != null && (v < -90 || v > 90)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Latitude must be between -90 and 90" });
    }
  }),
  longitude: optionalDecimal.superRefine((v, ctx) => {
    if (v != null && (v < -180 || v > 180)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Longitude must be between -180 and 180" });
    }
  }),
});

export type RetailerFormValues = z.infer<typeof retailerSchema>;
