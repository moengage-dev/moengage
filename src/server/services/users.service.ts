// src/server/services/users.service.ts
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { UserRole } from "@prisma/client";
import { createUserSchema, updateUserSchema } from "@/lib/validators/user.validator";
import type { CreateUserFormValues, UpdateUserFormValues } from "@/lib/validators/user.validator";

export type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  brandId: string | null;
  brandName: string | null;
  advertiserId: string | null;
  advertiserName: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
};

export type BrandOption = {
  id: string;
  name: string;
};

export type AdvertiserOption = {
  id: string;
  name: string;
};

export type AdminUsersPageData = {
  users: UserRow[];
  brands: BrandOption[];
  advertisers: AdvertiserOption[];
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  inactiveUsers: number;
};

export type ServiceResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toUserRow(u: {
  id: string;
  name: string | null;
  email: string;
  role: string;
  brandId: string | null;
  advertiserId: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  brand: { name: string } | null;
  advertiser: { name: string } | null;
}): UserRow {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    brandId: u.brandId,
    brandName: u.brand?.name ?? null,
    advertiserId: u.advertiserId,
    advertiserName: u.advertiser?.name ?? null,
    isActive: u.isActive,
    isEmailVerified: u.isEmailVerified,
    createdAt: u.createdAt.toISOString(),
  };
}

const userInclude = {
  brand: { select: { name: true } },
  advertiser: { select: { name: true } },
} as const;

export async function getAdminUsersPageData(): Promise<AdminUsersPageData> {
  const [
    users,
    brands,
    advertisers,
    activeUsers,
    verifiedUsers,
    inactiveUsers,
  ] = await Promise.all([
    // Use explicit select (not include) so passwordHash is never loaded into memory
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        brandId: true,
        advertiserId: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        brand: { select: { name: true } },
        advertiser: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.brand.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.advertiser.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isEmailVerified: true } }),
    prisma.user.count({ where: { isActive: false } }),
  ]);

  const totalUsers = users.length;

  return {
    users: users.map(toUserRow),
    brands: brands.map((b) => ({ id: b.id, name: b.name })),
    advertisers: advertisers.map((a) => ({ id: a.id, name: a.name })),
    totalUsers,
    activeUsers,
    verifiedUsers,
    inactiveUsers,
  };
}

export async function createUser(
  input: CreateUserFormValues
): Promise<ServiceResult<UserRow>> {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    name,
    email,
    password,
    role,
    brandId,
    advertiserId,
    isActive,
    isEmailVerified,
  } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: `Email "${email}" is already registered` };
  }

  const passwordHash = await bcryptjs.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role as UserRole,
      brandId: brandId ?? null,
      advertiserId: advertiserId ?? null,
      isActive,
      isEmailVerified,
      emailVerifiedAt: isEmailVerified ? new Date() : null,
    },
    include: userInclude,
  });

  return { ok: true, data: toUserRow(user) };
}

export async function updateUser(
  id: string,
  input: UpdateUserFormValues
): Promise<ServiceResult<UserRow>> {
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    name,
    email,
    password,
    role,
    brandId,
    advertiserId,
    isActive,
    isEmailVerified,
  } = parsed.data;

  // Check user exists first
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { role: true, isActive: true, isEmailVerified: true, emailVerifiedAt: true },
  });
  if (!existing) {
    return { ok: false, error: "User not found" };
  }

  const emailConflict = await prisma.user.findFirst({
    where: { email, NOT: { id } },
    select: { id: true },
  });
  if (emailConflict) {
    return { ok: false, error: `Email "${email}" is already registered` };
  }

  const losingActiveAdmin =
    (existing.role === "ADMIN" && role !== "ADMIN") ||
    (existing.role === "ADMIN" && role === "ADMIN" && existing.isActive && !isActive);

  if (losingActiveAdmin) {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, NOT: { id } },
    });
    if (adminCount === 0) {
      return {
        ok: false,
        error: "Cannot remove the only active admin. Promote another user to ADMIN first.",
      };
    }
  }

  const passwordHash = password
    ? await bcryptjs.hash(password, 10)
    : undefined;

  let emailVerifiedAt: Date | null | undefined = undefined;
  if (isEmailVerified && !existing.emailVerifiedAt) {
    emailVerifiedAt = new Date();
  } else if (!isEmailVerified) {
    emailVerifiedAt = null;
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      role: role as UserRole,
      brandId: brandId ?? null,
      advertiserId: advertiserId ?? null,
      isActive,
      isEmailVerified,
      ...(passwordHash !== undefined && { passwordHash }),
      ...(emailVerifiedAt !== undefined && { emailVerifiedAt }),
    },
    include: userInclude,
  });

  return { ok: true, data: toUserRow(user) };
}

export async function deactivateUser(id: string): Promise<ServiceResult> {
  // Last-admin guard
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true, isActive: true },
  });
  if (!user) return { ok: false, error: "User not found" };

  if (user.role === "ADMIN" && user.isActive) {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, NOT: { id } },
    });
    if (adminCount === 0) {
      return {
        ok: false,
        error: "Cannot deactivate the only active admin.",
      };
    }
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });
  return { ok: true, data: undefined };
}

export async function activateUser(id: string): Promise<ServiceResult> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!user) return { ok: false, error: "User not found" };

  await prisma.user.update({
    where: { id },
    data: { isActive: true },
  });
  return { ok: true, data: undefined };
}
