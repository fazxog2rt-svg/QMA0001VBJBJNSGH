"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { KeyRound, Laptop, Save, ShieldCheck, Trash2, Plus, Copy } from "lucide-react";
import { apiKeyCreateSchema } from "@nexusbot/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import type { ApiKey, Session } from "@/types";

type ApiKeyForm = z.infer<typeof apiKeyCreateSchema>;

export default function AccountSettingsPage() {
  const { user, loading: userLoading, refetch } = useCurrentUser();
  const [displayName, setDisplayName] = React.useState("");
  const [savingProfile, setSavingProfile] = React.useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(false);
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [settingUp2fa, setSettingUp2fa] = React.useState(false);

  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = React.useState(true);

  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = React.useState(true);
  const [keyDialogOpen, setKeyDialogOpen] = React.useState(false);
  const [creatingKey, setCreatingKey] = React.useState(false);
  const [newKeySecret, setNewKeySecret] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? user.username);
      setTwoFactorEnabled(user.twoFactorEnabled);
    }
  }, [user]);

  React.useEffect(() => {
    const controller = new AbortController();
    apiGet<Session[]>("/auth/sessions", undefined, controller.signal)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
    apiGet<ApiKey[]>("/users/me/api-keys", undefined, controller.signal)
      .then(setApiKeys)
      .catch(() => setApiKeys([]))
      .finally(() => setApiKeysLoading(false));
    return () => controller.abort();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiPatch("/users/me", { displayName });
      toast.success("Profile updated");
      refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function begin2faSetup() {
    setSettingUp2fa(true);
    try {
      const res = await apiPost<{ qrCodeDataUrl: string }>("/auth/2fa/setup");
      setQrCode(res.qrCodeDataUrl);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start 2FA setup");
    } finally {
      setSettingUp2fa(false);
    }
  }

  async function revokeSession(id: string) {
    try {
      await apiDelete(`/auth/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Session revoked");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to revoke session");
    }
  }

  const { register, handleSubmit, reset } = useForm<ApiKeyForm>({
    resolver: zodResolver(apiKeyCreateSchema),
    defaultValues: { scopes: [] },
  });

  async function createKey(values: ApiKeyForm) {
    setCreatingKey(true);
    try {
      const res = await apiPost<ApiKey & { secret: string }>("/users/me/api-keys", values);
      setApiKeys((prev) => [res, ...prev]);
      setNewKeySecret(res.secret);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create API key");
    } finally {
      setCreatingKey(false);
    }
  }

  async function revokeKey(id: string) {
    try {
      await apiDelete(`/users/me/api-keys/${id}`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key revoked");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to revoke key");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, security, and API access.</p>
      </div>

      {/* Profile */}
      <Card glass>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your public display name across the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          {userLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <form onSubmit={saveProfile} className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="displayName">Display name</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <Button type="submit" variant="gradient" loading={savingProfile}>
                <Save className="h-4 w-4" /> Save
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Two-factor authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{twoFactorEnabled ? "2FA is enabled" : "2FA is not enabled"}</p>
              <p className="text-xs text-muted-foreground">Uses TOTP authenticator apps (Google Authenticator, Authy, etc.)</p>
            </div>
            {!twoFactorEnabled && (
              <Button variant="outline" onClick={begin2faSetup} loading={settingUp2fa}>
                Set up 2FA
              </Button>
            )}
          </div>
          {qrCode && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="2FA QR code" className="h-40 w-40 rounded-lg bg-white p-2" />
              <p className="text-center text-xs text-muted-foreground">
                Scan this QR code with your authenticator app, then verify from the 2FA page to finish setup.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card glass>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Laptop className="h-4 w-4" /> Active sessions
          </CardTitle>
          <CardDescription>Devices and browsers currently signed in to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No active sessions found.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {s.userAgent ?? "Unknown device"} {s.current && <Badge className="ml-1 text-[10px]">This device</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.ipAddress ?? "Unknown IP"} · expires {formatDistanceToNow(new Date(s.expiresAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!s.current && (
                    <Button variant="ghost" size="icon-sm" onClick={() => revokeSession(s.id)} aria-label="Revoke session">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card glass>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" /> API keys
            </CardTitle>
            <CardDescription>Programmatic access to the NexusBot API.</CardDescription>
          </div>
          <Dialog
            open={keyDialogOpen}
            onOpenChange={(open) => {
              setKeyDialogOpen(open);
              if (!open) setNewKeySecret(null);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm">
                <Plus className="h-4 w-4" /> New key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>Store the generated secret securely — it&apos;s only shown once.</DialogDescription>
              </DialogHeader>
              {newKeySecret ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
                    <span className="flex-1 truncate">{newKeySecret}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(newKeySecret);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setKeyDialogOpen(false)}>Done</Button>
                  </DialogFooter>
                </div>
              ) : (
                <form onSubmit={handleSubmit(createKey)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="keyName">Key name</Label>
                    <Input id="keyName" placeholder="CI deploy key" {...register("name")} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" variant="gradient" loading={creatingKey}>
                      Generate key
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {apiKeysLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No API keys yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>{key.name}</TableCell>
                    <TableCell className="font-mono text-xs">{key.keyPrefix}…</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {key.lastUsedAt ? formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true }) : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => revokeKey(key.id)} aria-label="Revoke key">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
