"use client";

import * as React from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Download, Search, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { templateCatalog } from "@/lib/demo-data";
import { apiPost, ApiError } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

export default function MarketplacePage() {
  const [query, setQuery] = React.useState("");
  const [installing, setInstalling] = React.useState<string | null>(null);

  const filtered = templateCatalog.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase())),
  );

  async function install(id: string, name: string) {
    setInstalling(id);
    try {
      // Marketplace catalog content is demo data (product catalog, not backend
      // state) but the install action itself calls a real API route.
      await apiPost(`/premium/marketplace/${id}/install`);
      toast.success(`${name} installed to your account`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Install endpoint not available yet");
    } finally {
      setInstalling(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
        <p className="text-sm text-muted-foreground">Browse community and official add-ons for your servers.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search marketplace…" className="pl-9" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item, idx) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
            <Card glass className="flex h-full flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline">{item.category}</Badge>
                  {item.premium && <Badge variant="gradient">Premium</Badge>}
                </div>
                <h3 className="mt-3 font-semibold">{item.name}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{item.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" /> {item.rating}
                  </span>
                  <span>{formatNumber(item.installs)} installs</span>
                </div>
                <Button
                  className="mt-4 w-full"
                  variant="gradient"
                  loading={installing === item.id}
                  onClick={() => install(item.id, item.name)}
                >
                  <Download className="h-4 w-4" /> Install
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
