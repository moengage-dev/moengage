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
  blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
  purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
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
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">
            {title}
          </h1>
          {badgeText && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${BADGE_CLASSES[badgeVariant]}`}>
              {badgeText}
            </span>
          )}
        </div>
        <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-normal">
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
