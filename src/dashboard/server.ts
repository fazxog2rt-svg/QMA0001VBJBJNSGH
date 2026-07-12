import { randomBytes } from "node:crypto";
import { ChannelType } from "discord.js";
import express, { type Request, type Response } from "express";
import session from "express-session";
import type { BotClient } from "../client";
import { env } from "../config/env";
import { GuildConfig } from "../database/models/GuildConfig";
import { Member } from "../database/models/Member";
import { invalidateFeatureCache } from "../services/config/featureFlags";
import { getLeaderboard } from "../services/leveling/levelingService";
import { getEconomyLeaderboard } from "../services/economy/economyService";
import { listFactions, resetFactionWarForGuild } from "../services/community/factionService";
import { endSeason, getActiveSeason, startSeason } from "../services/community/seasonService";
import { logger } from "../services/logger.service";
import {
  authorizeUrl,
  canManageGuild,
  exchangeCode,
  fetchGuilds,
  fetchUser,
  type DiscordGuild,
} from "./oauth";
import {
  card,
  errorPage,
  esc,
  loginPage,
  numberField,
  selectField,
  serversPage,
  serverShell,
  textField,
  textareaField,
  toggleRow,
  type GuildCardData,
  type GuildHeader,
} from "./views";

declare module "express-session" {
  interface SessionData {
    oauthState?: string;
    user?: { id: string; name: string };
    guilds?: { id: string; name: string; icon: string | null }[];
  }
}

const FEATURE_SCHEMA: { title: string; items: { path: string; label: string; desc?: string }[] }[] =
  [
    {
      title: "Kategori Fitur",
      items: [
        { path: "features.economy", label: "Ekonomi", desc: "/balance, /shop, /pasar, dll." },
        { path: "features.fun", label: "Hiburan & Game", desc: "/trivia, /rpg, /slot, dll." },
        { path: "features.leveling", label: "Leveling & XP", desc: "/rank, /leaderboard, dll." },
        { path: "features.community", label: "Komunitas", desc: "/faksi, /musim, /pet, dll." },
        { path: "features.ai", label: "AI (OpenRouter)", desc: "/ai-chat, /ai-translate, dll." },
        { path: "features.events", label: "Event & Giveaway", desc: "/event, /giveaway." },
      ],
    },
    {
      title: "Auto-Moderasi",
      items: [
        { path: "autoMod.antiSpam", label: "Anti-Spam" },
        { path: "autoMod.antiInvite", label: "Anti-Invite" },
        { path: "autoMod.antiScam", label: "Anti-Scam" },
        { path: "autoMod.antiLink", label: "Anti-Link" },
        { path: "autoMod.antiMentionSpam", label: "Anti-Mention Spam" },
      ],
    },
    {
      title: "Keamanan",
      items: [
        { path: "security.antiRaid", label: "Anti-Raid" },
        { path: "security.antiNuke", label: "Anti-Nuke" },
      ],
    },
    {
      title: "Modul Lain",
      items: [
        { path: "leveling.enabled", label: "Sistem Leveling aktif" },
        { path: "starboard.enabled", label: "Starboard" },
        { path: "motivation.enabled", label: "Motivasi otomatis" },
        { path: "aiAssistantEnabled", label: "AI Assistant" },
      ],
    },
  ];
const FEATURE_PATHS = FEATURE_SCHEMA.flatMap((g) => g.items.map((i) => i.path));

function guildIconUrl(id: string, icon: string | null): string | null {
  return icon ? `https://cdn.discordapp.com/icons/${id}/${icon}.png?size=64` : null;
}

