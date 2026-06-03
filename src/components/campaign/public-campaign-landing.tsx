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

type Props = {
  qrCode: {
    id: string;
    code: string;
    label: string | null;
    brandId: string | null;
    advertiserId: string | null;
    campaignId: string | null;
    productId: string | null;
    batchId: string | null;
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
  const [devOtp, setDevOtp] = useState("");
  const [uiState, setUiState] = useState<
    "initial" | "sending_otp" | "otp_sent" | "verifying_otp" | "approved" | "duplicate" | "error"
  >("initial");
  const [errorMessage, setErrorMessage] = useState("");

  const brandName = qrCode.brand?.name ?? "Mo Beverages";
  const advertiserName = qrCode.advertiser?.name ?? "Vodacom";
  const productName = qrCode.product?.name ?? null;
  const offerTitle = qrCode.campaign?.offerTitle ?? "Special Promotion Offer";
  const offerDescription =
    qrCode.campaign?.offerDescription ?? "Scan this code to view and unlock exciting brand rewards.";
  const rewardType = qrCode.campaign?.rewardType ?? "VOUCHER";
  const campaignId = qrCode.campaign?.id ?? "";

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
        if (data.status === "DUPLICATE") {
          setUiState("duplicate");
        } else {
          setErrorMessage(data.error ?? "Failed to request OTP code.");
          setUiState("error");
        }
        return;
      }

      setOtpVerificationId(data.otpVerificationId);
      if (data.devOtp) {
        setDevOtp(data.devOtp);
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
        if (data.status === "DUPLICATE") {
          setUiState("duplicate");
        } else if (data.status === "EXPIRED_OTP") {
          setErrorMessage("This OTP code has expired. Please request a new one.");
          setUiState("otp_sent");
        } else {
          setErrorMessage(data.error ?? "Verification failed.");
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
    setDevOtp("");
    setErrorMessage("");
    setUiState("initial");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative gradient glowing blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Main Card Container */}
      <main className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider text-emerald-400 uppercase">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            Exclusive Campaign
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 bg-clip-text text-transparent drop-shadow-sm mt-2">
            {brandName}
          </h1>
          <p className="text-sm text-slate-400">
            Powered by <span className="font-semibold text-slate-300">{advertiserName}</span>
          </p>
        </div>

        {/* Campaign Offer Details Card */}
        <Card className="bg-slate-900/60 border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden rounded-2xl">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-blue-500" />
          
          <CardHeader className="pb-3 text-center">
            <div className="mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold text-slate-100">
              {offerTitle}
            </CardTitle>
            <p className="text-xs text-emerald-400 font-medium mt-1">
              Reward Type: {formatStatusLabel(rewardType)}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-sm text-slate-300 leading-relaxed text-center">
              {offerDescription}
            </p>

            {productName && (
              <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-500 uppercase tracking-widest block mb-0.5">Product</span>
                <span className="text-sm font-semibold text-slate-200">{productName}</span>
              </div>
            )}

            {!scanEventId && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-200">Scan event warning</p>
                  <p className="text-xs text-amber-400">
                    Your scan was not recorded. You can still view this offer, but reward claiming is disabled. Please try scanning the code again.
                  </p>
                </div>
              </div>
            )}

            <Separator className="bg-slate-800/50" />

            {/* Claim Reward Process Flow Container */}
            <div className="space-y-4">
              {/* Approved View */}
              {uiState === "approved" && (
                <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="mx-auto w-16 h-16 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-100">Reward claimed successfully.</h3>
                    <p className="text-xs text-slate-400">
                      Your request has been approved. The reward was successfully provisioned in demo mode.
                    </p>
                  </div>
                </div>
              )}

              {/* Duplicate View */}
              {uiState === "duplicate" && (
                <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="mx-auto w-16 h-16 bg-amber-500/15 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-10 w-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-100">Duplicate Claim</h3>
                    <p className="text-xs text-slate-400">
                      This mobile number has already claimed this campaign reward.
                    </p>
                  </div>
                  <Button onClick={handleReset} variant="outline" size="sm" className="border-slate-800">
                    Try another number
                  </Button>
                </div>
              )}

              {/* Initial Form: Get Mobile Number */}
              {(uiState === "initial" || uiState === "sending_otp" || uiState === "error") && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mobileNumber" className="text-sm font-medium text-slate-300">
                      Enter Mobile Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="mobileNumber"
                        type="tel"
                        value={mobileNumber}
                        disabled={uiState === "sending_otp" || !scanEventId}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+255700000000"
                        className="bg-slate-950 border-slate-800 focus:border-emerald-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Enter number with international format (e.g. +255...).
                    </p>
                  </div>

                  {uiState === "error" && errorMessage && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5">
                      <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400">{errorMessage}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={uiState === "sending_otp" || !scanEventId}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-6 rounded-xl transition-all duration-300 hover:scale-[1.01]"
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
                    <Label htmlFor="otp" className="text-sm font-medium text-slate-300">
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
                      className="bg-slate-950 border-slate-800 tracking-[0.3em] text-center font-bold text-lg focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500 text-center">
                      A simulated OTP code has been generated.
                    </p>
                  </div>

                  {/* Dev-only simulated OTP helper */}
                  {devOtp && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                      <p className="text-xs text-blue-400 font-medium">
                        Simulated Dev OTP: <span className="font-mono bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900 font-bold">{devOtp}</span>
                      </p>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5">
                      <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400">{errorMessage}</p>
                    </div>
                  )}

                  <div className="flex gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      disabled={uiState === "verifying_otp"}
                      className="border-slate-800 hover:bg-slate-900 flex-1 py-6 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={uiState === "verifying_otp"}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-6 rounded-xl transition-all duration-300 hover:scale-[1.01] flex-[2]"
                    >
                      {uiState === "verifying_otp" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Claim Reward
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <Separator className="bg-slate-800/50" />

            {/* How it Works Timeline */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                How to claim your reward
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 text-center flex flex-col items-center justify-between gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-xs font-bold flex items-center justify-center text-slate-300">
                    1
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium leading-tight">Scan Code</span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 text-center flex flex-col items-center justify-between gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-xs font-bold flex items-center justify-center text-slate-300">
                    2
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium leading-tight">Verify Mobile</span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 text-center flex flex-col items-center justify-between gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-xs font-bold flex items-center justify-center text-slate-300">
                    3
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium leading-tight">Claim Reward</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info (visible in development mode only) */}
        {debugInfo && (
          <Card className="bg-slate-900/40 border-dashed border-slate-800 text-slate-400 text-[11px] font-mono rounded-xl p-3">
            <CardHeader className="p-0 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold">
                <AlertCircle className="h-3.5 w-3.5" />
                Dev Scan Debug Info
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-1">
              <div>
                <span className="text-slate-500">Scan ID:</span> {debugInfo.scanEventId}
              </div>
              <div>
                <span className="text-slate-500">Is Repeat:</span> {debugInfo.isRepeatScan ? "Yes" : "No"}
              </div>
              <div>
                <span className="text-slate-500">IP Geolocation:</span>{" "}
                {debugInfo.location.city || "Unknown City"},{" "}
                {debugInfo.location.country || "Unknown Country"}
              </div>
              <div>
                <span className="text-slate-500">QR Code:</span> {qrCode.code}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-[10px] text-slate-600 text-center">
          MoEngage Safe QR Platform &copy; 2026. Secure cryptographic verification.
        </p>
      </main>
    </div>
  );
}
