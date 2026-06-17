"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { parseDeliveryQrPayload } from "@/lib/delivery-qr-parser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera,
  VideoOff,
  SwitchCamera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  QrCode
} from "lucide-react";

export function DeliveryQrScanner() {
  const router = useRouter();
  
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false); // lock scanning
  
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const mountedRef = useRef(true);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setIsScanning(false);
    setIsRequestingCamera(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    readerRef.current = new BrowserMultiFormatReader();
    
    // Check available cameras if permission is already granted (some browsers expose labels)
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((videoInputDevices) => {
        if (!mountedRef.current) return;
        if (videoInputDevices.length > 0) {
          setCameras(videoInputDevices);
          const backCamera = videoInputDevices.find(
            d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId);
        }
      })
      .catch(() => {
        // Ignore, will request on start
      });

    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);



  const startCamera = async (deviceId?: string) => {
    if (!readerRef.current || !videoRef.current) return;
    
    setScanError(null);
    setScanResult(null);
    setHasScanned(false);
    setIsRequestingCamera(true);
    setPermissionDenied(false);
    
    // Stop any existing streams
    stopCamera();
    
    const targetDeviceId = deviceId || selectedCameraId || undefined;

    try {
      // Configure video constraints (prefer rear camera)
      const constraints: MediaStreamConstraints = targetDeviceId 
        ? { video: { deviceId: { exact: targetDeviceId } } }
        : { video: { facingMode: { ideal: "environment" } } };

      const controls = await readerRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, error) => {
          if (!mountedRef.current || hasScanned) return;
          
          if (result) {
            handleScanSuccess(result.getText());
          }
          if (error && error.name !== "NotFoundException" && error.name !== "ChecksumException") {
             // Ignore "No QR code found"
          }
        }
      );
      
      if (!mountedRef.current) {
        controls.stop();
        return;
      }
      
      controlsRef.current = controls;
      setIsScanning(true);
      setIsRequestingCamera(false);
      
      // Update camera list now that we have permission
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      setCameras(devices);
      if (targetDeviceId && !selectedCameraId) {
        setSelectedCameraId(targetDeviceId);
      }
      
    } catch (err: any) {
      setIsRequestingCamera(false);
      setIsScanning(false);
      console.error("Camera start error:", err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setScanError("No camera found on this device.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setScanError("Camera is already in use by another application.");
      } else {
        setScanError("Failed to start camera. Please ensure you are on a secure connection (HTTPS).");
      }
    }
  };

  const handleScanSuccess = (text: string) => {
    if (hasScanned) return;
    setHasScanned(true);
    stopCamera();
    
    const normalized = parseDeliveryQrPayload(text);
    if (normalized) {
      setScanResult("Delivery QR detected!");
      setTimeout(() => {
        if (mountedRef.current) router.push(normalized);
      }, 800);
    } else {
      setScanError("Invalid QR code. Please scan a valid delivery QR.");
      setHasScanned(false);
    }
  };

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.deviceId);
    if (isScanning) {
      startCamera(nextCamera.deviceId);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    
    const normalized = parseDeliveryQrPayload(manualCode);
    if (normalized) {
      router.push(normalized);
    } else {
      setManualError("Invalid delivery code or URL.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <Card className="overflow-hidden border-2 shadow-sm rounded-2xl">
        <CardContent className="p-0">
          <div className="bg-[#2C2621] text-white aspect-[4/3] relative flex flex-col items-center justify-center overflow-hidden">
            
            {/* Video Element */}
            <video 
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover ${(isScanning && !hasScanned) ? 'opacity-100' : 'opacity-0'}`}
              playsInline
              muted
            />

            {/* Scanning Overlay UI */}
            {isScanning && !hasScanned && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="w-full h-full border-[40px] border-black/40">
                  <div className="w-full h-full border-2 border-white/50 relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1"></div>
                  </div>
                </div>
              </div>
            )}

            {/* Success State */}
            {hasScanned && scanResult && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-emerald-900/90 text-emerald-50 gap-3 px-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                <p className="font-semibold">{scanResult}</p>
                <p className="text-xs text-emerald-200">Redirecting to delivery form...</p>
              </div>
            )}

            {/* Idle / Error / Requesting States */}
            {!isScanning && !hasScanned && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[#2C2621]">
                {isRequestingCamera ? (
                  <>
                    <Loader2 className="h-8 w-8 text-amber-400 animate-spin mb-3" />
                    <p className="text-sm font-medium">Requesting camera access...</p>
                  </>
                ) : permissionDenied ? (
                  <>
                    <VideoOff className="h-8 w-8 text-rose-400 mb-3" />
                    <p className="text-sm font-medium mb-1">Camera Permission Denied</p>
                    <p className="text-xs text-white/70 max-w-[250px]">
                      Please allow camera access in your browser settings and try again.
                    </p>
                  </>
                ) : scanError ? (
                  <>
                    <AlertCircle className="h-8 w-8 text-amber-400 mb-3" />
                    <p className="text-sm font-medium mb-1">Camera Error</p>
                    <p className="text-xs text-white/70 max-w-[250px]">{scanError}</p>
                  </>
                ) : (
                  <>
                    <QrCode className="h-10 w-10 text-white/50 mb-3" />
                    <p className="text-sm font-medium">Camera is inactive</p>
                  </>
                )}
              </div>
            )}
            
            {/* Quick action overlay inside the frame */}
            {scanError && !isScanning && !hasScanned && !permissionDenied && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30">
                <Button size="sm" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={() => startCamera()}>
                  Retry Camera
                </Button>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-white border-t space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {!isScanning ? (
                  <Button onClick={() => startCamera()} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Camera className="h-4 w-4" />
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={stopCamera} variant="outline" className="gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200">
                    <VideoOff className="h-4 w-4" />
                    Stop Camera
                  </Button>
                )}
              </div>

              {cameras.length > 1 && (
                <Button 
                  onClick={handleSwitchCamera} 
                  variant="ghost" 
                  size="icon" 
                  title="Switch Camera"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <SwitchCamera className="h-5 w-5" />
                  <span className="sr-only">Switch Camera</span>
                </Button>
              )}
            </div>

            {/* Error Message */}
            {scanError && !hasScanned && (
              <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg flex gap-2 items-start">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{scanError}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Entry Fallback */}
      <Card className="border shadow-sm rounded-2xl">
        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Manual Entry</h3>
            <p className="text-xs text-muted-foreground mt-1">
              If scanning fails, enter the delivery code or URL directly.
            </p>
          </div>
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="manual-code" className="sr-only">Delivery Code</Label>
              <Input
                id="manual-code"
                placeholder="e.g. D-12345 or /d/D-12345"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className={manualError ? "border-rose-300 focus-visible:ring-rose-400" : ""}
              />
              {manualError && (
                <p className="text-xs text-rose-600 font-medium">{manualError}</p>
              )}
            </div>
            <Button type="submit" variant="secondary" className="w-full" disabled={!manualCode.trim()}>
              Open Delivery Form
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
