"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import type { AuditLogEntry } from "@/types";
import type { PaginatedResult } from "@nexusbot/shared";

const PAGE_SIZE = 20;

export default function GuildAuditLogsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [page, setPage] = React.useState(1);
  const [result, setResult] = React.useState<PaginatedResult<AuditLogEntry> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    apiGet<PaginatedResult<AuditLogEntry>>(
      `/guilds/${guildId}/audit-logs`,
      { page, pageSize: PAGE_SIZE },
      controller.signal,
    )
      .then(setResult)
      .catch(() => setResult({ items: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 }))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [guildId, page]);

  return (
    <Card glass>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-4 w-4" /> Audit logs
        </CardTitle>
        {result && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            Page {result.page} of {Math.max(result.totalPages, 1)}
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={page >= result.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !result || result.items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No audit log entries yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.actorTag ?? "System"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{entry.action}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{entry.target ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{entry.ipAddress ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
