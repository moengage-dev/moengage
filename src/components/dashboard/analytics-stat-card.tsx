import React from "react";

type Props = {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  accentColor?: "blue" | "emerald" | "purple" | "rose" | "teal" | "amber" | "indigo" | "coral" | "yellow";
};

const ICON_BG_CLASSES = {
  coral: "bg-rose-100 text-rose-600",
  teal: "bg-emerald-100 text-emerald-600",
  yellow: "bg-amber-100 text-amber-600",
};

const STRIPE_CLASSES = {
  coral: "bg-primary",
  teal: "bg-brand-teal",
  yellow: "bg-brand-yellow",
};

const COLOR_MAP: Record<string, "coral" | "teal" | "yellow"> = {
  indigo: "coral",
  purple: "coral",
  rose: "coral",
  coral: "coral",

  blue: "teal",
  teal: "teal",
  emerald: "teal",

  amber: "yellow",
  yellow: "yellow",
};

export function AnalyticsStatCard({
  title,
  value,
  description,
  icon,
  accentColor = "blue",
}: Props) {
  const mappedColor = COLOR_MAP[accentColor] || "teal";
  const iconBgClass = ICON_BG_CLASSES[mappedColor];
  const stripeClass = STRIPE_CLASSES[mappedColor];

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/50 relative overflow-hidden hover:shadow-md transition-all duration-300">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${stripeClass}`} />
      <div className="p-6 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-start justify-between pb-4">
            <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              {title}
            </span>
            {icon && (
              <div className={`p-2 rounded-lg ${iconBgClass}`}>
                {icon}
              </div>
            )}
          </div>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {value}
          </div>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2 font-medium leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
