// src/components/dashboard/dashboard-section-header.tsx
import React from "react";

type Props = {
  title: string;
  description: string;
  badgeText?: string;
  badgeVariant?: "blue" | "emerald" | "amber" | "indigo" | "purple";
  actions?: React.ReactNode;
};

const BADGE_CLASSES = {
  blue: "bg-brand-teal/20 text-foreground border-brand-teal/30 dark:bg-brand-teal/10 dark:text-brand-teal",
  emerald: "bg-primary/20 text-foreground border-primary/30 dark:bg-primary/10 dark:text-primary",
  amber: "bg-brand-yellow/30 text-foreground border-brand-yellow/40 dark:bg-brand-yellow/10 dark:text-brand-yellow",
  indigo: "bg-primary/20 text-foreground border-primary/30 dark:bg-primary/10 dark:text-primary",
  purple: "bg-brand-teal/20 text-foreground border-brand-teal/30 dark:bg-brand-teal/10 dark:text-brand-teal",
};

export function DashboardSectionHeader({
  title,
  description,
  badgeText,
  badgeVariant = "blue",
  actions,
}: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-2">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
          {badgeText && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${BADGE_CLASSES[badgeVariant]}`}>
              {badgeText}
            </span>
          )}
        </div>
        <p className="text-xs md:text-sm text-muted-foreground max-w-2xl leading-normal">
          {description}
        </p>
      </div>
      {actions && (
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
