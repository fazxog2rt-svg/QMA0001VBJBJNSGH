"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCompactNumber } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: number;
  suffix?: string;
  loading?: boolean;
  accent?: "primary" | "success" | "warning" | "destructive" | "accent";
}

const ACCENT_MAP: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "from-primary/20 to-primary/5 text-primary",
  accent: "from-accent/20 to-accent/5 text-accent",
  success: "from-success/20 to-success/5 text-success",
  warning: "from-warning/20 to-warning/5 text-warning",
  destructive: "from-destructive/20 to-destructive/5 text-destructive",
};

export function StatCard({ label, value, icon: Icon, trend, suffix = "", loading, accent = "primary" }: StatCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card glass className="overflow-hidden">
        <CardContent className="flex items-center gap-4 p-5">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br", ACCENT_MAP[accent])}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
            {loading ? (
              <div className="mt-1.5 h-6 w-20 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-xl font-bold tabular-nums">
                {typeof value === "number" ? formatCompactNumber(value) : value}
                {suffix}
              </p>
            )}
          </div>
          {typeof trend === "number" && (
            <span className={cn("shrink-0 text-xs font-semibold", trend >= 0 ? "text-success" : "text-destructive")}>
              {trend >= 0 ? "+" : ""}
              {trend}%
            </span>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
