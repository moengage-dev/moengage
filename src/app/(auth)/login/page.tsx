"use client";

import React, { Suspense } from "react";
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
        await checkSession();
      }
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
      setLoading(false);
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

  const checkSession = async () => {
    const sess = await getSession();
    if (sess?.user) {
      const { isEmailVerified, email, role } = sess.user;

      if (!isEmailVerified) {
        setMessage({
          type: "error",
          text: (
            <>
              Your email is not verified.{" "}
              <button
                onClick={() => email && ReSendVerificationEmail(email)}
                className="text-primary underline font-medium hover:text-emerald-600"
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
      setTimeout(() => {
        router.push(destination);
      }, 600);
    } else {
      setTimeout(checkSession, 500);
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
    <div className="relative min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 py-12">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">Validating credentials...</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">MoEngage</h1>
          <p className="text-sm text-muted-foreground">
            FMCG Engagement Platform
          </p>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardDescription className="text-center">
              {message ? (
                <div
                  className={`text-sm ${
                    message.type === "error" ? "text-destructive" : "text-emerald-600"
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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={buttonDisabled || loading}
                className="w-full"
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
