"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FloatingCardProps {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}

export function FloatingCard({ className, delay = 0, children }: FloatingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className={cn("glass animate-float rounded-2xl p-4 shadow-2xl", className)}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </motion.div>
  );
}
