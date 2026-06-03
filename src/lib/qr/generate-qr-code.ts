import QRCode from "qrcode";
import crypto from "crypto";
import { QRCodeType } from "@/lib/validators/qr-code.validator";

export async function generateQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url);
}

export async function generateQrCodeSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg" });
}

export async function generateQrCodePngBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url);
}

export function generateQrCodePublicCode(prefix?: string): string {
  const randomStr = crypto.randomBytes(4).toString("hex"); // e.g., "7f8a9b2c"
  const pfx = prefix ? `${prefix}-` : "";
  return `${pfx}${randomStr}`;
}

export function buildQrDestinationUrl(code: string, type: QRCodeType): string {
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const path = type === "BATCH_DELIVERY" ? "d" : "q";
  return `${baseUrl}/${path}/${code}`;
}
