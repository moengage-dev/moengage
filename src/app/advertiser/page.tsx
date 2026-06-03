"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advertiser Viewer Dashboard</h1>
          <p className="text-muted-foreground">Read-only summary of campaigns, visual heatmaps, and billing statements.</p>
        </div>
        <Badge variant="secondary" className="w-fit bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200">
          Coming soon
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans Observed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">482,000</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">19,250</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accrued Budget Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$18,400</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
