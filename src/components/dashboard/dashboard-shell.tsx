"use client";

import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { Toaster } from "@/components/ui/sonner";

interface DashboardShellProps {
  role: string;
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  children: React.ReactNode;
}

export function DashboardShell({ role, user, children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground animate-in fade-in duration-300">
        <AppSidebar role={role} user={user} />
        <SidebarInset className="flex flex-col flex-1 h-screen overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto bg-background p-6 md:p-8">
            {children}
          </main>
          <Toaster richColors />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
