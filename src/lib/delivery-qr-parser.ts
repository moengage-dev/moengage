export function parseDeliveryQrPayload(
  payload: string,
  appOrigin: string = typeof window !== "undefined" ? window.location.origin : ""
): string | null {
  const trimmed = payload.trim();
  if (!trimmed) return null;

  const lowerPayload = trimmed.toLowerCase();
  if (lowerPayload.startsWith("javascript:") || lowerPayload.startsWith("data:")) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);

      const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      const isSameOrigin = appOrigin && url.origin === appOrigin;
      const isConfiguredOrigin = url.hostname === "moengage-qr.vercel.app";

      if (!isLocalhost && !isSameOrigin && !isConfiguredOrigin) {
        return null;
      }

      return extractCodeFromPath(url.pathname);
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith("/")) {
    return extractCodeFromPath(trimmed);
  }

  if (trimmed.includes("/") || trimmed.includes("\\")) return null;

  if (trimmed === ".." || trimmed === "." || trimmed.includes("..")) return null;

  return `/d/${encodeURIComponent(trimmed)}`;
}

function extractCodeFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  if (parts[0] !== "d") return null;

  const code = parts[1];
  
  if (!code || code === ".." || code === ".") return null;

  try {
    const decoded = decodeURIComponent(code);
    if (decoded === ".." || decoded === "." || decoded.includes("/")) return null;
    return `/d/${encodeURIComponent(code)}`;
  } catch {
    // Malformed URI component
    return null;
  }
}
