"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Bot, Link2, MessageSquareWarning, ShieldAlert, Users2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import type { GuildSettings } from "@/types";

const AUTOMOD_TOGGLES: {
  key: keyof GuildSettings;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "antiSpam", label: "Anti-Spam", description: "Detects and blocks rapid repeated messages.", icon: MessageSquareWarning },
  { key: "antiRaid", label: "Anti-Raid", description: "Slows joins and flags suspicious mass-join activity.", icon: Users2 },
  { key: "antiMention", label: "Anti-Mention Spam", description: "Blocks messages with excessive @mentions.", icon: ShieldAlert },
  { key: "antiLink", label: "Anti-Link", description: "Blocks non-allowlisted links in messages.", icon: Link2 },
  { key: "antiInvite", label: "Anti-Invite", description: "Blocks Discord invite links from other servers.", icon: Link2 },
  { key: "antiScam", label: "Anti-Scam", description: "Flags known scam message patterns.", icon: ShieldAlert },
  { key: "antiPhishing", label: "Anti-Phishing", description: "Blocks known phishing domains.", icon: ShieldAlert },
  { key: "antiTokenGrabber", label: "Anti-Token Grabber", description: "Detects and removes token-grabbing payloads.", icon: Bot },
  { key: "captchaVerification", label: "CAPTCHA Verification", description: "Requires new members to verify via CAPTCHA.", icon: ShieldAlert },
];

export default function AutoModPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [settings, setSettings] = React.useState<GuildSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [savingKey, setSavingKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    apiGet<GuildSettings>(`/guilds/${guildId}/settings`, undefined, controller.signal)
      .then(setSettings)
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [guildId]);

  async function toggle(key: keyof GuildSettings, value: boolean) {
    if (!settings) return;
    setSavingKey(key);
    const prev = settings[key];
    setSettings({ ...settings, [key]: value });
    try {
      await apiPatch(`/guilds/${guildId}/settings`, { [key]: value });
      toast.success("AutoMod rule updated");
    } catch (err) {
      setSettings((s) => (s ? { ...s, [key]: prev } : s));
      toast.error(err instanceof ApiError ? err.message : "Failed to update rule");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">AutoMod rules</h2>
        <p className="text-sm text-muted-foreground">Toggle automated protection rules for this server.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {loading || !settings
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} glass>
                <CardContent className="flex items-center gap-4 p-5">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </CardContent>
              </Card>
            ))
          : AUTOMOD_TOGGLES.map(({ key, label, description, icon: Icon }) => (
              <Card key={key} glass>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    checked={Boolean(settings[key])}
                    disabled={savingKey === key}
                    onCheckedChange={(v) => toggle(key, v)}
                  />
                </CardContent>
              </Card>
            ))}
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle className="text-base">Custom rules</CardTitle>
          <CardDescription>
            Word filters, link allowlists, and per-rule punishment actions are managed per-rule via the API
            (<code className="rounded bg-muted px-1 py-0.5 text-xs">/guilds/{`{id}`}/moderation/automod-rules</code>).
            This panel currently exposes the global toggles above; a dedicated rule builder is planned.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
