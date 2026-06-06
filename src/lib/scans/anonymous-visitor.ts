// src/lib/scans/anonymous-visitor.ts
import { cookies } from "next/headers";
import crypto from "crypto";

export async function getOrCreateAnonymousVisitorId(): Promise<string> {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch (e) {
    if (process.env.NODE_ENV === "production") {
      // In production, cookies() must always succeed within a request context.
      // Return a per-call unique ID rather than a shared hardcoded value to avoid
      // collapsing all cookie-less scans into a single visitor bucket.
      return crypto.randomUUID();
    }
    // Dev/test only: stable ID makes repeated calls easy to trace.
    return "test-visitor-id-123";
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
