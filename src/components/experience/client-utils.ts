export async function fetchJson<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  return response.json();
}

export function getErrorMessage(error: any, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

export async function deleteUploadedAsset(url: string) {
  // stub
}

export function getFriendlyErrorMessage(errorOrStatus: string | undefined): string {
  if (!errorOrStatus) {
    return "Something went wrong. Please try again.";
  }

  const code = errorOrStatus.toUpperCase();

  if (code === "RATE_LIMIT_EXCEEDED") {
    return "Too many attempts. Please wait a minute and try again.";
  }

  if (code === "VERIFICATION_FAILED") {
    return "Verification failed. Please try again.";
  }

  if (code === "DUPLICATE_CLAIM") {
    return "This mobile number is not eligible for another claim on this campaign.";
  }

  if (
    code === "OTP_COOLDOWN" ||
    code === "COOLDOWN_ACTIVE" ||
    code.includes("COOLDOWN")
  ) {
    return "Please wait before requesting another OTP.";
  }

  return "Something went wrong. Please try again.";
}
