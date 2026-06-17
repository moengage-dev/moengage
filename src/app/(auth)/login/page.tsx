"use client";

import React, { Suspense, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Message = { type: "error" | "success"; text: React.ReactNode };

function getDefaultDashboard(role: string) {
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
      return "/";
  }
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value === "/dashboard") {
    return null;
  }
  return value;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = normalizeNextPath(searchParams.get("next"));
  const signupHref = `/signup${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`;

  const [user, setUser] = React.useState({ email: "", password: "" });
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<Message | null>(null);

  // Prevent concurrent polling loops and stop after unmount
  const pollingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const buttonDisabled = !(user.email && user.password);

  const onLogin = async () => {
    setMessage(null);

    if (!user.email || !user.password) {
      setMessage({
        type: "error",
        text: "Email and Password cannot be empty!",
      });
      return;
    }

    // Guard against concurrent submissions
    if (pollingRef.current) return;

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: user.email,
        password: user.password,
      });

      if (result?.error) {
        setMessage({
          type: "error",
          text: result.error || "Invalid credentials.",
        });
        setLoading(false);
      } else {
        await awaitSession();
      }
    } catch (err) {
      console.error("Login error (no sensitive data):", (err as Error)?.message ?? "unknown");
      if (mountedRef.current) {
        setMessage({
          type: "error",
          text: "An unexpected error occurred. Please try again.",
        });
        setLoading(false);
      }
    }
  };

  const ReSendVerificationEmail = async (email: string) => {
    try {
      const res = await fetch("/api/auth/send-email-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Verification email sent!" });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to send email.",
        });
      }
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "Something went wrong sending the email.",
      });
    }
  };

  /**
   * Polls getSession() up to MAX_POLL_ATTEMPTS times (500 ms apart ≈ 4 s total).
   * Uses an iterative loop so there is no unbounded recursion.
   * Bails out immediately if the component unmounts between attempts.
   */
  const awaitSession = async () => {
    const MAX_POLL_ATTEMPTS = 8;
    const POLL_INTERVAL_MS = 500;

    if (pollingRef.current) return;
    pollingRef.current = true;

    try {
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        if (!mountedRef.current) return;

        const sess = await getSession();

        if (sess?.user) {
          if (!mountedRef.current) return;

          const { isEmailVerified, email, role } = sess.user;

          if (!isEmailVerified) {
            setMessage({
              type: "error",
              text: (
                <>
                  Your email is not verified.{" "}
                  <button
                    onClick={() => email && ReSendVerificationEmail(email)}
                    className="text-primary underline font-medium hover:text-primary/80"
                  >
                    Click here to resend verification email.
                  </button>
                </>
              ),
            });
            setLoading(false);
            return;
          }

          setMessage({ type: "success", text: "Login successful! Redirecting…" });
          const destination = nextParam || getDefaultDashboard(role || "");
          router.replace(destination);
          router.refresh();
          return;
        }

        // Session not yet ready — wait before the next attempt
        if (attempt < MAX_POLL_ATTEMPTS - 1) {
          await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      }

      // All attempts exhausted — session never materialised
      if (mountedRef.current) {
        setMessage({
          type: "error",
          text: "Your credentials were accepted, but the session could not be established. Clear your site cookies and try again.",
        });
        setLoading(false);
      }
    } finally {
      pollingRef.current = false;
    }
  };

  const handleEnterSubmit = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    if (buttonDisabled || loading) {
      return;
    }
    void onLogin();
  };

  return (
    <div className="auth-page-bg flex flex-col justify-center items-center px-4 py-16 md:py-24">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" aria-live="polite" aria-busy="true">
          <div className="public-card flex flex-col items-center gap-4 px-8 py-7">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">Validating credentials...</p>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-[420px] flex flex-col gap-8">
        <div className="flex flex-col gap-3 text-center">
          <div className="mx-auto mb-1 inline-flex rounded-full border border-border/60 bg-card/75 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Secure access
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">MoEngage</h1>
          <p className="text-sm text-muted-foreground">
            FMCG Engagement Platform
          </p>
        </div>

        <Card className="public-card w-full shadow-lg border border-border/80">
          <CardHeader className="pb-4 pt-6">
            <CardDescription className="text-center">
              {message ? (
                <div
                  role={message.type === "error" ? "alert" : "status"}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    message.type === "error"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-brand-teal/30 bg-brand-teal/15 text-foreground"
                  }`}
                >
                  {message.text}
                </div>
              ) : (
                "Login to access your dashboard"
              )}
            </CardDescription>
          </CardHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onLogin();
            }}
          >
            <CardContent className="space-y-4 px-6">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground/90">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={user.email}
                  onKeyDown={handleEnterSubmit}
                  onChange={(e) =>
                    setUser({ ...user, email: e.target.value })
                  }
                  className="h-10 bg-background focus-visible:ring-ring"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-foreground/90">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={user.password}
                  onKeyDown={handleEnterSubmit}
                  onChange={(e) =>
                    setUser({ ...user, password: e.target.value })
                  }
                  className="h-10 bg-background focus-visible:ring-ring"
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 px-6 pb-8 pt-4">
              <Button
                type="submit"
                disabled={buttonDisabled || loading}
                className="w-full h-10 text-sm font-semibold"
              >
                Login
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Need an account?{" "}
                <Link href={signupHref} className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MoEngage. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
