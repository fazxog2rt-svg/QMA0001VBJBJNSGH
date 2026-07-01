import Link from "next/link";
import { Bot } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-mesh" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)]" />

      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/30">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold">
            Nexus<span className="gradient-text">Bot</span>
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
