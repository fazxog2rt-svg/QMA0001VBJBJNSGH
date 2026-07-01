import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Coins,
  IdCard,
  Radio,
  Ticket,
  Building2,
  Github,
  Bot,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedCounter } from "@/components/landing/animated-counter";
import { FloatingCard } from "@/components/landing/floating-card";
import { landingFeatures, landingStats } from "@/lib/demo-data";
import { env } from "@/lib/env";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck,
  Coins,
  IdCard,
  Radio,
  Ticket,
  Building2,
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-mesh" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_0%,transparent_65%)]" />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-transparent">
        <div className="glass mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl px-5 py-3 shadow-lg">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Bot className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-base font-bold">
              Nexus<span className="gradient-text">Bot</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#stats" className="hover:text-foreground">Stats</a>
            <Link href="/dashboard/premium" className="hover:text-foreground">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="gradient" size="sm">
              <Link href="/dashboard">
                Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-20 text-center sm:pt-28">
        <Badge variant="glass" className="mb-6 gap-1.5 px-3 py-1">
          <Sparkles className="h-3 w-3 text-accent" /> Now with realtime everything
        </Badge>
        <h1 className="max-w-3xl text-4xl font-black leading-[1.1] tracking-tight sm:text-6xl">
          The <span className="gradient-text">enterprise-grade</span> Discord bot for serious communities
        </h1>
        <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
          Moderation, economy, leveling, tickets, and gorgeous identity cards — all in one
          premium dashboard with live updates powered by Socket.IO.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="gradient">
            <a href={env.discordInviteUrl} target="_blank" rel="noreferrer">
              <Bot className="h-4 w-4" /> Add to Discord
            </a>
          </Button>
          <Button asChild size="lg" variant="glass">
            <Link href="/dashboard">
              Open Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Floating glass cards */}
        <div className="relative mt-20 hidden h-72 w-full max-w-4xl md:block">
          <FloatingCard className="absolute left-0 top-6 w-56" delay={0}>
            <p className="text-xs text-muted-foreground">Server Status</p>
            <p className="mt-1 flex items-center gap-1.5 text-lg font-bold text-success">
              <span className="h-2 w-2 animate-pulse-glow rounded-full bg-success" /> Online
            </p>
            <p className="mt-1 text-xs text-muted-foreground">42ms ping · 99.98% uptime</p>
          </FloatingCard>
          <FloatingCard className="absolute right-0 top-0 w-60" delay={0.15}>
            <p className="text-xs text-muted-foreground">Identity Card</p>
            <div className="mt-2 h-20 rounded-lg bg-gradient-to-br from-primary to-accent" />
            <p className="mt-2 text-sm font-semibold">VIP Member</p>
          </FloatingCard>
          <FloatingCard className="absolute bottom-0 left-1/4 w-64" delay={0.3}>
            <p className="text-xs text-muted-foreground">Live Activity</p>
            <p className="mt-1 text-sm">🎉 @nova leveled up to 42</p>
            <p className="mt-1 text-sm">🛡️ Case #1082 — timeout issued</p>
          </FloatingCard>
          <FloatingCard className="absolute bottom-8 right-10 w-52" delay={0.45}>
            <p className="text-xs text-muted-foreground">Members</p>
            <p className="mt-1 text-2xl font-black gradient-text">128,430</p>
          </FloatingCard>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="glass grid grid-cols-2 gap-6 rounded-2xl p-8 shadow-xl sm:grid-cols-4">
          {landingStats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="gradient-text text-3xl font-black sm:text-4xl">
                <AnimatedCounter value={stat.value} suffix={stat.suffix ?? ""} decimals={stat.suffix === "%" ? 2 : 0} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Everything your server needs</h2>
          <p className="mt-3 text-muted-foreground">
            A complete toolkit, wired together with realtime updates and a premium admin experience.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {landingFeatures.map((feature) => {
            const Icon = ICONS[feature.icon] ?? ShieldCheck;
            return (
              <div
                key={feature.title}
                className="glass group rounded-2xl p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/30 transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-10 text-center shadow-2xl sm:p-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-70" />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to level up your server?</h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              Invite NexusBot in seconds — no credit card required to get started on the Free tier.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="gradient">
                <a href={env.discordInviteUrl} target="_blank" rel="noreferrer">
                  <Bot className="h-4 w-4" /> Add to Discord — it&apos;s free
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/register">Create an account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} NexusBot. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground">
              <Github className="h-4 w-4" />
            </a>
            <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
