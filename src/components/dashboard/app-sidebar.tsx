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
    <Sidebar className="bg-white dark:bg-[#181512] border-r border-border/50 text-sidebar-foreground animate-in fade-in duration-300">
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
        <span className="font-bold leading-none text-xl text-[#2C2621] dark:text-[#F7F5F0] tracking-tight">
          MoEngage
        </span>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
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
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative overflow-hidden
                        ${
                          isActive
                            ? "bg-[#F48F68]/10 text-[#F48F68] font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-[#F48F68] before:rounded-r"
                            : "text-[#2C2621]/80 hover:text-[#2C2621] hover:bg-[#F5EFE0]/60 font-medium dark:text-muted-foreground dark:hover:text-[#F7F5F0] dark:hover:bg-muted/40"
                        }
                      `}
                    >
                      <Link href={item.href}>
                        <item.icon className={`h-4 w-4 transition-colors ${isActive ? "text-[#F48F68]" : "text-[#2C2621]/60 group-hover/menu-button:text-[#2C2621] dark:text-muted-foreground/80 dark:group-hover/menu-button:text-[#F7F5F0]"}`} />
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

      <SidebarFooter className="p-3 border-t border-border/40 bg-transparent">
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
