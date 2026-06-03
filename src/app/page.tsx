import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

function getDefaultDashboard(role?: string) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "BRAND_ADMIN":
      return "/brand";
    case "CAMPAIGN_MANAGER":
      return "/campaign-manager";
    case "ADVERTISER_VIEWER":
      return "/advertiser";
    case "RETAIL_OPERATIONS":
      return "/retail";
    default:
      return "/login";
  }
}

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role) {
    redirect(getDefaultDashboard(session.user.role));
  }

  redirect("/login");
}
