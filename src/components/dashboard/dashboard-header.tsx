"use client";

import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";

export function DashboardHeader() {
  const pathname = usePathname();

  // Generate dynamic breadcrumb segments
  const segments = pathname.split("/").filter(Boolean);
  
  const pageTitle = segments.length > 0
    ? segments[segments.length - 1]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Dashboard";

  const rootSection = segments[0]
    ? segments[0]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          {rootSection && (
            <span className="text-sm font-medium text-muted-foreground">
              {rootSection}
            </span>
          )}
          {segments.length > 1 && (
            <>
              <span className="text-muted-foreground/50 text-xs">/</span>
              <span className="text-sm font-semibold text-foreground">
                {pageTitle}
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
