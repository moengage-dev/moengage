// src/lib/validators/heatmap-filter.validator.ts
import { z } from "zod";

const emptyStringToUndefined = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.string().optional()
);

export const heatmapFilterSchema = z
  .object({
    brandId: emptyStringToUndefined,
    advertiserId: emptyStringToUndefined,
    campaignId: emptyStringToUndefined,
    productId: emptyStringToUndefined,
    batchId: emptyStringToUndefined,
    startDate: emptyStringToUndefined,
    endDate: emptyStringToUndefined,
  })
  .refine(
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

export type HeatmapFilterInput = z.infer<typeof heatmapFilterSchema>;
