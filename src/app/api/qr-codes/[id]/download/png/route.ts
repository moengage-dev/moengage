import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { generateQRCodeDownloadData } from "@/server/services/qr-codes.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const result = await generateQRCodeDownloadData(id, "png");
    if (!result.ok) {
      return new NextResponse(result.error, { status: 404 });
    }

    const { code, content } = result.data;

    return new NextResponse(content as any, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="qr-${code}.png"`,
      },
    });
  } catch (e) {
    console.error("[api/qr-codes/download/png] Error:", e);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
