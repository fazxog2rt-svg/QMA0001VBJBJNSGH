import { Crown, Gem, Rocket, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PremiumTier } from "@/types";

const TIER_CONFIG: Record<PremiumTier, { label: string; variant: "secondary" | "default" | "gradient"; icon: React.ComponentType<{ className?: string }> | null }> = {
  FREE: { label: "Free", variant: "secondary", icon: null },
  PREMIUM: { label: "Premium", variant: "default", icon: Sparkles },
  PREMIUM_PLUS: { label: "Premium+", variant: "gradient", icon: Gem },
  ENTERPRISE: { label: "Enterprise", variant: "gradient", icon: Rocket },
  LIFETIME: { label: "Lifetime", variant: "gradient", icon: Crown },
};

export function PremiumBadge({ tier, className }: { tier: PremiumTier; className?: string }) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className={className}>
      {Icon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
