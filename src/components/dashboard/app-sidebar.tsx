"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "@/components/ui/sidebar";
import { getNavItemsForRole } from "./nav-items";
import { UserMenu } from "./user-menu";

interface AppSidebarProps {
  role: string;
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export function AppSidebar({ role, user }: AppSidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItemsForRole(role);

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="h-16 px-6 border-b border-sidebar-border flex items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-lg shadow-sm shadow-emerald-600/20">
            ME
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-none text-base">MoEngage</span>
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
              FMCG Platform
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isHomeRoute =
                  item.href === "/admin" ||
                  item.href === "/brand" ||
                  item.href === "/campaign-manager" ||
                  item.href === "/advertiser" ||
                  item.href === "/retail";

                const isActive = isHomeRoute
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }
                      `}
                    >
                      <Link href={item.href}>
                        <item.icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : ""}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border bg-sidebar">
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
