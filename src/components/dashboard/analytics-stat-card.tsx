// src/components/dashboard/analytics-stat-card.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  accentColor?: "blue" | "emerald" | "purple" | "rose" | "teal" | "amber" | "indigo";
};

const ACCENT_CLASSES = {
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  teal: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
};

export function AnalyticsStatCard({
  title,
  value,
  description,
  icon,
  accentColor = "blue",
}: Props) {
  return (
    <Card className="bg-slate-900/40 border-slate-850 shadow-lg hover:border-slate-800 transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          {title}
        </CardTitle>
        {icon && (
          <div className={`p-2 rounded-lg border text-sm flex items-center justify-center ${ACCENT_CLASSES[accentColor]}`}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-1">
        <div className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
          {value}
        </div>
        {description && (
          <p className="text-[10px] text-slate-500 mt-1 font-medium leading-relaxed">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
