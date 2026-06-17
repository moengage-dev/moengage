// src/components/campaign/public-campaign-landing.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Gift,
  CheckCircle,
  ArrowRight,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Lock,
  RefreshCw,
} from "lucide-react";
import { formatStatusLabel } from "@/lib/format";
import { getFriendlyErrorMessage } from "@/components/experience/client-utils";

type Props = {
  qrCode: {
    code: string;
    label: string | null;
    brand?: { name: string } | null;
    advertiser?: { name: string } | null;
    product?: { name: string } | null;
    campaign?: {
      id: string;
      name: string;
      offerTitle: string;
      offerDescription: string | null;
      rewardType: string;
    } | null;
  };
  scanEventId: string | null;
  debugInfo?: {
    scanEventId: string;
    isRepeatScan: boolean;
    location: any;
  } | null;
};

export function PublicCampaignLanding({ qrCode, scanEventId, debugInfo }: Props) {
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpVerificationId, setOtpVerificationId] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [uiState, setUiState] = useState<
    "initial" | "sending_otp" | "otp_sent" | "verifying_otp" | "approved" | "error"
  >("initial");
  const [errorMessage, setErrorMessage] = useState("");

  const brandName = qrCode.brand?.name ?? "Brand Promotion";
  const advertiserName = qrCode.advertiser?.name ?? null;
  const productName = qrCode.product?.name ?? null;
  const offerTitle = qrCode.campaign?.offerTitle ?? "Special Promotion Offer";
  const offerDescription =
    qrCode.campaign?.offerDescription ?? "Scan this code to view and unlock exciting brand rewards.";
  const rewardType = qrCode.campaign?.rewardType ?? "VOUCHER";
  const campaignId = qrCode.campaign?.id ?? "";
  const canClaimReward = Boolean(scanEventId && campaignId);

  // 1. Start Reward Claim (Send OTP)
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!scanEventId) {
      setErrorMessage("No valid scan event id found. Please re-scan the QR code.");
      setUiState("error");
      return;
    }
    if (!mobileNumber.trim()) {
      setErrorMessage("Mobile number is required.");
      setUiState("error");
      return;
    }

    setUiState("sending_otp");
    setErrorMessage("");

    try {
      const response = await fetch("/api/public/rewards/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanEventId,
          campaignId,
          mobileNumber,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (data.status === "DUPLICATE_CLAIM") {
          setOtp("");
          setOtpVerificationId("");
          setDemoOtp("");
          setErrorMessage(getFriendlyErrorMessage(data.status));
          setUiState("error");
        } else {
          const rawErr = data.error || data.status;
          console.warn("[Reward Claim OTP Start failed] Internal error:", rawErr, "Details:", data);
          setErrorMessage(getFriendlyErrorMessage(rawErr));
          setUiState("error");
        }
        return;
      }

      setOtpVerificationId(data.otpVerificationId);
      if (data.demoOtp) {
        setDemoOtp(data.demoOtp);
      }
      setUiState("otp_sent");
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error. Please try again.");
      setUiState("error");
    }
  }

  // 2. Verify OTP & Approve Claim
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) {
      setErrorMessage("OTP verification code is required.");
      return;
    }

    setUiState("verifying_otp");
    setErrorMessage("");

    try {
      const response = await fetch("/api/public/rewards/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otpVerificationId,
          scanEventId,
          campaignId,
          mobileNumber,
          otp,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (data.status === "EXPIRED_OTP") {
          setErrorMessage("This OTP code has expired. Please request a new one.");
          setUiState("otp_sent");
        } else {
          const rawErr = data.error || data.status;
          console.warn("[Reward Claim OTP Verify failed] Internal error:", rawErr, "Details:", data);
          setErrorMessage(getFriendlyErrorMessage(rawErr));
          setUiState("otp_sent"); // Let them try again
        }
        return;
      }

      setUiState("approved");
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error. Please try again.");
      setUiState("otp_sent");
    }
  }

  function handleReset() {
    setMobileNumber("");
    setOtp("");
    setOtpVerificationId("");
    setDemoOtp("");
    setErrorMessage("");
    setUiState("initial");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Main Card Container */}
      <main className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-brand-coral/10 border border-brand-coral/20 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider text-brand-coral uppercase">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            Exclusive Campaign
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mt-2">
            {brandName}
          </h1>
          {advertiserName && (
            <p className="text-sm text-muted-foreground">
              Powered by <span className="font-semibold text-foreground">{advertiserName}</span>
            </p>
          )}
        </div>

        {/* Campaign Offer Details Card */}
        <Card className="bg-card text-card-foreground rounded-2xl border border-border/60 shadow-xl p-6 md:p-8 relative overflow-hidden">
          <CardHeader className="pb-3 text-center px-0 pt-0">
            <div className="mx-auto bg-brand-coral/10 w-12 h-12 rounded-xl flex items-center justify-center mb-3">
              <Gift className="h-6 w-6 text-brand-coral" />
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold text-foreground">
              {offerTitle}
            </CardTitle>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Reward Type: {formatStatusLabel(rewardType)}
            </p>
          </CardHeader>

          <CardContent className="space-y-6 px-0 pb-0">
            <p className="text-sm text-muted-foreground leading-relaxed text-center">
              {offerDescription}
            </p>

            {productName && (
              <div className="bg-background border border-border/50 rounded-xl p-3 text-center">
                <span className="text-xs text-muted-foreground/80 uppercase tracking-widest block mb-0.5">Product</span>
                <span className="text-sm font-semibold text-foreground">{productName}</span>
              </div>
            )}

            {!scanEventId && (
              <div className="bg-brand-coral/15 border border-brand-coral/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1 text-destructive">
                  <p className="text-sm font-semibold">Scan event warning</p>
                  <p className="text-xs opacity-90">
                    Your scan was not recorded. You can still view this offer, but reward claiming is disabled. Please try scanning the code again.
                  </p>
                </div>
              </div>
            )}

            {scanEventId && !campaignId && (
              <div className="bg-brand-coral/15 border border-brand-coral/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1 text-destructive">
                  <p className="text-sm font-semibold">Reward unavailable</p>
                  <p className="text-xs opacity-90">
                    This QR code is not linked to a reward campaign. You can still view the promotion details.
                  </p>
                </div>
              </div>
            )}

            <Separator className="bg-border/60" />

            {/* Claim Reward Process Flow Container */}
            <div className="space-y-4">
              {/* Approved View */}
              {uiState === "approved" && (
                <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="mx-auto w-16 h-16 bg-brand-teal/15 border border-brand-teal/20 text-foreground rounded-full flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">Reward claimed successfully.</h3>
                    <p className="text-xs text-muted-foreground">
                      Your request has been approved. The reward was successfully provisioned in demo mode.
                    </p>
                  </div>
                </div>
              )}


              {/* Initial Form: Get Mobile Number */}
              {(uiState === "initial" || uiState === "sending_otp" || uiState === "error") && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mobileNumber" className="text-sm font-medium text-foreground">
                      Enter Mobile Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="mobileNumber"
                        type="tel"
                        value={mobileNumber}
                        disabled={uiState === "sending_otp" || !canClaimReward}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+255700000000"
                        className="bg-background/30 border-border/80 focus-visible:ring-brand-teal text-foreground rounded-xl py-6"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Enter number with international format (e.g. +255...).
                    </p>
                  </div>

                  {uiState === "error" && errorMessage && (
                    <div className="bg-brand-coral/15 border border-brand-coral/20 rounded-xl p-3 flex items-start gap-2.5">
                      <AlertCircle className="h-4.5 w-4.5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive">{errorMessage}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={uiState === "sending_otp" || !canClaimReward}
                    className="w-full bg-brand-coral hover:bg-brand-coral/90 text-white font-bold py-6 rounded-xl transition-all duration-300 hover:scale-[1.01] shadow-sm"
                  >
                    {uiState === "sending_otp" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send OTP Code
                  </Button>
                </form>
              )}

              {/* OTP Sent: Verify OTP */}
              {(uiState === "otp_sent" || uiState === "verifying_otp") && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="otp" className="text-sm font-medium text-foreground">
                      Enter 6-Digit OTP Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      maxLength={6}
                      value={otp}
                      disabled={uiState === "verifying_otp"}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      className="bg-background/30 border-border/80 tracking-[0.3em] text-center font-bold text-lg focus-visible:ring-brand-teal text-foreground rounded-xl py-6"
                    />
                    <p className="text-[10px] text-muted-foreground text-center">
                      A simulated OTP code has been generated.
                    </p>
                  </div>

                  {/* Simulated OTP helper (dev or explicit demo mode only) */}
                  {demoOtp && (
                    <div className="bg-brand-teal/10 border border-brand-teal/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-foreground font-medium">
                        Simulated OTP (demo): <span className="font-mono bg-background px-2 py-0.5 rounded border border-border/50 font-bold">{demoOtp}</span>
                      </p>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="bg-brand-coral/15 border border-brand-coral/20 rounded-xl p-3 flex items-start gap-2.5">
                      <AlertCircle className="h-4.5 w-4.5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive">{errorMessage}</p>
                    </div>
                  )}

                  <div className="flex gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      disabled={uiState === "verifying_otp"}
                      className="border-border hover:bg-muted text-muted-foreground hover:text-foreground flex-1 py-6 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={uiState === "verifying_otp"}
                      className="bg-brand-coral hover:bg-brand-coral/90 text-white font-bold py-6 rounded-xl transition-all duration-300 hover:scale-[1.01] shadow-sm flex-[2]"
                    >
                      {uiState === "verifying_otp" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Claim Reward
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <Separator className="bg-border/60" />

            {/* How it Works Timeline */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase text-center">
                How to claim your reward
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-background p-3 rounded-xl border border-border/50 text-center flex flex-col items-center justify-between gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-muted border border-border/60 text-xs font-bold flex items-center justify-center text-foreground">
                    1
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium leading-tight">Scan Code</span>
                </div>
                <div className="bg-background p-3 rounded-xl border border-border/50 text-center flex flex-col items-center justify-between gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-muted border border-border/60 text-xs font-bold flex items-center justify-center text-foreground">
                    2
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium leading-tight">Verify Mobile</span>
                </div>
                <div className="bg-background p-3 rounded-xl border border-border/50 text-center flex flex-col items-center justify-between gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-muted border border-border/60 text-xs font-bold flex items-center justify-center text-foreground">
                    3
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium leading-tight">Claim Reward</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info (visible in development mode only) */}
        {debugInfo && (
          <Card className="bg-background border-dashed border-border text-muted-foreground text-[11px] font-mono rounded-xl p-3">
            <CardHeader className="p-0 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs text-destructive font-bold">
                <AlertCircle className="h-3.5 w-3.5" />
                Dev Scan Debug Info
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-1">
              <div>
                <span className="text-muted-foreground/70">Scan ID:</span> {debugInfo.scanEventId}
              </div>
              <div>
                <span className="text-muted-foreground/70">Is Repeat:</span> {debugInfo.isRepeatScan ? "Yes" : "No"}
              </div>
              <div>
                <span className="text-muted-foreground/70">IP Geolocation:</span>{" "}
                {debugInfo.location.city || "Unknown City"},{" "}
                {debugInfo.location.country || "Unknown Country"}
              </div>
              <div>
                <span className="text-muted-foreground/70">QR Code:</span> {qrCode.code}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-[10px] text-muted-foreground text-center">
          MoEngage Safe QR Platform &copy; 2026. Secure cryptographic verification.
        </p>
      </main>
    </div>
  );
}
