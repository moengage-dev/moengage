// src/lib/scans/ip-location.ts
import crypto from "crypto";

export type ApproximateLocation = {
  ipHash: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  suburb: string | null;
  latitude: number | null;
  longitude: number | null;
  locationSource: "IP";
};

export function getApproximateLocationFromHeaders(headers: Headers): ApproximateLocation {
  // Extract client IP
  let ip: string | null = null;
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    ip = xForwardedFor.split(",")[0].trim();
  }
  if (!ip) {
    ip = headers.get("x-real-ip");
  }
  if (!ip) {
    ip = headers.get("cf-connecting-ip");
  }

  // Hash IP
  const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex") : null;

  // Extract location fields from Vercel headers or fallbacks
  const country = headers.get("x-vercel-ip-country") || null;
  const region = headers.get("x-vercel-ip-country-region") || null;
  const city = headers.get("x-vercel-ip-city") || null;
  const suburb = null; // Suburb is not standard, keep null

  // Extract lat/long if Vercel headers provide them
  const latStr = headers.get("x-vercel-ip-latitude");
  const longStr = headers.get("x-vercel-ip-longitude");
  const latitude = latStr ? parseFloat(latStr) : null;
  const longitude = longStr ? parseFloat(longStr) : null;

  return {
    ipHash,
    country,
    region,
    city,
    suburb,
    latitude: isNaN(latitude as any) ? null : latitude,
    longitude: isNaN(longitude as any) ? null : longitude,
    locationSource: "IP",
  };
}
