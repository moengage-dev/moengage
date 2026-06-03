"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retail Operations Dashboard</h1>
          <p className="text-muted-foreground">Scan delivery codes, review recent drop-offs, and check retailer profile.</p>
        </div>
        <Badge variant="secondary" className="w-fit bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200">
          Coming soon
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deliveries Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Placed Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14,800</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Drop-offs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Scan Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34m ago</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
