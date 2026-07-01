"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./chart-tooltip";

export interface BarPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

interface BarUsageChartProps {
  data: BarPoint[];
  dataKey?: string;
  label?: string;
  color?: string;
  height?: number;
}

export function BarUsageChart({
  data,
  dataKey = "value",
  label = "Value",
  color = "hsl(var(--accent))",
  height = 280,
}: BarUsageChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<ChartTooltip labelKey="label" valueLabel={label} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
