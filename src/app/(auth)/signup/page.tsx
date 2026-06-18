import { redirect } from "next/navigation";

// Signup is temporarily disabled. The implementation is preserved at:
// src/components/auth/signup-form.tsx
export default function SignupPage() {
  redirect("/login");
}
