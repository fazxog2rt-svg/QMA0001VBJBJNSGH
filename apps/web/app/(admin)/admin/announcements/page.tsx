"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import type { Announcement } from "@/types";

interface AnnouncementForm {
  title: string;
  content: string;
  type: "announcement" | "news" | "changelog";
  version?: string;
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const { register, handleSubmit, control, reset } = useForm<AnnouncementForm>({
    defaultValues: { type: "announcement" },
  });

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<Announcement[]>("/admin/announcements")
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(values: AnnouncementForm) {
    setSubmitting(true);
    try {
      const created = await apiPost<Announcement>("/admin/announcements", values);
      setAnnouncements((prev) => [created, ...prev]);
      toast.success("Announcement published");
      setDialogOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to publish announcement");
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePublished(a: Announcement) {
    setAnnouncements((prev) => prev.map((item) => (item.id === a.id ? { ...item, published: !item.published } : item)));
    try {
      await apiPatch(`/admin/announcements/${a.id}`, { published: !a.published });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update announcement");
      load();
    }
  }

  async function remove(a: Announcement) {
    try {
      await apiDelete(`/admin/announcements/${a.id}`);
      setAnnouncements((prev) => prev.filter((item) => item.id !== a.id));
      toast.success("Announcement deleted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete announcement");
    }
  }

  return (
    <Card glass>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4" /> Announcements
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" size="sm">
              <Plus className="h-4 w-4" /> New announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish announcement</DialogTitle>
              <DialogDescription>Shown in the dashboard news &amp; changelog panel.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register("title", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="news">News</SelectItem>
                        <SelectItem value="changelog">Changelog</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="version">Version (optional)</Label>
                <Input id="version" placeholder="1.4.0" {...register("version")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="content">Content</Label>
                <Textarea id="content" rows={4} {...register("content", { required: true })} />
              </div>
              <DialogFooter>
                <Button type="submit" variant="gradient" loading={submitting}>
                  Publish
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : announcements.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={a.type === "changelog" ? "gradient" : "secondary"} className="text-[10px]">
                    {a.type}
                  </Badge>
                  {a.version && <span className="text-xs text-muted-foreground">v{a.version}</span>}
                  <span className="text-xs text-muted-foreground">{format(new Date(a.createdAt), "MMM d, yyyy")}</span>
                </div>
                <p className="mt-1 font-medium">{a.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{a.content}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch checked={a.published} onCheckedChange={() => togglePublished(a)} />
                <Button variant="ghost" size="icon-sm" onClick={() => remove(a)} aria-label="Delete announcement">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
