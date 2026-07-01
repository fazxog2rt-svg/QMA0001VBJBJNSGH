"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
  ChevronsLeft,
  ChevronsRight,
  Bot,
  TerminalSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { PlatformRole } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const mainNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Servers", href: "/dashboard/servers", icon: Server },
  { label: "Bot Console", href: "/dashboard/bot-console", icon: TerminalSquare },
];

// These tools are per-server (routes live under /dashboard/servers/[guildId]/...),
// so the sidebar links to the server picker — pick a server to reach them,
// same as clicking a server card and using its own tab navigation.
const guildToolsNav: NavItem[] = [
  { label: "Moderation", href: "/dashboard/servers", icon: ShieldAlert },
  { label: "Economy", href: "/dashboard/servers", icon: Coins },
  { label: "Leveling", href: "/dashboard/servers", icon: TrendingUp },
  { label: "Tickets", href: "/dashboard/servers", icon: Ticket },
  { label: "Analytics", href: "/dashboard/servers", icon: BarChart3 },
  { label: "Identity Cards", href: "/dashboard/servers", icon: IdCard },
];

const growthNav: NavItem[] = [
  { label: "Premium", href: "/dashboard/premium", icon: Sparkles },
  { label: "Marketplace", href: "/dashboard/marketplace", icon: Store },
  { label: "Template Center", href: "/dashboard/template-center", icon: LayoutTemplate },
  { label: "Plugin Center", href: "/dashboard/plugin-center", icon: Puzzle },
];

const accountNav: NavItem[] = [{ label: "Settings", href: "/dashboard/settings", icon: Settings }];

const adminNav: NavItem[] = [{ label: "Admin Panel", href: "/admin", icon: ShieldCheck }];

function NavLink({
  item,
  collapsed,
  active,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-lg bg-primary/10"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Icon className="relative z-10 h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <Badge variant="gradient" className="relative z-10 ml-auto px-1.5 py-0 text-[10px]">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
}

function NavSection({
  title,
  items,
  collapsed,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          collapsed={collapsed}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

interface SidebarProps {
  role?: PlatformRole | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ role, collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN" || role === "OWNER";

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/30">
          <Bot className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">
            Nexus<span className="gradient-text">Bot</span>
          </span>
        )}
        <button
          onClick={onCloseMobile}
          className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Separator />

      <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-3 no-scrollbar">
        <NavSection title="Overview" items={mainNav} collapsed={collapsed} pathname={pathname} onNavigate={onCloseMobile} />
        <NavSection title="Guild Tools" items={guildToolsNav} collapsed={collapsed} pathname={pathname} onNavigate={onCloseMobile} />
        <NavSection title="Growth" items={growthNav} collapsed={collapsed} pathname={pathname} onNavigate={onCloseMobile} />
        <NavSection title="Account" items={accountNav} collapsed={collapsed} pathname={pathname} onNavigate={onCloseMobile} />
        {isAdmin && (
          <NavSection title="Platform" items={adminNav} collapsed={collapsed} pathname={pathname} onNavigate={onCloseMobile} />
        )}
      </nav>

      <Separator />

      <button
        onClick={onToggleCollapsed}
        className="hidden items-center justify-center gap-2 px-4 py-3 text-xs font-medium text-muted-foreground hover:bg-muted lg:flex"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        {!collapsed && "Collapse"}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop / tablet sidebar */}
      <aside
        className={cn(
          "glass sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCloseMobile} />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="glass-strong relative z-10 h-full w-72 border-r"
          >
            {content}
          </motion.aside>
        </div>
      )}
    </>
  );
}
