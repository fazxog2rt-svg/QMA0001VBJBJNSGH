"use client";

import * as React from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { Puzzle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { pluginCatalog } from "@/lib/demo-data";
import { apiPatch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function PluginCenterPage() {
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>({});
  const [saving, setSaving] = React.useState<string | null>(null);

  async function toggle(key: string, value: boolean) {
    setSaving(key);
    const prev = enabled[key];
    setEnabled((e) => ({ ...e, [key]: value }));
    try {
      await apiPatch(`/premium/plugins/${key}`, { enabled: value });
      toast.success(value ? "Plugin enabled" : "Plugin disabled");
    } catch (err) {
      setEnabled((e) => ({ ...e, [key]: prev }));
      toast.error(err instanceof ApiError ? err.message : "Plugin toggle endpoint not available yet");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Puzzle className="h-6 w-6" /> Plugin Center
        </h1>
        <p className="text-sm text-muted-foreground">Extend NexusBot with optional feature plugins.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {pluginCatalog.map((plugin, idx) => {
          const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[plugin.icon] ?? Puzzle;
          const isOn = enabled[plugin.key] ?? false;
          return (
            <motion.div
              key={plugin.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card glass className={cn("h-full transition-shadow", isOn && "shadow-lg shadow-primary/10")}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-md">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Switch checked={isOn} disabled={saving === plugin.key} onCheckedChange={(v) => toggle(plugin.key, v)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{plugin.name}</h3>
                      {plugin.premiumOnly && (
                        <Badge variant="gradient" className="text-[10px]">
                          Premium
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{plugin.description}</p>
                  </div>
                  <Badge variant="outline" className="w-fit text-[10px]">
                    {plugin.category}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
