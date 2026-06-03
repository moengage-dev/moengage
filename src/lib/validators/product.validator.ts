// src/lib/validators/product.validator.ts
import { z } from "zod";

const optionalString = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

export const productSchema = z.object({
  brandId: z.string().min(1, "Brand is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    ),
  sku: optionalString,
  category: optionalString,
  unitLabel: optionalString,
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export function emptyStringToUndefined(v: string | undefined | null): string | undefined {
  if (!v || v.trim() === "") return undefined;
  return v;
}
