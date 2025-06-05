import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface ReportMetricProps {
  icon: React.ReactNode; 
  title: string;
  value: string;
  trend?: string;
  trendDirection?: "up" | "down"; 
}

const ReportMetric = ({ icon, title, value, trend, trendDirection }: ReportMetricProps) => (
  <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg border border-gray-200">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="rounded-full bg-indigo-50 p-2">
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trendDirection === "up" ? "text-green-500" : "text-red-500"}`}>
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h4 className="mt-1 text-2xl font-bold">{value}</h4>
      </div>
    </CardContent>
  </Card>
);

export default ReportMetric;
