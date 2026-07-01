"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Home,
  Server,
  ShieldAlert,
  Coins,
  TrendingUp,
  Ticket,
  BarChart3,
  IdCard,
  Sparkles,
  Store,
  LayoutTemplate,
  Puzzle,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  Search,
  ArrowRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaletteAction {
  id: string;
  label: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  perform: () => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const go = React.useCallback(
    (href: string) => {
      router.push(href);
      onOpenChange(false);
    },
    [router, onOpenChange],
  );

  const actions: PaletteAction[] = [
    { id: "home", label: "Home", group: "Navigate", icon: Home, perform: () => go("/dashboard") },
    { id: "servers", label: "Servers", group: "Navigate", icon: Server, perform: () => go("/dashboard/servers") },
    { id: "moderation", label: "Moderation", group: "Navigate", icon: ShieldAlert, perform: () => go("/dashboard/moderation") },
    { id: "economy", label: "Economy", group: "Navigate", icon: Coins, perform: () => go("/dashboard/economy") },
    { id: "leveling", label: "Leveling", group: "Navigate", icon: TrendingUp, perform: () => go("/dashboard/leveling") },
    { id: "tickets", label: "Tickets", group: "Navigate", icon: Ticket, perform: () => go("/dashboard/tickets") },
    { id: "analytics", label: "Analytics", group: "Navigate", icon: BarChart3, perform: () => go("/dashboard/analytics") },
    { id: "identity-cards", label: "Identity Cards", group: "Navigate", icon: IdCard, perform: () => go("/dashboard/identity-cards") },
    { id: "premium", label: "Premium", group: "Navigate", icon: Sparkles, perform: () => go("/dashboard/premium") },
    { id: "marketplace", label: "Marketplace", group: "Navigate", icon: Store, perform: () => go("/dashboard/marketplace") },
    { id: "template-center", label: "Template Center", group: "Navigate", icon: LayoutTemplate, perform: () => go("/dashboard/template-center") },
    { id: "plugin-center", label: "Plugin Center", group: "Navigate", icon: Puzzle, perform: () => go("/dashboard/plugin-center") },
    { id: "settings", label: "Settings", group: "Navigate", icon: Settings, perform: () => go("/dashboard/settings") },
    { id: "admin", label: "Admin Panel", group: "Navigate", icon: ShieldCheck, perform: () => go("/admin") },
    {
      id: "theme-light",
      label: "Switch to light theme",
      group: "Theme",
      icon: Sun,
      perform: () => {
        setTheme("light");
        onOpenChange(false);
      },
    },
    {
      id: "theme-dark",
      label: "Switch to dark theme",
      group: "Theme",
      icon: Moon,
      perform: () => {
        setTheme("dark");
        onOpenChange(false);
      },
    },
  ];

  const groups = Array.from(new Set(actions.map((a) => a.group)));

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Search everywhere"
      className="fixed left-1/2 top-24 z-[100] w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl"
      shouldFilter
    >
      <div className="glass-strong overflow-hidden rounded-xl shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border/60 px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Command.Input
            placeholder="Search pages, servers, commands…"
            className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>
          {groups.map((group) => (
            <Command.Group
              key={group}
              heading={group}
              className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 [&_[cmdk-group-items]]:mt-1"
            >
              {actions
                .filter((a) => a.group === group)
                .map((action) => (
                  <Command.Item
                    key={action.id}
                    onSelect={action.perform}
                    className={cn(
                      "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground",
                      "aria-selected:bg-primary/15 aria-selected:text-primary",
                    )}
                  >
                    <action.icon className="h-4 w-4" />
                    <span className="flex-1">{action.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-aria-selected:opacity-60" />
                  </Command.Item>
                ))}
            </Command.Group>
          ))}
        </Command.List>
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
          <span>NexusBot Command Palette</span>
          <span>Theme: {theme ?? "system"}</span>
        </div>
      </div>
    </Command.Dialog>
  );
}
