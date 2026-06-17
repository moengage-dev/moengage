import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QR Campaigns</h1>
          <p className="text-muted-foreground">Export generated campaign QR codes and monitor scan counts.</p>
        </div>
        <Badge variant="secondary" className="w-fit">
          Coming soon
        </Badge>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Clock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold">This module is coming soon</p>
            <p className="max-w-md text-sm text-muted-foreground">
              QR codes for your assigned campaigns will appear here. Live scan metrics are available on your dashboard overview.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
