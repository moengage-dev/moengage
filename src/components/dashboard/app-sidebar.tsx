"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { getNavGroupsForRole } from "./nav-items";
import { UserMenu } from "./user-menu";
import { OverflowScrollText } from "./overflow-scroll-text";

interface AppSidebarProps {
  role: string;
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

// Routes where exact pathname match is required for the active state.
const HOME_ROUTES = new Set(["/admin", "/brand", "/campaign-manager", "/advertiser", "/retail"]);

export function AppSidebar({ role, user }: AppSidebarProps) {
  const pathname = usePathname();
  const navGroups = getNavGroupsForRole(role);
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar className="bg-sidebar border-r border-border/50 text-sidebar-foreground animate-in fade-in duration-300">
      <SidebarHeader className="flex flex-row items-center py-4 border-b border-border/40 bg-transparent gap-3">
        <div className="relative w-8 h-8 flex items-center justify-center">
          <Image
            src="/images/moEngageLogo.png"
            alt="MoEngage Logo"
            width={32}
            height={32}
            className="object-contain"
            priority
          />
        </div>
        <span className="font-bold leading-none text-xl text-sidebar-foreground tracking-tight">
          MoEngage
        </span>
      </SidebarHeader>

      {/* SidebarContent scrolls independently; footer stays pinned below */}
      <SidebarContent className="px-3 py-3">
        {navGroups.map((group, groupIndex) => (
          <SidebarGroup key={group.label} className={`p-0 ${groupIndex > 0 ? "mt-3" : ""}`}>
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest px-2 mb-1 text-sidebar-foreground/40">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const isActive = HOME_ROUTES.has(item.href)
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative overflow-hidden
                          ${
                            isActive
                              ? "bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-primary before:rounded-r"
                              : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-muted/60 font-medium dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-muted/40"
                          }
                        `}
                      >
                        <Link
                          href={item.href}
                          onClick={() => {
                            if (isMobile) setOpenMobile(false);
                          }}
                        >
                          <item.icon
                            className={`h-4 w-4 transition-colors ${
                              isActive
                                ? "text-primary"
                                : "text-sidebar-foreground/60 group-hover/menu-button:text-sidebar-foreground dark:text-muted-foreground/80 dark:group-hover/menu-button:text-foreground"
                            }`}
                          />
                          <OverflowScrollText className="flex-1 min-w-0">
                            {item.title}
                          </OverflowScrollText>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/40 bg-transparent">
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
