// src/lib/scans/device-parser.ts
export type ParsedUserAgent = {
  deviceType: string;
  os: string;
  browser: string;
};

export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  if (!userAgent) {
    return {
      deviceType: "Desktop",
      os: "Unknown OS",
      browser: "Unknown Browser",
    };
  }

  const ua = userAgent.toLowerCase();

  // 1. Device Type
  let deviceType = "Desktop";
  if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("android") || ua.includes("ipad")) {
    deviceType = "Mobile";
  }

  // 2. OS
  let os = "Unknown OS";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    os = "iOS";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("macintosh") || ua.includes("mac os")) {
    os = "Mac";
  } else if (ua.includes("linux")) {
    os = "Linux";
  }

  // 3. Browser
  let browser = "Unknown Browser";
  if (ua.includes("edg/")) {
    browser = "Edge";
  } else if (ua.includes("chrome") || ua.includes("crios")) {
    browser = "Chrome";
  } else if (ua.includes("safari")) {
    browser = "Safari";
  } else if (ua.includes("firefox") || ua.includes("fxios")) {
    browser = "Firefox";
  }

  return { deviceType, os, browser };
}