export function startDashboard(client: BotClient): void {
  if (!env.DASHBOARD_ENABLED) return;
  if (!env.DISCORD_CLIENT_SECRET || !env.DASHBOARD_BASE_URL) {
    logger.warn(
      "Dashboard aktif tapi DISCORD_CLIENT_SECRET / DASHBOARD_BASE_URL belum diset — dashboard dilewati.",
    );
    return;
  }

  const app = express();
  app.set("trust proxy", 1);
  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      secret: env.SESSION_SECRET ?? randomBytes(32).toString("hex"),
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 },
    }),
  );

  // ---- helpers ----
  type SessionGuild = { id: string; name: string; icon: string | null };

  function guard(req: Request, res: Response): SessionGuild | null {
    if (!req.session.user) {
      res.redirect("/");
      return null;
    }
    const guildId = String(req.params.id);
    const guild = (req.session.guilds ?? []).find((g) => g.id === guildId);
    if (!guild || !client.guilds.cache.has(guildId)) {
      res.status(403).type("html").send(errorPage("Kamu tidak boleh mengatur server ini."));
      return null;
    }
    return guild;
  }

  const header = (guild: SessionGuild): GuildHeader => ({
    id: guild.id,
    name: guild.name,
    iconUrl: guildIconUrl(guild.id, guild.icon),
  });

  function channelOptions(guildId: string): { value: string; label: string }[] {
    const guild = client.guilds.cache.get(guildId);
    const opts = [{ value: "", label: "— tidak diset —" }];
    guild?.channels.cache
      .filter((c) => c.type === ChannelType.GuildText)
      .forEach((c) => opts.push({ value: c.id, label: `#${c.name}` }));
    return opts;
  }

  function roleOptions(guildId: string, includeEmpty: boolean): { value: string; label: string }[] {
    const guild = client.guilds.cache.get(guildId);
    const opts = includeEmpty ? [{ value: "", label: "— tidak diset —" }] : [];
    guild?.roles.cache
      .filter((r) => r.id !== guildId && !r.managed)
      .sort((a, b) => b.position - a.position)
      .forEach((r) => opts.push({ value: r.id, label: `@${r.name}` }));
    return opts;
  }

  const saved = (req: Request): boolean => req.query.saved === "1";

  // ---- auth ----
  app.get("/", (req, res) => {
    if (req.session.user) return res.redirect("/servers");
    res.type("html").send(loginPage());
  });

  app.get("/login", (req, res) => {
    const state = randomBytes(16).toString("hex");
    req.session.oauthState = state;
    res.redirect(authorizeUrl(state));
  });

  app.get("/callback", (req, res) => {
    void (async () => {
      const { code, state } = req.query as { code?: string; state?: string };
      if (!code || !state || state !== req.session.oauthState) {
        return res.status(400).type("html").send(errorPage("State tidak valid. Coba login lagi."));
      }
      req.session.oauthState = undefined;
      try {
        const token = await exchangeCode(code);
        const [user, guilds] = await Promise.all([fetchUser(token), fetchGuilds(token)]);
        req.session.user = { id: user.id, name: user.global_name || user.username };
        req.session.guilds = guilds.filter(canManageGuild).map((g: DiscordGuild) => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
        }));
        res.redirect("/servers");
      } catch (error) {
        logger.warn("OAuth callback gagal", {
          error: error instanceof Error ? error.message : error,
        });
        res.status(500).type("html").send(errorPage("Login gagal. Coba lagi."));
      }
    })();
  });

  app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
  });

  app.get("/servers", (req, res) => {
    if (!req.session.user) return res.redirect("/");
    const cards: GuildCardData[] = (req.session.guilds ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      iconUrl: guildIconUrl(g.id, g.icon),
      botPresent: client.guilds.cache.has(g.id),
    }));
    res.type("html").send(serversPage(req.session.user.name, cards));
  });

  // ---- Fitur (toggles) ----
  app.get("/server/:id", (req, res) => {
    void (async () => {
      const guild = guard(req, res);
      if (!guild) return;
      const config = await GuildConfig.findOneAndUpdate(
        { guildId: guild.id },
        { $setOnInsert: { guildId: guild.id } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      const groupsHtml = FEATURE_SCHEMA.map((group) =>
        card(
          group.title,
          group.items
            .map((item) =>
              toggleRow({
                name: item.path,
                label: item.label,
                desc: item.desc,
                checked: Boolean(config?.get(item.path)),
              }),
            )
            .join(""),
        ),
      ).join("");
      const body = `<form method="post" action="/server/${guild.id}">${groupsHtml}<button class="btn" type="submit">💾 Simpan</button></form>`;
      res
        .type("html")
        .send(serverShell(req.session.user!.name, header(guild), "fitur", body, saved(req)));
    })();
  });

  app.post("/server/:id", (req, res) => {
    void (async () => {
      const guild = guard(req, res);
      if (!guild) return;
      const body = req.body as Record<string, unknown>;
      const update: Record<string, boolean> = {};
      for (const path of FEATURE_PATHS) update[path] = body[path] !== undefined;
      await GuildConfig.updateOne({ guildId: guild.id }, { $set: update }, { upsert: true });
      await invalidateFeatureCache(guild.id).catch(() => undefined);
      res.redirect(`/server/${guild.id}?saved=1`);
    })();
  });

  // ---- Statistik ----
  app.get("/server/:id/stats", (req, res) => {
    void (async () => {
      const guild = guard(req, res);
      if (!guild) return;
      const discordGuild = client.guilds.cache.get(guild.id);
      const [agg] = await Member.aggregate<{ members: number; messages: number; xp: number }>([
        { $match: { guildId: guild.id } },
        {
          $group: {
            _id: null,
            members: { $sum: 1 },
            messages: { $sum: "$messageCount" },
            xp: { $sum: "$xp" },
          },
        },
      ]);
      const [xpTop, ecoTop] = await Promise.all([
        getLeaderboard(guild.id, 5, 0),
        getEconomyLeaderboard(guild.id, 5),
      ]);

      const stat = (n: string, l: string) =>
        `<div class="stat"><div class="n">${n}</div><div class="l">${esc(l)}</div></div>`;
      const num = (v: number) => v.toLocaleString("id-ID");
      const statsHtml = `<div class="stats">
        ${stat(num(discordGuild?.memberCount ?? 0), "Member Server")}
        ${stat(num(agg?.members ?? 0), "Terdata di Bot")}
        ${stat(num(agg?.messages ?? 0), "Total Pesan")}
        ${stat(num(agg?.xp ?? 0), "Total XP")}
      </div>`;

      const xpList = xpTop.length
        ? xpTop
            .map(
              (e, i) =>
                `<div class="row"><div>${i + 1}. <@${e.userId}></div><div class="muted">Lv ${e.level} · ${num(e.xp)} XP</div></div>`,
            )
            .join("")
        : '<p class="muted">Belum ada data.</p>';
      const ecoList = ecoTop.length
        ? ecoTop
            .map(
              (e, i) =>
                `<div class="row"><div>${i + 1}. <@${e.userId}></div><div class="muted">${num(e.total)} coins</div></div>`,
            )
            .join("")
        : '<p class="muted">Belum ada data.</p>';

      const body =
        card("Ringkasan", statsHtml) +
        card("🏆 Top 5 XP", xpList) +
        card("💰 Top 5 Ekonomi", ecoList);
      res
        .type("html")
        .send(serverShell(req.session.user!.name, header(guild), "stats", body, false));
    })();
  });

  // ---- Channel & Teks ----
  const CHANNEL_FIELDS: { path: string; label: string }[] = [
    { path: "welcomeChannelId", label: "Channel Welcome" },
    { path: "goodbyeChannelId", label: "Channel Goodbye" },
    { path: "birthdayChannelId", label: "Channel Ulang Tahun" },
    { path: "motivation.channelId", label: "Channel Motivasi" },
    { path: "faksi.announceChannelId", label: "Channel Pengumuman Faksi" },
    { path: "suggestions.channelId", label: "Channel Saran" },
    { path: "reportChannelId", label: "Channel Laporan" },
    { path: "logChannels.moderation", label: "Channel Log Moderasi" },
  ];

  app.get("/server/:id/channels", (req, res) => {
    void (async () => {
      const guild = guard(req, res);
      if (!guild) return;
      const config = await GuildConfig.findOneAndUpdate(
        { guildId: guild.id },
        { $setOnInsert: { guildId: guild.id } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      const chOpts = channelOptions(guild.id);
      const channelInputs = CHANNEL_FIELDS.map((f) =>
        selectField(f.path, f.label, chOpts, String(config?.get(f.path) ?? "")),
      ).join("");
      const textInputs =
        textareaField(
          "welcomeMessage",
          "Teks Welcome ({user}, {server}, {memberCount})",
          String(config?.get("welcomeMessage") ?? ""),
        ) +
        textareaField(
          "goodbyeMessage",
          "Teks Goodbye ({user}, {server})",
          String(config?.get("goodbyeMessage") ?? ""),
        );
      const body = `<form method="post" action="/server/${guild.id}/channels">
        ${card("Channel", channelInputs)}
        ${card("Pesan Sambutan", textInputs)}
        <button class="btn" type="submit">💾 Simpan</button></form>`;
      res
        .type("html")
        .send(serverShell(req.session.user!.name, header(guild), "channels", body, saved(req)));
    })();
  });

  app.post("/server/:id/channels", (req, res) => {
    void (async () => {
      const guild = guard(req, res);
      if (!guild) return;
      const body = req.body as Record<string, string>;
      const update: Record<string, string> = {};
      for (const f of CHANNEL_FIELDS) update[f.path] = body[f.path] ?? "";
      update["welcomeMessage"] = (body.welcomeMessage ?? "").slice(0, 1000);
      update["goodbyeMessage"] = (body.goodbyeMessage ?? "").slice(0, 1000);
      await GuildConfig.updateOne({ guildId: guild.id }, { $set: update }, { upsert: true });
      res.redirect(`/server/${guild.id}/channels?saved=1`);
    })();
  });

  // ---- Ekonomi & Leveling ----
  app.get("/server/:id/economy", (req, res) => {
    void (async () => {
      const guild = guard(req, res);
      if (!guild) return;
      const config = await GuildConfig.findOneAndUpdate(
        { guildId: guild.id },
        { $setOnInsert: { guildId: guild.id } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      const chOpts = channelOptions(guild.id);
      const roleOpts = roleOptions(guild.id, false);

      const econForm = `<form method="post" action="/server/${guild.id}/economy">
        <input type="hidden" name="action" value="save">
        ${textField("currencySymbol", "Simbol Koin", String(config?.get("economy.currencySymbol") ?? "🪙"))}
        ${numberField("dailyAmount", "Hadiah Daily", Number(config?.get("economy.dailyAmount") ?? 100))}
        ${numberField("weeklyAmount", "Hadiah Weekly", Number(config?.get("economy.weeklyAmount") ?? 500))}
        ${selectField("levelAnnounce", "Channel Pengumuman Level", chOpts, String(config?.get("leveling.announceChannelId") ?? ""))}
        <button class="btn" type="submit">💾 Simpan</button></form>`;

      const rewards = (config?.get("leveling.roleRewards") ?? []) as {
        level: number;
        roleId: string;
      }[];
      const rewardRows = rewards.length
        ? rewards
            .map(
              (r) =>
                `<div class="row"><div>Level <b>${r.level}</b> → <@&${r.roleId}></div>
                <form method="post" action="/server/${guild.id}/economy" style="margin:0">
                  <input type="hidden" name="action" value="removeRole">
                  <input type="hidden" name="level" value="${r.level}">
                  <button class="btn danger" type="submit">Hapus</button></form></div>`,
            )
            .join("")
        : '<p class="muted">Belum ada role reward.</p>';
      const addForm = `<form method="post" action="/server/${guild.id}/economy">
        <input type="hidden" name="action" value="addRole">
        ${numberField("level", "Level", 5)}
        ${selectField("roleId", "Role", roleOpts, "")}
        <button class="btn secondary" type="submit">➕ Tambah Role Reward</button></form>`;

      const body =
        card("Ekonomi & Leveling", econForm) +
        card(
          "Role Reward per Level",
          rewardRows + "<hr style='border-color:#222a3d;margin:14px 0'>" + addForm,
        );
      res
        .type("html")
        .send(serverShell(req.session.user!.name, header(guild), "economy", body, saved(req)));
    })();
  });

  app.post("/server/:id/economy", (req, res) => {
    void (async () => {
      const guild = guard(req, res);
      if (!guild) return;
      const body = req.body as Record<string, string>;
      const action = body.action;

      if (action === "addRole") {
        const level = Math.max(1, Math.min(1000, Number(body.level) || 0));
        const roleId = body.roleId;
        if (level && roleId) {
          await GuildConfig.updateOne(
            { guildId: guild.id },
            { $pull: { "leveling.roleRewards": { level } } },
          );
          await GuildConfig.updateOne(
            { guildId: guild.id },
            { $push: { "leveling.roleRewards": { level, roleId } } },
            { upsert: true },
          );
        }
      } else if (action === "removeRole") {
        const level = Number(body.level) || 0;
        await GuildConfig.updateOne(
          { guildId: guild.id },
          { $pull: { "leveling.roleRewards": { level } } },
        );
      } else {
        const update = {
          "economy.currencySymbol": (body.currencySymbol || "🪙").slice(0, 8),
          "economy.dailyAmount": Math.max(0, Number(body.dailyAmount) || 0),
          "economy.weeklyAmount": Math.max(0, Number(body.weeklyAmount) || 0),
          "leveling.announceChannelId": body.levelAnnounce ?? "",
        };
        await GuildConfig.updateOne({ guildId: guild.id }, { $set: update }, { upsert: true });
      }
      res.redirect(`/server/${guild.id}/economy?saved=1`);
    })();
  });

  // ---- Faksi & Musim ----
  app.get("/server/:id/games", (req, res) => {
    void (async () => {
      const guild = guard(req, res);
      if (!guild) return;
      const config = await GuildConfig.findOneAndUpdate(
        { guildId: guild.id },
        { $setOnInsert: { guildId: guild.id } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      const chOpts = channelOptions(guild.id);
      const [factions, season] = await Promise.all([
        listFactions(guild.id, 5),
        getActiveSeason(guild.id),
      ]);

      const klasemen = factions.length
        ? factions
            .map(
              (f, i) =>
                `<div class="row"><div>${["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`} ${esc(f.emoji)} <b>${esc(f.name)}</b></div><div class="muted">${f.weeklyPoints} poin · ${f.wins}× juara</div></div>`,
            )
            .join("")
        : '<p class="muted">Belum ada faksi.</p>';

      const faksiForm = `<form method="post" action="/server/${guild.id}/games">
        <input type="hidden" name="action" value="faksiSave">
        ${numberField("createCost", "Biaya Bikin Faksi", Number(config?.get("faksi.createCost") ?? 5000))}
        ${numberField("weeklyReward", "Hadiah Juara Mingguan", Number(config?.get("faksi.weeklyRewardBase") ?? 10000))}
        ${selectField("announce", "Channel Pengumuman", chOpts, String(config?.get("faksi.announceChannelId") ?? ""))}
        <button class="btn" type="submit">💾 Simpan</button></form>
        <hr style='border-color:#222a3d;margin:14px 0'>
        <form method="post" action="/server/${guild.id}/games" onsubmit="return confirm('Reset perang faksi sekarang? Juara pekan ini akan ditentukan & poin direset.')">
          <input type="hidden" name="action" value="resetWar">
          <button class="btn danger" type="submit">⚔️ Reset Perang Sekarang</button></form>`;

      const seasonBody = season
        ? `<p>Musim aktif: <b>${esc(season.name)}</b> — berakhir <span class="muted">${season.endsAt.toLocaleDateString("id-ID")}</span></p>
           <form method="post" action="/server/${guild.id}/games" onsubmit="return confirm('Akhiri musim sekarang?')">
             <input type="hidden" name="action" value="endSeason">
             <button class="btn danger" type="submit">🏁 Akhiri Musim</button></form>`
        : `<p class="muted">Tidak ada musim aktif.</p>
           <form method="post" action="/server/${guild.id}/games">
             <input type="hidden" name="action" value="startSeason">
             ${textField("nama", "Nama Musim", "")}
             ${numberField("durasi", "Durasi (hari)", 30)}
             <button class="btn" type="submit">🎟️ Mulai Musim Baru</button></form>`;

      const body =
        card("🏰 Klasemen Faksi", klasemen) +
        card("⚙️ Pengaturan Faksi", faksiForm) +
        card("🎟️ Battle Pass / Musim", seasonBody);
      res
        .type("html")
        .send(serverShell(req.session.user!.name, header(guild), "games", body, saved(req)));
    })();
  });

  app.post("/server/:id/games", (req, res) => {
    void (async () => {
      const guild = guard(req, res);
      if (!guild) return;
      const body = req.body as Record<string, string>;
      const action = body.action;

      if (action === "faksiSave") {
        await GuildConfig.updateOne(
          { guildId: guild.id },
          {
            $set: {
              "faksi.createCost": Math.max(0, Number(body.createCost) || 0),
              "faksi.weeklyRewardBase": Math.max(0, Number(body.weeklyReward) || 0),
              "faksi.announceChannelId": body.announce ?? "",
            },
          },
          { upsert: true },
        );
      } else if (action === "resetWar") {
        await resetFactionWarForGuild(client, guild.id).catch((error) =>
          logger.warn("Reset perang faksi via dashboard gagal", {
            error: error instanceof Error ? error.message : error,
          }),
        );
      } else if (action === "startSeason") {
        await startSeason(guild.id, body.nama ?? "", Number(body.durasi) || 30);
      } else if (action === "endSeason") {
        await endSeason(guild.id);
      }
      res.redirect(`/server/${guild.id}/games?saved=1`);
    })();
  });

  const port = Number(env.DASHBOARD_PORT ?? process.env.SERVER_PORT ?? 3000);
  app.listen(port, "0.0.0.0", () => {
    logger.info(`Dashboard web aktif di port ${port} (base: ${env.DASHBOARD_BASE_URL}).`);
  });
}
