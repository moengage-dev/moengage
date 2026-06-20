"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  createProduct,
  updateProduct,
  archiveProduct,
} from "@/server/services/products.service";
import type { ProductFormValues } from "@/lib/validators/product.validator";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createProductAction(
  input: ProductFormValues
): Promise<ActionResult> {
  try {
    const user = await requireRole(["BRAND_ADMIN"]);
    const result = await createProduct(input, user);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/brand/products");
    return { ok: true, message: "Product created successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function updateProductAction(
  id: string,
  input: ProductFormValues
): Promise<ActionResult> {
  try {
    const user = await requireRole(["BRAND_ADMIN"]);
    const result = await updateProduct(id, input, user);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/brand/products");
    return { ok: true, message: "Product updated successfully." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}

export async function archiveProductAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireRole(["BRAND_ADMIN"]);
    await archiveProduct(id, user);
    revalidatePath("/brand/products");
    return { ok: true, message: "Product archived." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { ok: false, error: "Unexpected error. Please try again." };
  }
}
