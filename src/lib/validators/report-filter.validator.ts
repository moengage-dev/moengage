// src/lib/validators/report-filter.validator.ts
import { z } from "zod";
import { ReportType } from "@prisma/client";

export const ReportFilterSchema = z.object({
  type: z.nativeEnum(ReportType),
  startDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: "Invalid start date format",
  }),
  endDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
    message: "Invalid end date format",
  }),
});

export type ReportFilterParams = z.infer<typeof ReportFilterSchema>;
