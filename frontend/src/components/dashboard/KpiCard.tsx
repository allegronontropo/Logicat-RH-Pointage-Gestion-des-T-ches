import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

export interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconBgColor?: string;
  iconTextColor?: string;
  trendText?: string;
  subtitle?: string;
  to?: string;
  onClick?: () => void;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  iconBgColor = "bg-blue-50",
  iconTextColor = "text-blue-600",
  trendText,
  subtitle,
  to,
  onClick,
}: KpiCardProps) {
  const isClickable = Boolean(to || onClick);

  const content = (
    <Card
      onClick={onClick}
      className={`border border-slate-200/90 bg-white shadow-sm transition-all duration-200 ${
        isClickable
          ? "cursor-pointer hover:shadow-md hover:border-primary/50 group-hover:border-primary/50 hover:-translate-y-0.5 active:translate-y-0"
          : "hover:shadow-md hover:border-slate-300"
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          {/* Soft pastel icon */}
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBgColor} ${iconTextColor} transition-transform duration-200 ${
              isClickable ? "group-hover:scale-110" : ""
            }`}
          >
            <Icon className="h-5 w-5 stroke-[2.2]" />
          </div>

          {/* Subtle neutral indicator without fake percentage */}
          {trendText && (
            <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-slate-100/80 text-slate-500 border border-slate-200/60">
              <Minus className="h-2.5 w-2.5 text-slate-400" />
              <span className="font-mono">{trendText}</span>
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

  if (to) {
    return (
      <Link to={to} className="block group no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
