"use client";

import React from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

function getHumanReadableRole(role: string | null | undefined): string {
  if (!role) return "";
  switch (role.toUpperCase()) {
    case "ADMIN":
      return "Platform Admin";
    case "BRAND_ADMIN":
      return "Brand Admin";
    case "CAMPAIGN_MANAGER":
      return "Campaign Manager";
    case "ADVERTISER_VIEWER":
      return "Advertiser Viewer";
    case "RETAIL_OPERATIONS":
      return "Retail Operations";
    default:
      return role.replace(/_/g, " ");
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email
    ? user.email.slice(0, 2).toUpperCase()
    : "ME";

  const roleLabel = getHumanReadableRole(user.role);

  return (
    <TooltipProvider>
      {isCollapsed ? (
        <div className="flex flex-col items-center gap-3 py-2 w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 rounded-lg cursor-default">
                <AvatarFallback className="rounded-lg bg-primary/15 text-primary font-semibold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="right" align="center" className="flex flex-col gap-0.5">
              <p className="font-semibold text-xs">{user.name || "User"}</p>
              <p className="text-[10px] text-muted-foreground">{user.email || ""}</p>
              {roleLabel && <p className="text-[10px] uppercase font-bold text-primary">{roleLabel}</p>}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              Log out
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full p-1">
          <div className="flex items-center gap-3 w-full">
            <Avatar className="h-9 w-9 rounded-lg shrink-0">
              <AvatarFallback className="rounded-lg bg-primary/15 text-primary font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0 leading-tight">
              <span className="font-semibold text-sm text-foreground truncate" title={user.name || "User"}>
                {user.name || "User"}
              </span>
              <span className="text-xs text-muted-foreground truncate" title={user.email || ""}>
                {user.email || ""}
              </span>
              {roleLabel && (
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider mt-0.5 truncate" title={roleLabel}>
                  {roleLabel}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full justify-start h-8 px-2 text-xs border border-transparent hover:border-destructive/20 text-muted-foreground hover:text-destructive hover:bg-destructive/[0.04] transition-colors rounded-lg gap-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log out</span>
          </Button>
        </div>
      )}
    </TooltipProvider>
  );
}
