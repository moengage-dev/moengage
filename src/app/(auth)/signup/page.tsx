"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
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
import Link from "next/link";

type Message = { type: "error" | "success"; text: React.ReactNode };

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "error" in error.response.data &&
    typeof error.response.data.error === "string"
  ) {
    return error.response.data.error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value === "/dashboard") {
    return null;
  }
  return value;
}

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = normalizeNextPath(searchParams.get("next"));
  const loginHref = `/login${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`;

  const [user, setUser] = React.useState({
    name: "",
    email: "",
    password: "",
  });

  const [buttonDisabled, setButtonDisabled] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<Message | null>(null);

  useEffect(() => {
    setButtonDisabled(!(user.name.trim() && user.email.trim() && user.password.length >= 8));
  }, [user]);

  const onSignup = async () => {
    setMessage(null);
    setLoading(true);

    try {
      const res = await axios.post("/api/auth/signup", {
        name: user.name.trim(),
        email: user.email.trim().toLowerCase(),
        password: user.password,
      });

      setMessage({
        type: "success",
        text: res.data?.message || "Account created. Redirecting to verification...",
      });

      const emailParam = encodeURIComponent(user.email.trim().toLowerCase());
      const redirectUrl = `/verify-email?email=${emailParam}${nextParam ? `&next=${encodeURIComponent(nextParam)}` : ""}`;

      setTimeout(() => {
        router.push(redirectUrl);
      }, 1500);
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: getErrorMessage(err, "Failed to create account. Please try again."),
      });
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 py-12">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">Creating account...</p>
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
                "Create a new account"
              )}
            </CardDescription>
          </CardHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSignup();
            }}
          >
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={user.password}
                  onChange={(e) => setUser({ ...user, password: e.target.value })}
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
                Sign Up
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link href={loginHref} className="text-primary hover:underline font-medium">
                  Login
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

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}
