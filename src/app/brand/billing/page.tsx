import { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { getBrandBillingPageData } from "@/server/services/billing.service";
import { billingFilterSchema } from "@/lib/validators/billing.validator";
import { BillingClient } from "@/components/dashboard/billing-client";
import { Coins } from "lucide-react";

export const metadata: Metadata = {
  title: "Billing | Brand Admin",
  description: "View billing summaries for your brand's campaigns",
};

export default async function BrandBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireRole(["BRAND_ADMIN"]);

  if (!user.brandId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-card">
        <Coins className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground">No Brand Assigned</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          Your account is not currently assigned to a brand. Please contact an administrator to complete your profile assignment.
        </p>
      </div>
    );
  }

  const resolvedParams = await searchParams;

  const parseResult = billingFilterSchema.safeParse({
    startDate: typeof resolvedParams.startDate === "string" ? resolvedParams.startDate : undefined,
    endDate: typeof resolvedParams.endDate === "string" ? resolvedParams.endDate : undefined,
  });

  const filters = parseResult.success ? parseResult.data : {};
  const data = await getBrandBillingPageData(user.brandId, filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Coins className="h-8 w-8 text-primary" />
            Brand Billing Summary
          </h1>
          <p className="text-muted-foreground font-medium">
            Calculated billing metrics based on campaign engagement and delivery for your brand.
          </p>
        </div>
      </div>

      <BillingClient data={data} basePath="/brand/billing" isAdmin={false} />
    </div>
  );
}
