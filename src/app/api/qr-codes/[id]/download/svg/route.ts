import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { generateQRCodeDownloadData } from "@/server/services/qr-codes.service";
import type { ScopedUser } from "@/server/services/qr-codes.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const scopedUser: ScopedUser = {
      id: user.id,
      role: user.role,
      brandId: user.brandId,
      advertiserId: user.advertiserId,
    };
    const result = await generateQRCodeDownloadData(id, "svg", scopedUser);
    if (!result.ok) {
      return new NextResponse(result.error, { status: 404 });
    }

    const { code, content } = result.data;

    return new NextResponse(content as string, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="qr-${code}.svg"`,
      },
    });
  } catch (e) {
    console.error("[api/qr-codes/download/svg] Error:", e);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
