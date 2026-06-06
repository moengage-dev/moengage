// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

type AppRole =
  | "ADMIN"
  | "BRAND_ADMIN"
  | "CAMPAIGN_MANAGER"
  | "ADVERTISER_VIEWER"
  | "RETAIL_OPERATIONS";

// Initialize Upstash Redis
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

// Initialize Ratelimit instances (sliding window configuration)
const limiters = redis ? {
  start: {
    phoneHour: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      analytics: true,
      prefix: "ratelimit:start:phone:hour",
    }),
    phoneCooldown: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "60 s"),
      analytics: true,
      prefix: "ratelimit:start:phone:cooldown",
    }),
    ip: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "10 m"),
      analytics: true,
      prefix: "ratelimit:start:ip",
    }),
  },
  verify: {
    phoneHour: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      analytics: true,
      prefix: "ratelimit:verify:phone:hour",
    }),
    ip: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "10 m"),
      analytics: true,
      prefix: "ratelimit:verify:ip",
    }),
  },
} : null;

// Helper to normalize phone numbers
function normalizeMobileNumber(mobileNumber: string): string {
  const trimmed = mobileNumber.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

// Edge-safe cryptographic hash function using Web Crypto API
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getDefaultDashboard(role?: string) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "BRAND_ADMIN":
      return "/brand";
    case "CAMPAIGN_MANAGER":
      return "/campaign-manager";
    case "ADVERTISER_VIEWER":
      return "/advertiser";
    case "RETAIL_OPERATIONS":
      return "/retail";
    default:
      return "/login";
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(loginUrl);
}

function roleIsAllowed(role: string | undefined, allowedRoles: AppRole[]) {
  if (!role) return false;
  // ADMIN can access all protected dashboards
  if (role === "ADMIN") return true;
  return allowedRoles.includes(role as AppRole);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Stricter rate-limiting rules for public reward API endpoints
  if (pathname.startsWith("/api/public/rewards/")) {
    if (!redis || !limiters) {
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction) {
        // Fail closed in production: do not allow reward endpoints without rate limiting.
        console.error(
          "[proxy] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not configured. " +
          "Rate limiting is required in production. Rejecting request."
        );
        return new NextResponse(
          JSON.stringify({
            ok: false,
            error: "SERVICE_UNAVAILABLE",
            message: "Service temporarily unavailable. Please try again later.",
          }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }
      // Dev/test: allow pass-through with a warning
      console.warn("[proxy] Upstash Redis not configured. Bypassing rate limits (dev/test only).");
      return NextResponse.next();
    }

    const cleanPath = pathname.replace(/\/$/, "");
    const isStart = cleanPath === "/api/public/rewards/start";
    const isVerify = cleanPath === "/api/public/rewards/verify";

    // Only apply rate limits to start and verify endpoints
    if (!isStart && !isVerify) {
      return NextResponse.next();
    }

    // Extract client IP address
    let ip = (request as any).ip;
    if (!ip) {
      const xForwardedFor = request.headers.get("x-forwarded-for");
      if (xForwardedFor) {
        ip = xForwardedFor.split(",")[0].trim();
      }
    }
    if (!ip) {
      ip = request.headers.get("x-real-ip") || "127.0.0.1";
    }

    // Extract phone number from request body if POST
    let mobileNumber: string | null = null;
    if (request.method === "POST") {
      try {
        const cloned = request.clone();
        const body = await cloned.json();
        if (body && typeof body === "object" && "mobileNumber" in body && body.mobileNumber) {
          mobileNumber = String(body.mobileNumber).trim();
        }
      } catch (e) {
        // Ignore JSON parse errors in middleware
      }
    }

    const rateLimitExceededResponse = () => {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: "RATE_LIMIT_EXCEEDED",
          message: "Too many verification requests. Please wait a few minutes before trying again.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    if (isStart) {
      // 1. IP check: 20 sends / 10 minutes
      const ipLimit = await limiters.start.ip.limit(ip);
      if (!ipLimit.success) {
        return rateLimitExceededResponse();
      }

      // 2. Phone checks if mobileNumber exists
      if (mobileNumber) {
        const normalized = normalizeMobileNumber(mobileNumber);
        const hashedPhone = await sha256(normalized);

        // Phone cooldown: 1 send / 60 seconds
        const phoneCooldownLimit = await limiters.start.phoneCooldown.limit(hashedPhone);
        if (!phoneCooldownLimit.success) {
          return rateLimitExceededResponse();
        }

        // Phone hour limit: 3 sends / 1 hour
        const phoneHourLimit = await limiters.start.phoneHour.limit(hashedPhone);
        if (!phoneHourLimit.success) {
          return rateLimitExceededResponse();
        }
      }
    } else if (isVerify) {
      // 1. IP check: 30 attempts / 10 minutes
      const ipLimit = await limiters.verify.ip.limit(ip);
      if (!ipLimit.success) {
        return rateLimitExceededResponse();
      }

      // 2. Phone checks if mobileNumber exists: 3 attempts / 1 hour
      if (mobileNumber) {
        const normalized = normalizeMobileNumber(mobileNumber);
        const hashedPhone = await sha256(normalized);

        const phoneHourLimit = await limiters.verify.phoneHour.limit(hashedPhone);
        if (!phoneHourLimit.success) {
          return rateLimitExceededResponse();
        }
      }
    }

    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  }).catch(() => null);

  const role = token?.role as AppRole | undefined;

  // Auth pages: redirect logged-in users to their dashboard
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/forgot-password");

  if (token && isAuthPage) {
    return NextResponse.redirect(
      new URL(getDefaultDashboard(role), request.url),
    );
  }

  // Legacy /dashboard route: redirect to role-specific dashboard
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!token) {
      return redirectToLogin(request);
    }
    return NextResponse.redirect(
      new URL(getDefaultDashboard(role), request.url),
    );
  }

  // Root / redirect for logged-in users
  if (pathname === "/" && token) {
    return NextResponse.redirect(
      new URL(getDefaultDashboard(role), request.url),
    );
  }

  const protectedRoutes: Array<{
    prefix: string;
    roles: AppRole[];
  }> = [
    { prefix: "/admin", roles: ["ADMIN"] },
    { prefix: "/brand", roles: ["BRAND_ADMIN"] },
    { prefix: "/campaign-manager", roles: ["CAMPAIGN_MANAGER"] },
    { prefix: "/advertiser", roles: ["ADVERTISER_VIEWER"] },
    { prefix: "/retail", roles: ["RETAIL_OPERATIONS"] },
    { prefix: "/d", roles: ["RETAIL_OPERATIONS"] },
  ];

  const matchedRoute = protectedRoutes.find((route) =>
    pathname.startsWith(route.prefix),
  );

  if (!matchedRoute) {
    return NextResponse.next();
  }

  if (!token) {
    return redirectToLogin(request);
  }

  if (!roleIsAllowed(role, matchedRoute.roles)) {
    return NextResponse.redirect(
      new URL(getDefaultDashboard(role), request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/verify-email",
    "/forgot-password",
    "/dashboard/:path*",
    "/admin/:path*",
    "/brand/:path*",
    "/campaign-manager/:path*",
    "/advertiser/:path*",
    "/retail/:path*",
    "/d/:path*",
    "/api/public/rewards/:path*",
  ],
};
