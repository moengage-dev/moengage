// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

type AppRole =
  | "ADMIN"
  | "BRAND_ADMIN"
  | "CAMPAIGN_MANAGER"
  | "ADVERTISER_VIEWER"
  | "RETAIL_OPERATIONS";

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
  ],
};
