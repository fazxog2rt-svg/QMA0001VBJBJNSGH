"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import type { GuildSettings } from "@/types";

const FEATURE_TOGGLES: { key: keyof GuildSettings; label: string; description: string }[] = [
  { key: "levelingEnabled", label: "Leveling system", description: "Members earn XP from chatting and voice activity." },
  { key: "economyEnabled", label: "Economy system", description: "Wallets, jobs, shops, and the currency leaderboard." },
  { key: "ticketsEnabled", label: "Ticket system", description: "Members can open support tickets." },
  { key: "musicEnabled", label: "Music commands", description: "Voice channel music playback commands." },
  { key: "aiAssistantEnabled", label: "AI assistant", description: "AI-powered chat, moderation suggestions, and ticket replies." },
];

export default function GuildSettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [settings, setSettings] = React.useState<GuildSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const { register, handleSubmit, reset, watch, setValue } = useForm<GuildSettings>();

  React.useEffect(() => {
    const controller = new AbortController();
    apiGet<GuildSettings>(`/guilds/${guildId}/settings`, undefined, controller.signal)
      .then((data) => {
        setSettings(data);
        reset(data);
      })
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [guildId, reset]);

  async function onSubmit(values: GuildSettings) {
    setSaving(true);
    try {
      const updated = await apiPatch<GuildSettings>(`/guilds/${guildId}/settings`, values);
      setSettings(updated);
      toast.success("Server settings saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card glass>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Basic server configuration</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="prefix">Command prefix</Label>
            <Input id="prefix" {...register("prefix")} maxLength={5} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="locale">Locale</Label>
            <Input id="locale" {...register("locale")} placeholder="en" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" {...register("timezone")} placeholder="UTC" />
          </div>
        </CardContent>
      </Card>

      <Card glass>
        <CardHeader>
          <CardTitle className="text-base">Welcome &amp; goodbye</CardTitle>
          <CardDescription>Messages sent when members join or leave</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="welcomeChannelId">Welcome channel ID</Label>
              <Input id="welcomeChannelId" {...register("welcomeChannelId")} placeholder="Channel ID" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goodbyeChannelId">Goodbye channel ID</Label>
              <Input id="goodbyeChannelId" {...register("goodbyeChannelId")} placeholder="Channel ID" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="welcomeMessage">Welcome message</Label>
            <Textarea id="welcomeMessage" rows={2} {...register("welcomeMessage")} placeholder="Welcome {user} to {server}!" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goodbyeMessage">Goodbye message</Label>
            <Textarea id="goodbyeMessage" rows={2} {...register("goodbyeMessage")} placeholder="{user} has left {server}." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="moderationLogChannelId">Moderation log channel ID</Label>
            <Input id="moderationLogChannelId" {...register("moderationLogChannelId")} placeholder="Channel ID" />
          </div>
        </CardContent>
      </Card>

      <Card glass>
        <CardHeader>
          <CardTitle className="text-base">Autoroles</CardTitle>
          <CardDescription>Roles automatically assigned to new members (comma-separated role IDs)</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            defaultValue={settings.autoRoleIds.join(", ")}
            onChange={(e) =>
              setValue(
                "autoRoleIds",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            placeholder="123456789012345678, 234567890123456789"
          />
        </CardContent>
      </Card>

      <Card glass>
        <CardHeader>
          <CardTitle className="text-base">Feature toggles</CardTitle>
          <CardDescription>Enable or disable major bot subsystems for this server</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          {FEATURE_TOGGLES.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch checked={Boolean(watch(key))} onCheckedChange={(v) => setValue(key, v as never)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button type="submit" variant="gradient" loading={saving}>
          <Save className="h-4 w-4" /> Save changes
        </Button>
      </div>
    </form>
  );
}
