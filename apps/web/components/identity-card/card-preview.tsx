"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BadgeCheck, QrCode, Shield } from "lucide-react";
import { cn, discordAvatarUrl, initials } from "@/lib/utils";
import type { IdentityCardType } from "@/types";

/**
 * Per-theme gradient + accent presets matching IDENTITY_CARD_THEMES from
 * @nexusbot/shared. Purely a visual mapping — the API is the source of
 * truth for which themes a guild's premium tier can access.
 */
const THEME_STYLES: Record<string, { gradient: string; accent: string; text: string }> = {
  default: { gradient: "from-slate-700 via-slate-800 to-slate-900", accent: "text-slate-200", text: "text-white" },
  aurora: { gradient: "from-emerald-500 via-teal-500 to-cyan-600", accent: "text-emerald-100", text: "text-white" },
  midnight: { gradient: "from-indigo-950 via-blue-950 to-slate-950", accent: "text-indigo-300", text: "text-white" },
  neon: { gradient: "from-fuchsia-600 via-purple-600 to-indigo-600", accent: "text-fuchsia-200", text: "text-white" },
  gold: { gradient: "from-amber-400 via-yellow-500 to-orange-500", accent: "text-amber-950", text: "text-amber-950" },
  cyberpunk: { gradient: "from-pink-600 via-fuchsia-500 to-cyan-400", accent: "text-cyan-100", text: "text-white" },
  minimal: { gradient: "from-neutral-100 via-neutral-200 to-neutral-300", accent: "text-neutral-600", text: "text-neutral-900" },
  military: { gradient: "from-green-800 via-green-900 to-stone-900", accent: "text-green-300", text: "text-white" },
  police: { gradient: "from-blue-800 via-blue-900 to-slate-950", accent: "text-blue-200", text: "text-white" },
  corporate: { gradient: "from-slate-500 via-slate-600 to-slate-800", accent: "text-slate-100", text: "text-white" },
};

const TYPE_LABELS: Record<IdentityCardType, string> = {
  MEMBER: "Member",
  CITIZEN: "Citizen",
  EMPLOYEE: "Employee",
  STUDENT: "Student",
  VIP: "VIP",
  EVENT_PASS: "Event Pass",
  STAFF: "Staff",
  POLICE_RP: "Police",
  MILITARY_RP: "Military",
  ORGANIZATION: "Organization",
  CLAN: "Clan",
  GUILD: "Guild",
  COMPANY: "Company",
  COMMUNITY: "Community",
  CREATOR: "Creator",
  PREMIUM_MEMBER: "Premium Member",
};

export interface CardPreviewProps {
  theme?: string;
  type: IdentityCardType;
  fullName: string;
  discordUserId: string;
  avatarUrl?: string | null;
  roleLabel?: string | null;
  level?: number;
  badges?: string[];
  isVerified?: boolean;
  uniqueCode?: string;
  serverName?: string;
  className?: string;
  interactive?: boolean;
}

export function CardPreview({
  theme = "default",
  type,
  fullName,
  discordUserId,
  avatarUrl,
  roleLabel,
  level = 0,
  badges = [],
  isVerified = false,
  uniqueCode,
  serverName = "NexusBot",
  className,
  interactive = true,
}: CardPreviewProps) {
  const style = THEME_STYLES[theme] ?? THEME_STYLES.default;
  const resolvedAvatar = avatarUrl ?? discordAvatarUrl(discordUserId);

  return (
    <motion.div
      whileHover={interactive ? { rotateX: -4, rotateY: 4, scale: 1.02 } : undefined}
      style={{ transformStyle: "preserve-3d" }}
      className={cn(
        "relative aspect-[1.6/1] w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br shadow-2xl",
        style.gradient,
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-noise mix-blend-overlay" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-black/10 blur-2xl" />

      <div className="relative z-10 flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em]", style.accent)}>{serverName}</p>
            <p className={cn("text-sm font-semibold", style.text)}>{TYPE_LABELS[type]} Identity Card</p>
          </div>
          <Shield className={cn("h-6 w-6 opacity-80", style.text)} />
        </div>

        <div className="flex items-end gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-white/30 bg-black/20 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolvedAvatar} alt={fullName} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className={cn("truncate text-lg font-bold leading-tight", style.text)}>{fullName}</p>
              {isVerified && <BadgeCheck className={cn("h-4 w-4 shrink-0", style.text)} />}
            </div>
            {roleLabel && <p className={cn("truncate text-xs font-medium opacity-90", style.text)}>{roleLabel}</p>}
            <div className="mt-1 flex flex-wrap gap-1">
              <span className={cn("rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold", style.text)}>
                LV {level}
              </span>
              {badges.slice(0, 3).map((badge) => (
                <span
                  key={badge}
                  className={cn("rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold", style.text)}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/90">
            <QrCode className="h-8 w-8 text-black/70" />
          </div>
        </div>

        <div className={cn("flex items-center justify-between text-[9px] font-mono uppercase tracking-wider opacity-70", style.text)}>
          <span>ID • {discordUserId.slice(0, 6)}…{discordUserId.slice(-4)}</span>
          <span>{uniqueCode ? uniqueCode.slice(0, 10) : initials(fullName)}</span>
        </div>
      </div>
    </motion.div>
  );
}
