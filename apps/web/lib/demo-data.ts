/**
 * DEMO / PLACEHOLDER DATA ONLY.
 *
 * Used strictly for visual scaffolding where a live API response isn't
 * available (marketing catalog content, empty-state chart shapes before
 * first fetch resolves, etc). Nothing in `app/**` should hardcode fake
 * "real" entity data directly in a component — route it through here so
 * it's obvious what's demo content vs. a real `lib/api.ts` call.
 */

import type { PremiumTier } from "@/types";

export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  installs: number;
  rating: number;
  author: string;
  premium: boolean;
  tags: string[];
}

export const templateCatalog: MarketplaceTemplate[] = [
  {
    id: "tpl-community-starter",
    name: "Community Starter",
    description: "Welcome flow, autoroles, and channel structure for a new community server.",
    category: "Server Setup",
    installs: 18234,
    rating: 4.8,
    author: "NexusBot Team",
    premium: false,
    tags: ["onboarding", "roles", "channels"],
  },
  {
    id: "tpl-gaming-clan",
    name: "Gaming Clan HQ",
    description: "Ranked roles, LFG channels, tournament brackets, and clan identity cards.",
    category: "Gaming",
    installs: 9531,
    rating: 4.7,
    author: "NexusBot Team",
    premium: true,
    tags: ["gaming", "clan", "identity-cards"],
  },
  {
    id: "tpl-rp-city",
    name: "RolePlay City",
    description: "Police/Military/Civilian RP identity card set with jail & citation moderation macros.",
    category: "Roleplay",
    installs: 6120,
    rating: 4.9,
    author: "Community",
    premium: true,
    tags: ["roleplay", "identity-cards", "moderation"],
  },
  {
    id: "tpl-support-desk",
    name: "Support Desk Pro",
    description: "Ticket categories, SLA reminders, canned responses, and CSAT surveys.",
    category: "Support",
    installs: 7890,
    rating: 4.6,
    author: "NexusBot Team",
    premium: true,
    tags: ["tickets", "support"],
  },
  {
    id: "tpl-economy-kingdom",
    name: "Economy Kingdom",
    description: "Jobs, shops, crafting, pets and a full economy leaderboard preset.",
    category: "Economy",
    installs: 5211,
    rating: 4.5,
    author: "Community",
    premium: false,
    tags: ["economy", "leveling"],
  },
  {
    id: "tpl-study-hall",
    name: "Study Hall",
    description: "Focus rooms, study streak leveling, and student identity cards.",
    category: "Education",
    installs: 3012,
    rating: 4.4,
    author: "Community",
    premium: false,
    tags: ["education", "leveling"],
  },
];

export interface PluginCatalogEntry {
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  premiumOnly: boolean;
}

export const pluginCatalog: PluginCatalogEntry[] = [
  {
    key: "auto-translate",
    name: "Auto Translate",
    description: "Detects non-default-locale messages and posts a translated reply thread.",
    category: "AI",
    icon: "Languages",
    premiumOnly: true,
  },
  {
    key: "birthday-announcer",
    name: "Birthday Announcer",
    description: "Announces member birthdays with a celebratory embed and role ping.",
    category: "Engagement",
    icon: "Cake",
    premiumOnly: false,
  },
  {
    key: "giveaway-plus",
    name: "Giveaway+",
    description: "Multi-winner giveaways with bonus entries for boosters and levels.",
    category: "Engagement",
    icon: "Gift",
    premiumOnly: false,
  },
  {
    key: "ai-moderator",
    name: "AI Moderator",
    description: "LLM-assisted context-aware moderation suggestions for edge-case reports.",
    category: "AI",
    icon: "ShieldCheck",
    premiumOnly: true,
  },
  {
    key: "voice-stats",
    name: "Voice Stats",
    description: "Tracks voice channel activity and surfaces it on the analytics dashboard.",
    category: "Analytics",
    icon: "Mic",
    premiumOnly: false,
  },
  {
    key: "reaction-roles-plus",
    name: "Reaction Roles+",
    description: "Multi-select and exclusive-group reaction role menus with emoji picker.",
    category: "Roles",
    icon: "Smile",
    premiumOnly: false,
  },
];

export interface PremiumPlan {
  tier: PremiumTier;
  name: string;
  priceMonthly: number | null;
  tagline: string;
  highlight?: boolean;
}

export const premiumPlans: PremiumPlan[] = [
  { tier: "FREE", name: "Free", priceMonthly: 0, tagline: "Get started with the essentials." },
  {
    tier: "PREMIUM",
    name: "Premium",
    priceMonthly: 4.99,
    tagline: "For growing communities that need more headroom.",
    highlight: true,
  },
  {
    tier: "PREMIUM_PLUS",
    name: "Premium+",
    priceMonthly: 9.99,
    tagline: "Advanced automation and AI for serious servers.",
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise",
    priceMonthly: 29.99,
    tagline: "Dedicated support, SLAs, and unlimited scale.",
  },
  {
    tier: "LIFETIME",
    name: "Lifetime",
    priceMonthly: null,
    tagline: "One-time payment, Enterprise limits forever.",
  },
];

export const landingFeatures = [
  {
    title: "Advanced Moderation",
    description: "AutoMod, anti-raid, anti-phishing and a full case history with audit trails.",
    icon: "ShieldCheck",
  },
  {
    title: "Economy & Leveling",
    description: "Jobs, shops, pets, XP curves, and live leaderboards your members will grind for.",
    icon: "Coins",
  },
  {
    title: "Identity Cards",
    description: "Beautiful, themeable RP identity cards — citizen, staff, clan, and more.",
    icon: "IdCard",
  },
  {
    title: "Realtime Everything",
    description: "Socket.IO powered live dashboards — activity, tickets, and stats update instantly.",
    icon: "Radio",
  },
  {
    title: "Ticketing & Support",
    description: "Threaded ticket transcripts, SLA tracking, and AI-assisted replies.",
    icon: "Ticket",
  },
  {
    title: "Enterprise Ready",
    description: "SSO-friendly auth, 2FA, API keys, audit logs, and granular staff roles.",
    icon: "Building2",
  },
];

export const landingStats = [
  { label: "Servers protected", value: 128_430 },
  { label: "Members managed", value: 41_200_000 },
  { label: "Commands executed / day", value: 3_900_000 },
  { label: "Uptime", value: 99.98, suffix: "%" },
];
