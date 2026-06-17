"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Message = { type: "error" | "success"; text: string };
type LoadingAction = "verify" | "resend" | null;

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value === "/dashboard") {
    return null;
  }
  return value;
}

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

function VerifyEmailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";
  const nextParam = normalizeNextPath(searchParams.get("next"));

  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<Message | null>(null);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);

  const canResend = useMemo(() => cooldown === 0 && !!email, [cooldown, email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verifyOtp = async () => {
    setMessage(null);

    if (!email || code.trim().length !== 6) {
      setMessage({
        type: "error",
        text: "Please enter the 6-digit verification code.",
      });
      return;
    }

    try {
      setLoading(true);
      setLoadingAction("verify");

      const response = await axios.post("/api/auth/verify-email", {
        email,
        code: code.trim(),
      });

      const successMessage =
        response.data?.message || "Email verified successfully.";

      setMessage({
        type: "success",
        text: successMessage,
      });

      toast.success("Success", {
        description: successMessage,
      });

      setIsVerified(true);

      const loginRedirectUrl = `/login${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`;
      setTimeout(() => {
        router.push(loginRedirectUrl);
      }, 900);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(
        error,
        "Failed to verify email.",
      );

      setMessage({
        type: "error",
        text: errorMessage,
      });

      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  const resendCode = async () => {
    setMessage(null);

    if (!email || !canResend) return;

    try {
      setLoading(true);
      setLoadingAction("resend");

      await axios.post("/api/auth/send-email-verification", { email });

      setMessage({
        type: "success",
        text: "A new verification code has been sent.",
      });

      toast.success("Success", {
        description: "A new verification code has been sent.",
      });

      setCooldown(30);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(
        error,
        "Failed to resend verification code.",
      );

      setMessage({
        type: "error",
        text: errorMessage,
      });

      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  return (
    <div className="public-page-bg flex flex-col justify-center items-center px-4 py-12">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" aria-live="polite" aria-busy="true">
          <div className="public-card flex flex-col items-center gap-4 px-8 py-7">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm font-medium">
              {isVerified
                ? "Redirecting..."
                : loadingAction === "resend"
                  ? "Sending a new code..."
                  : "Verifying your code..."}
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <div className="mx-auto mb-1 inline-flex rounded-full border border-border/60 bg-card/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            Verify email
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">MoEngage</h1>
          <p className="text-sm text-muted-foreground">
            FMCG Engagement Platform
          </p>
        </div>

        <Card className="public-card w-full">
          <CardHeader className="pb-2">
            <CardDescription className="text-center">
              <span className="text-muted-foreground text-sm">
                We sent a 6-digit verification code to
              </span>
              <span className="block mt-1 font-medium text-foreground break-all">
                {email || "your email"}
              </span>

              {message && (
                <div
                  role={message.type === "error" ? "alert" : "status"}
                  className={`mt-3 rounded-2xl border px-4 py-3 text-center text-sm ${
                    message.type === "error"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-brand-teal/30 bg-brand-teal/15 text-foreground"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {!isVerified && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-center block text-sm text-muted-foreground">
                    Verification Code
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      if (message?.type === "error") {
                        setMessage(null);
                      }
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter 6-digit OTP"
                    className="h-12 text-center text-2xl tracking-[0.4em]"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={verifyOtp}
                    disabled={loading || code.trim().length !== 6}
                    className="w-full"
                  >
                    {loading && loadingAction === "verify" ? "Verifying..." : "Verify"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resendCode}
                    disabled={!canResend || loading}
                    className="w-full"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MoEngage. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}
