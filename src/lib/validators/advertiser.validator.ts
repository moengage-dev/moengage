// src/lib/validators/advertiser.validator.ts
import { z } from "zod";

const optionalUrl = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().url("Must be a valid URL").optional()
);

const optionalEmail = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().email("Must be a valid email").optional()
);

export const advertiserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only"
    ),
  industry: z.string().optional(),
  websiteUrl: optionalUrl,
  logoUrl: optionalUrl,
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
  primaryUserId: z.string().nullable().optional(),
});

export type AdvertiserFormValues = z.infer<typeof advertiserSchema>;

export function emptyStringToUndefined(v: string | undefined | null): string | undefined {
  if (!v || v.trim() === "") return undefined;
  return v;
}
