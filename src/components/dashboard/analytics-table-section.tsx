// src/components/dashboard/analytics-table-section.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
    <Card className="bg-slate-900/40 border-slate-850 shadow-md h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm md:text-base font-bold text-slate-200">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs text-slate-400 leading-normal">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-10 text-xs text-slate-500 italic">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/20">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                  {headers.map((header, idx) => (
                    <th
                      key={idx}
                      className={`py-3 px-3.5 ${
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
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {children}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
