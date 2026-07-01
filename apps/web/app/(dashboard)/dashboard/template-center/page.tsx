"use client";

import * as React from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LayoutTemplate, Search, Star, Wand2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { templateCatalog } from "@/lib/demo-data";
import { apiPost, ApiError } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export default function TemplateCenterPage() {
  const [query, setQuery] = React.useState("");
  const [applying, setApplying] = React.useState<string | null>(null);

  const filtered = templateCatalog.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));

  async function apply(id: string, name: string) {
    setApplying(id);
    try {
      await apiPost(`/premium/templates/${id}/apply`);
      toast.success(`${name} template queued for setup`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Template apply endpoint not available yet");
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <LayoutTemplate className="h-6 w-6" /> Template Center
        </h1>
        <p className="text-sm text-muted-foreground">One-click server templates: channels, roles, and identity cards.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search templates…" className="pl-9" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item, idx) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
            <Card glass className="flex h-full flex-col overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-primary/40 via-accent/30 to-transparent" />
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline">{item.category}</Badge>
                  {item.premium && <Badge variant="gradient">Premium</Badge>}
                </div>
                <h3 className="mt-3 font-semibold">{item.name}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{item.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {item.rating}
                  </span>
                  <span>{formatNumber(item.installs)} uses</span>
                </div>
                <Button
                  className="mt-4 w-full"
                  variant="gradient"
                  loading={applying === item.id}
                  onClick={() => apply(item.id, item.name)}
                >
                  <Wand2 className="h-4 w-4" /> Apply to server
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
