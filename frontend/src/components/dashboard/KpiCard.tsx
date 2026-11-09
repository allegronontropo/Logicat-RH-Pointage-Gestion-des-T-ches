import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconBgColor?: string;
  iconTextColor?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
    label?: string;
  };
  subtitle?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  iconBgColor = "bg-blue-50",
  iconTextColor = "text-blue-600",
  trend,
  subtitle,
}: KpiCardProps) {
  return (
    <Card className="border border-slate-200/90 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          {/* Soft pastel icon */}
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBgColor} ${iconTextColor} transition-transform duration-200 group-hover:scale-105`}
          >
            <Icon className="h-5 w-5 stroke-[2.2]" />
          </div>

          {/* Trend Indicator on top right */}
          {trend && (
            <div
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                trend.isNeutral
                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                  : trend.isPositive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-rose-50 text-rose-700 border border-rose-200/60"
              }`}
            >
              {trend.isNeutral ? (
                <Minus className="h-3 w-3 stroke-[2.5]" />
              ) : trend.isPositive ? (
                <TrendingUp className="h-3 w-3 stroke-[2.5]" />
              ) : (
                <TrendingDown className="h-3 w-3 stroke-[2.5]" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>

        {/* Numbers & Labels */}
        <div className="mt-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="flex items-baseline justify-between">
            <h4 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
              {value}
            </h4>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 font-medium pt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
