"use client";

import * as React from "react";
import { toast } from "sonner";
import { Search, ShieldOff, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import { initials } from "@/lib/utils";
import type { PaginatedResult } from "@nexusbot/shared";
import type { User } from "@/types";

export default function AdminUsersPage() {
  const [query, setQuery] = React.useState("");
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<PaginatedResult<User> | User[]>("/admin/users", { search: query || undefined })
      .then((res) => setUsers(Array.isArray(res) ? res : res.items))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [query]);

  React.useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleBlacklist(user: User) {
    setUpdatingId(user.id);
    try {
      await apiPatch(`/admin/users/${user.id}`, { isBlacklisted: !user.isBlacklisted });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isBlacklisted: !u.isBlacklisted } : u)));
      toast.success(user.isBlacklisted ? "User unblocked" : "User blacklisted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update user");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card glass>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Platform users</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users…" className="pl-9" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No users found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={u.avatarUrl ?? undefined} />
                        <AvatarFallback>{initials(u.displayName ?? u.username)}</AvatarFallback>
                      </Avatar>
                      <span>{u.displayName ?? u.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.isBlacklisted ? "destructive" : "success"}>
                      {u.isBlacklisted ? "Blacklisted" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={updatingId === u.id}
                      onClick={() => toggleBlacklist(u)}
                      aria-label="Toggle blacklist"
                    >
                      {u.isBlacklisted ? (
                        <ShieldCheck className="h-4 w-4 text-success" />
                      ) : (
                        <ShieldOff className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
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
