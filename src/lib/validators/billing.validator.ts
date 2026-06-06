import { z } from "zod";

const emptyStringToUndefined = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().optional()
);

export const billingFilterSchema = z
  .object({
    brandId: emptyStringToUndefined,
    advertiserId: emptyStringToUndefined,
    campaignId: emptyStringToUndefined,
    startDate: emptyStringToUndefined,
    endDate: emptyStringToUndefined,
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date cannot be before start date",
      path: ["endDate"],
    }
  );

export type BillingFilterValues = z.infer<typeof billingFilterSchema>;
export type BillingFilterParams = BillingFilterValues;
