// src/app/q/page.tsx
// Handles the bare /q route (no code) — redirects to the app home page.
// Does NOT affect /q/[code] which is handled by src/app/q/[code]/route.ts.
import { redirect } from "next/navigation";

export default function QRootPage() {
  redirect("/");
}
