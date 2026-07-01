"use client";

import type { TooltipProps } from "recharts";
import { formatNumber } from "@/lib/utils";

interface ChartTooltipProps extends TooltipProps<number, string> {
  labelKey?: string;
  valueLabel?: string;
}

export function ChartTooltip({ active, payload, label, valueLabel }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name ?? valueLabel}:</span>
          <span className="font-semibold text-foreground">
            {typeof entry.value === "number" ? formatNumber(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
