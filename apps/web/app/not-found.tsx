import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh" />
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)]" />
      <div className="glass relative z-10 flex max-w-md flex-col items-center gap-4 rounded-2xl p-10 shadow-2xl animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
          <Compass className="h-8 w-8 text-white" />
        </div>
        <h1 className="gradient-text text-5xl font-black">404</h1>
        <p className="text-lg font-semibold">Lost in the void</p>
        <p className="text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or was moved. Let&apos;s get you back on track.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="gradient">
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
