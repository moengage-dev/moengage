import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getConsumerQRCodeByCode } from "@/server/services/public-scan.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ code: string }> }
) {
  const { code } = await props.params;

  // 1. Fetch the QR code status. If it's a BATCH_DELIVERY, redirect directly to `/d/[code]`.
  const result = await getConsumerQRCodeByCode(code);
  if (result.status === "BATCH_DELIVERY") {
    return NextResponse.redirect(new URL(`/d/${code}`, request.url));
  }

  // 2. Redirect to the landing sub-route, then attach the visitor cookie to the
  //    redirect response itself. Setting it via next/headers cookies() does not
  //    reliably persist onto a separately-returned NextResponse, which would break
  //    visitor-based repeat-scan detection.
  const landingUrl = new URL(`/q/${code}/landing`, request.url);
  const response = NextResponse.redirect(landingUrl);

  const cookieStore = await cookies();
  const existingVisitorId = cookieStore.get("moengage_visitor_id")?.value;

  if (!existingVisitorId) {
    const visitorId = crypto.randomUUID();
    response.cookies.set("moengage_visitor_id", visitorId, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  return response;
}
