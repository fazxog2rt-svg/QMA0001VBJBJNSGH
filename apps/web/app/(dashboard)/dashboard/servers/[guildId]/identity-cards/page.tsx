"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";
import { identityCardCreateSchema, IDENTITY_CARD_THEMES } from "@nexusbot/shared";
import type { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CardPreview } from "@/components/identity-card/card-preview";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type { IdentityCard, IdentityCardType } from "@/types";

const CARD_TYPES: IdentityCardType[] = [
  "MEMBER",
  "CITIZEN",
  "EMPLOYEE",
  "STUDENT",
  "VIP",
  "EVENT_PASS",
  "STAFF",
  "POLICE_RP",
  "MILITARY_RP",
  "ORGANIZATION",
  "CLAN",
  "GUILD",
  "COMPANY",
  "COMMUNITY",
  "CREATOR",
  "PREMIUM_MEMBER",
];

type CreateForm = z.infer<typeof identityCardCreateSchema>;

export default function IdentityCardsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [cards, setCards] = React.useState<IdentityCard[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [themeFilter, setThemeFilter] = React.useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<IdentityCard[]>(`/guilds/${guildId}/identity-cards`)
      .then(setCards)
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [guildId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(identityCardCreateSchema),
    defaultValues: { theme: "default", type: "MEMBER" },
  });

  const watched = watch();

  async function onSubmit(values: CreateForm) {
    setSubmitting(true);
    try {
      await apiPost(`/guilds/${guildId}/identity-cards`, values);
      toast.success("Identity card generated");
      setDialogOpen(false);
      reset();
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to generate card");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = cards.filter(
    (c) => (typeFilter === "ALL" || c.type === typeFilter) && (themeFilter === "ALL" || c.theme === themeFilter),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold">Identity cards</h2>
          <p className="text-sm text-muted-foreground">Generated RP identity cards for this server&apos;s members.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {CARD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={themeFilter} onValueChange={setThemeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All themes</SelectItem>
              {IDENTITY_CARD_THEMES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="h-4 w-4" /> Generate card
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Generate identity card
                </DialogTitle>
                <DialogDescription>Create a new RP identity card and preview it live.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="discordUserId">Discord user ID</Label>
                    <Input id="discordUserId" placeholder="123456789012345678" {...register("discordUserId")} />
                    {errors.discordUserId && <p className="text-xs text-destructive">{errors.discordUserId.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" placeholder="e.g. Nova Sterling" {...register("fullName")} />
                    {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Card type</Label>
                    <Controller
                      control={control}
                      name="type"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CARD_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t.replace("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Theme</Label>
                    <Controller
                      control={control}
                      name="theme"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IDENTITY_CARD_THEMES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="roleLabel">Role label (optional)</Label>
                    <Input id="roleLabel" placeholder="e.g. Lead Developer" {...register("roleLabel")} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" variant="gradient" loading={submitting}>
                      Generate card
                    </Button>
                  </DialogFooter>
                </form>

                <div className="flex items-center justify-center">
                  <CardPreview
                    theme={watched.theme || "default"}
                    type={(watched.type as IdentityCardType) || "MEMBER"}
                    fullName={watched.fullName || "New Member"}
                    discordUserId={watched.discordUserId || "000000000000000000"}
                    roleLabel={watched.roleLabel}
                    interactive={false}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[1.6/1] w-full rounded-2xl" />)}

        {!loading && filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No identity cards yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Generate the first identity card for a member of this server.
            </p>
          </div>
        )}

        {!loading &&
          filtered.map((card) => (
            <Card key={card.id} glass className="p-4">
              <CardContent className="p-0">
                <CardPreview
                  theme={card.theme}
                  type={card.type}
                  fullName={card.fullName}
                  discordUserId={card.discordUserId}
                  avatarUrl={card.avatarUrl}
                  roleLabel={card.roleLabel}
                  level={card.level}
                  badges={card.badges}
                  isVerified={card.isVerified}
                  uniqueCode={card.uniqueCode}
                />
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
