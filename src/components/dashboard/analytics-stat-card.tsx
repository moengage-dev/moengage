import React from "react";

type Props = {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  accentColor?: "blue" | "emerald" | "purple" | "rose" | "teal" | "amber" | "indigo" | "coral" | "yellow";
};

const DOT_CLASSES = {
  coral: "bg-brand-coral shadow-[0_0_10px_var(--brand-coral)]",
  teal: "bg-brand-teal shadow-[0_0_10px_var(--brand-teal)]",
  yellow: "bg-brand-yellow shadow-[0_0_10px_var(--brand-yellow)]",
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
  
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300">
      <div>
        <div className="flex items-center justify-between pb-2.5">
          <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            {title}
          </span>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${DOT_CLASSES[mappedColor]}`} />
            {icon && (
              <span className="text-muted-foreground/60">
                {icon}
              </span>
            )}
          </div>
        </div>
        <div className="text-3xl font-extrabold text-foreground tracking-tight">
          {value}
        </div>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground/85 mt-2 font-medium leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
