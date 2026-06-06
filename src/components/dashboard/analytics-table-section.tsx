import React from "react";

type Props = {
  title: string;
  description?: string;
  headers: string[];
  children: React.ReactNode;
  emptyMessage?: string;
  hasData?: boolean;
};

export function AnalyticsTableSection({
  title,
  description,
  headers,
  children,
  emptyMessage = "No analytics data recorded yet.",
  hasData = true,
}: Props) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 h-full flex flex-col justify-between">
      <div>
        <div className="pb-4">
          <h3 className="text-base font-bold text-foreground tracking-tight">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 leading-normal">
              {description}
            </p>
          )}
        </div>
        
        {!hasData ? (
          <div className="text-center py-10 text-xs text-muted-foreground/70 italic border border-border/40 rounded-lg">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  {headers.map((header, idx) => (
                    <th
                      key={idx}
                      className={`py-3 px-3 ${
                        header.toLowerCase().includes("scans") ||
                        header.toLowerCase().includes("claims") ||
                        header.toLowerCase().includes("declines") ||
                        header.toLowerCase().includes("cartons") ||
                        header.toLowerCase().includes("units") ||
                        header.toLowerCase().includes("status")
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-foreground">
                {children}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
