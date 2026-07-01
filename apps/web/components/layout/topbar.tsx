"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  Sun,
  Moon,
  Bell,
  Menu,
  LogOut,
  User as UserIcon,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { RealtimeEvent, type RealtimeEnvelope } from "@nexusbot/shared";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useRealtime } from "@/hooks/use-realtime";
import { apiPost } from "@/lib/api";
import { cn, initials } from "@/lib/utils";
import type { User } from "@/types";

interface TopbarProps {
  user: User | null;
  onOpenCommandPalette: () => void;
  onOpenMobileSidebar: () => void;
}

const NOTIFY_EVENTS: RealtimeEvent[] = [
  RealtimeEvent.ModerationBan,
  RealtimeEvent.ModerationKick,
  RealtimeEvent.ModerationTimeout,
  RealtimeEvent.ModerationWarn,
  RealtimeEvent.TicketOpened,
  RealtimeEvent.MemberJoin,
  RealtimeEvent.LevelUp,
  RealtimeEvent.GiveawayEnded,
  RealtimeEvent.BoostEvent,
];

function describeEnvelope(envelope: RealtimeEnvelope): string {
  const data = envelope.data as Record<string, unknown> | undefined;
  switch (envelope.event) {
    case RealtimeEvent.ModerationBan:
      return `${(data?.targetTag as string) ?? "A member"} was banned`;
    case RealtimeEvent.ModerationKick:
      return `${(data?.targetTag as string) ?? "A member"} was kicked`;
    case RealtimeEvent.ModerationTimeout:
      return `${(data?.targetTag as string) ?? "A member"} was timed out`;
    case RealtimeEvent.ModerationWarn:
      return `${(data?.targetTag as string) ?? "A member"} received a warning`;
    case RealtimeEvent.TicketOpened:
      return `New ticket opened: ${(data?.subject as string) ?? "untitled"}`;
    case RealtimeEvent.MemberJoin:
      return `${(data?.username as string) ?? "Someone"} joined the server`;
    case RealtimeEvent.LevelUp:
      return `${(data?.username as string) ?? "A member"} leveled up to ${(data?.level as number) ?? "?"}`;
    case RealtimeEvent.GiveawayEnded:
      return `Giveaway ended: ${(data?.prize as string) ?? "prize"}`;
    case RealtimeEvent.BoostEvent:
      return `Server boost event`;
    default:
      return envelope.event;
  }
}

export function Topbar({ user, onOpenCommandPalette, onOpenMobileSidebar }: TopbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const { items } = useRealtime(NOTIFY_EVENTS, { guildId: "admin", maxEvents: 20 });

  React.useEffect(() => setMounted(true), []);

  async function handleLogout() {
    try {
      await apiPost("/auth/logout");
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="glass sticky top-0 z-40 flex h-16 items-center gap-2 border-b px-4 sm:px-6">
      <button
        onClick={onOpenMobileSidebar}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <button
        onClick={onOpenCommandPalette}
        className="flex h-10 flex-1 max-w-md items-center gap-2 rounded-lg border border-border bg-background/50 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search everywhere…</span>
        <span className="sm:hidden">Search…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {mounted && theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-[18px] w-[18px]" />
              {items.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-destructive">
                  <span className="absolute h-2 w-2 animate-ping rounded-full bg-destructive/70" />
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Live activity</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No realtime events yet. They&apos;ll appear here as they happen.
                </p>
              )}
              {items.map((item, idx) => (
                <div
                  key={`${item.timestamp}-${idx}`}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-md px-3 py-2 text-sm hover:bg-muted",
                  )}
                >
                  <span className="text-foreground">{describeEnvelope(item)}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-full border border-transparent p-0.5 transition-colors hover:border-border">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.username ?? "User"} />
                <AvatarFallback>{initials(user?.displayName ?? user?.username ?? "NB")}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="font-medium text-foreground">{user?.displayName ?? user?.username ?? "Guest"}</span>
              <span className="text-xs font-normal text-muted-foreground">{user?.email ?? "Not signed in"}</span>
            </DropdownMenuLabel>
            {user?.role && (user.role === "ADMIN" || user.role === "OWNER") && (
              <div className="px-2 pb-1">
                <Badge variant="gradient" className="gap-1">
                  <ShieldCheck className="h-3 w-3" /> {user.role}
                </Badge>
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/dashboard/settings")}>
              <UserIcon /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/dashboard/settings")}>
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
