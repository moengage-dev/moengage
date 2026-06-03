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
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end >= start;
      }
      return true;
    },
    {
      message: "End date cannot be before start date",
      path: ["endDate"],
    }
  );

export type HeatmapFilterInput = z.infer<typeof heatmapFilterSchema>;
