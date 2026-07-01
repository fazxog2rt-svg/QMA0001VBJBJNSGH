"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";

const ADMIN_TABS = [
  { value: "users", label: "Users" },
  { value: "guilds", label: "Guilds" },
  { value: "premium", label: "Premium" },
  { value: "announcements", label: "Announcements" },
  { value: "logs", label: "Logs" },
  { value: "feature-flags", label: "Feature Flags" },
  { value: "maintenance-mode", label: "Maintenance" },
  { value: "stats", label: "Platform Stats" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useCurrentUser();
  const activeTab = ADMIN_TABS.find((t) => pathname.includes(`/${t.value}`))?.value ?? "stats";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN" || user?.role === "OWNER";

  if (!isAdmin) {
    return (
      <Card glass>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <ShieldAlert className="h-8 w-8 text-destructive" />
          <p className="font-medium">Access restricted</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            You need ADMIN or OWNER platform privileges to view this section.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ShieldAlert className="h-6 w-6" /> Admin panel
        </h1>
        <p className="text-sm text-muted-foreground">Platform-wide administration and moderation tools.</p>
      </div>

      <Tabs value={activeTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {ADMIN_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} asChild>
              <Link href={`/admin/${tab.value}`}>{tab.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {children}
    </div>
  );
}
