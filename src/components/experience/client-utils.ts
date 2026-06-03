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
