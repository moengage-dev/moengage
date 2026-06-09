// src/lib/scans/anonymous-visitor.ts
import { cookies } from "next/headers";
import crypto from "crypto";

export async function getOrCreateAnonymousVisitorId(): Promise<string> {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    // Calls outside a request context cannot persist identity. Use a unique ID
    // rather than fabricating a shared visitor that would distort aggregation.
    return crypto.randomUUID();
  }

  const existing = cookieStore.get("moengage_visitor_id")?.value;
  if (existing) {
    return existing;
  }

  const newId = crypto.randomUUID();
  try {
    cookieStore.set("moengage_visitor_id", newId, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  } catch (e) {
    // Catch read-only cookie modification errors in page render contexts
    console.warn("[getOrCreateAnonymousVisitorId] Could not set cookie in this context:", e);
  }
  return newId;
}
