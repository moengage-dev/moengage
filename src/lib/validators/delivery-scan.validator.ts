// src/lib/validators/delivery-scan.validator.ts
import { z } from "zod";

export const RETAILER_TYPES = [
  "RETAILER",
  "DISTRIBUTOR",
  "KIOSK",
  "SUPERMARKET",
  "WHOLESALER",
  "OUTLET",
  "OTHER",
] as const;

export type RetailerType = (typeof RETAILER_TYPES)[number];

const retailerTypeEnum = z.enum(RETAILER_TYPES);

const optionalString = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().nullable().optional()
);

const optionalDecimal = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return null;
    const parsed = Number(v);
    return Number.isNaN(parsed) ? v : parsed;
  },
  z.number().nullable().optional()
);

const locationSourceEnum = z.enum(["IP", "GPS", "MANUAL", "DEMO_SEED"]).nullable().optional();

export const deliveryScanSchema = z
  .object({
    qrCodeId: z.string().min(1, "QR Code ID is required"),
    batchId: z.string().min(1, "Batch ID is required"),
    retailerId: optionalString,
    retailerName: optionalString,
    retailerType: retailerTypeEnum.nullable().optional(),
    country: optionalString,
    region: optionalString,
    city: optionalString,
    suburb: optionalString,
    address: optionalString,
    latitude: optionalDecimal,
    longitude: optionalDecimal,
    locationSource: locationSourceEnum,
    cartonsDelivered: z.preprocess(
      (v) => {
        if (typeof v === "string" && v.trim() !== "") {
          const parsed = Number.parseInt(v, 10);
          return Number.isNaN(parsed) ? v : parsed;
        }
        return v;
      },
      z.number({ message: "Cartons delivered must be a number" })
        .int("Cartons delivered must be an integer")
        .positive("Cartons delivered must be greater than 0")
        .max(100000, "Cartons delivered looks too large")
    ),
    notes: optionalString,
  })
  .superRefine((data, ctx) => {
    // If retailerId is missing or empty, retailerName is required.
    if (!data.retailerId && !data.retailerName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Retailer Name is required if no existing retailer is selected",
        path: ["retailerName"],
      });
    }

    if (data.latitude != null && (data.latitude < -90 || data.latitude > 90)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Latitude must be between -90 and 90",
        path: ["latitude"],
      });
    }

    if (data.longitude != null && (data.longitude < -180 || data.longitude > 180)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Longitude must be between -180 and 180",
        path: ["longitude"],
      });
    }
  });

export type DeliveryScanFormValues = z.infer<typeof deliveryScanSchema>;
