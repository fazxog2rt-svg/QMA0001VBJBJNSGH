import { randomBytes } from "node:crypto";
import express, { type Request, type Response } from "express";
import session from "express-session";
import type { BotClient } from "../client";
import { env } from "../config/env";
import { GuildConfig } from "../database/models/GuildConfig";
import { invalidateFeatureCache } from "../services/config/featureFlags";
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
  errorPage,
  loginPage,
  serversPage,
  settingsPage,
  type GuildCardData,
  type ToggleGroup,
} from "./views";

declare module "express-session" {
  interface SessionData {
    oauthState?: string;
    user?: { id: string; name: string };
    guilds?: { id: string; name: string; icon: string | null }[];
  }
}

// Definisi sakelar: nama field form = path dot GuildConfig. Semua boolean.
const SETTINGS_SCHEMA: {
  title: string;
  items: { path: string; label: string; desc?: string }[];
}[] = [
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

const ALL_PATHS = SETTINGS_SCHEMA.flatMap((g) => g.items.map((i) => i.path));

function guildIconUrl(id: string, icon: string | null): string | null {
  return icon ? `https://cdn.discordapp.com/icons/${id}/${icon}.png?size=64` : null;
}

function requireUser(req: Request, res: Response): boolean {
  if (!req.session.user) {
    res.redirect("/");
    return false;
  }
  return true;
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
        const manageable = guilds.filter(canManageGuild);
        req.session.user = { id: user.id, name: user.global_name || user.username };
        req.session.guilds = manageable.map((g: DiscordGuild) => ({
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
    if (!requireUser(req, res)) return;
    const cards: GuildCardData[] = (req.session.guilds ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      iconUrl: guildIconUrl(g.id, g.icon),
      botPresent: client.guilds.cache.has(g.id),
    }));
    res.type("html").send(serversPage(req.session.user!.name, cards));
  });

  const findManageableGuild = (req: Request, guildId: string) =>
    (req.session.guilds ?? []).find((g) => g.id === guildId);

  app.get("/server/:id", (req, res) => {
    void (async () => {
      if (!requireUser(req, res)) return;
      const guildId = req.params.id;
      const guild = findManageableGuild(req, guildId);
      if (!guild || !client.guilds.cache.has(guildId)) {
        return res
          .status(403)
          .type("html")
          .send(errorPage("Kamu tidak boleh mengatur server ini."));
      }

      // Upsert agar default schema terisi, lalu baca nilai tiap path.
      const config = await GuildConfig.findOneAndUpdate(
        { guildId },
        { $setOnInsert: { guildId } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      const groups: ToggleGroup[] = SETTINGS_SCHEMA.map((group) => ({
        title: group.title,
        items: group.items.map((item) => ({
          name: item.path,
          label: item.label,
          desc: item.desc,
          checked: Boolean(config?.get(item.path)),
        })),
      }));

      res
        .type("html")
        .send(
          settingsPage(
            req.session.user!.name,
            { id: guildId, name: guild.name, iconUrl: guildIconUrl(guildId, guild.icon) },
            groups,
            req.query.saved === "1",
          ),
        );
    })();
  });

  app.post("/server/:id", (req, res) => {
    void (async () => {
      if (!requireUser(req, res)) return;
      const guildId = req.params.id;
      const guild = findManageableGuild(req, guildId);
      if (!guild || !client.guilds.cache.has(guildId)) {
        return res
          .status(403)
          .type("html")
          .send(errorPage("Kamu tidak boleh mengatur server ini."));
      }

      const body = req.body as Record<string, unknown>;
      const update: Record<string, boolean> = {};
      for (const path of ALL_PATHS) {
        // Checkbox tercentang -> ada di body; tidak tercentang -> tidak ada.
        update[path] = body[path] !== undefined;
      }

      await GuildConfig.updateOne({ guildId }, { $set: update }, { upsert: true });
      await invalidateFeatureCache(guildId).catch(() => undefined);
      res.redirect(`/server/${guildId}?saved=1`);
    })();
  });

  const port = Number(env.DASHBOARD_PORT ?? process.env.SERVER_PORT ?? 3000);
  app.listen(port, "0.0.0.0", () => {
    logger.info(`Dashboard web aktif di port ${port} (base: ${env.DASHBOARD_BASE_URL}).`);
  });
}
