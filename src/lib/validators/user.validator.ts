// src/lib/validators/user.validator.ts
import { z } from "zod";

const optionalId = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().nullable().optional()
);

export const USER_ROLES = [
  "ADMIN",
  "BRAND_ADMIN",
  "CAMPAIGN_MANAGER",
  "ADVERTISER_VIEWER",
  "RETAIL_OPERATIONS",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

const roleEnum = z.enum(USER_ROLES);

const brandRequiredRoles: UserRole[] = [
  "BRAND_ADMIN",
  "CAMPAIGN_MANAGER",
  "RETAIL_OPERATIONS",
];

export const createUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").trim(),
    email: z.string().email("Invalid email address").trim().toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: roleEnum,
    brandId: optionalId,
    advertiserId: optionalId,
    isActive: z.boolean(),
    isEmailVerified: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      brandRequiredRoles.includes(data.role) &&
      !data.brandId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Brand is required for ${data.role} role`,
        path: ["brandId"],
      });
    }
    if (data.role === "ADVERTISER_VIEWER" && !data.advertiserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Advertiser is required for ADVERTISER_VIEWER role",
        path: ["advertiserId"],
      });
    }
  });

export const updateUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").trim(),
    email: z.string().email("Invalid email address").trim().toLowerCase(),
    password: z.preprocess(
      (v) =>
        v == null || (typeof v === "string" && v.trim() === "")
          ? undefined
          : v,
      z.string().min(8, "Password must be at least 8 characters").optional()
    ),
    role: roleEnum,
    brandId: optionalId,
    advertiserId: optionalId,
    isActive: z.boolean(),
    isEmailVerified: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      brandRequiredRoles.includes(data.role) &&
      !data.brandId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Brand is required for ${data.role} role`,
        path: ["brandId"],
      });
    }
    if (data.role === "ADVERTISER_VIEWER" && !data.advertiserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Advertiser is required for ADVERTISER_VIEWER role",
        path: ["advertiserId"],
      });
    }
  });

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
