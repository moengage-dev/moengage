// src/lib/validators/report-filter.validator.ts
import { z } from "zod";
import { ReportType } from "@prisma/client";

export const ReportFilterSchema = z.object({
  type: z.union([z.nativeEnum(ReportType), z.literal("SUSPICIOUS_SCANS_CSV")]),
  startDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: "Invalid start date format",
  }),
  endDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: "Invalid end date format",
  }),
}).refine(
  (data) => {
    if ((data.startDate && !data.endDate) || (!data.startDate && data.endDate)) {
      return false;
    }
    if (data.startDate && data.endDate) {
      if (isNaN(Date.parse(data.startDate)) || isNaN(Date.parse(data.endDate))) {
        return false;
      }
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) return false;
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 366;
    }
    return true;
  },
  {
    message: "Both start date and end date must be provided if one is supplied, end date cannot be before start date, and selected date range cannot exceed 366 days",
    path: ["endDate"],
  }
);

export type ReportFilterParams = z.infer<typeof ReportFilterSchema>;
