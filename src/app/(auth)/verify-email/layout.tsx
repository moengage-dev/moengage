import type { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Verify Email",
};

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="public-page-bg flex items-center justify-center px-4">
          <div className="public-card relative z-10 px-8 py-7 text-sm font-medium text-muted-foreground">
            Loading verification screen...
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
