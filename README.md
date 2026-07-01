# NexusBot

NexusBot is an enterprise-grade, full-stack Discord bot platform: a Discord.js v14 bot, a
Next.js dashboard (user / admin / analytics panels), a secured REST API, a PostgreSQL +
Prisma data layer, and a Redis-backed realtime WebSocket bridge that keeps the dashboard in
sync with everything happening on Discord — moderation actions, tickets, economy, leveling,
and more — as it happens.

It is built as a monorepo with clean, modular boundaries so new features (moderation rules,
economy minigames, AI features, dashboard widgets) can be added as **plugins** without
touching core code.

## Architecture

```
                          ┌────────────────────┐
                          │      Discord        │
                          └─────────┬────────────┘
                                    │ discord.js v14
                          ┌─────────▼────────────┐
                          │      apps/bot         │  Command/Event/Plugin handlers
                          │  (Node.js + TS)       │  Moderation, AutoMod, Economy,
                          └─────────┬─────────────┘  Leveling, Tickets, Identity Cards,
                                    │                  Giveaways, AI Assistant...
                     writes         │ publishes realtime
                                    ▼ events over Redis pub/sub
                          ┌────────────────────┐        ┌─────────────────────┐
                          │      Redis          │◄──────►│      apps/api        │
                          │ cache / pub-sub /    │        │ Express + Socket.IO  │
                          │ rate-limit           │        │ JWT / OAuth2 / 2FA   │
                          └────────────────────┘        │ REST + Swagger docs   │
                                    ▲                     └─────────┬─────────────┘
                                    │ Prisma ORM                     │ Socket.IO (realtime)
                          ┌─────────┴────────────┐                   │ REST (fetch)
                          │     PostgreSQL        │        ┌─────────▼─────────────┐
                          │  (via @nexusbot/      │        │      apps/web          │
                          │   database / Prisma)  │        │ Next.js 14 dashboard   │
                          └────────────────────┘        │ User / Admin / Analytics│
                                                           └─────────────────────┘
```

**Monorepo layout**

```
apps/
  bot/        Discord.js v14 bot — commands, events, AutoMod, economy, leveling,
              tickets, identity cards, giveaways, AI assistant, plugin system
  api/        Express + TypeScript REST API, Socket.IO realtime gateway,
              JWT/OAuth2/2FA auth, admin + analytics + premium endpoints
  web/        Next.js 14 dashboard — user panel, admin panel, analytics panel
  agent/      Lightweight daemon you run next to YOUR OWN bot process so the
              dashboard's Bot Console can start/stop/restart it and stream logs
packages/
  database/   Prisma schema + generated client, shared by bot & api
  shared/     Cross-app TypeScript types, zod schemas, realtime event contract,
              constants (XP curve, premium limits, rate limits...)
  config/     Shared ESLint/TS base config
docker/       Per-app Dockerfiles
```

Each app also has its own `FEATURES.md` documenting exactly what is implemented today
vs. what is designed-for and left as a plugin/extension point — see:
[`apps/bot/FEATURES.md`](apps/bot/FEATURES.md) ·
[`apps/api/FEATURES.md`](apps/api/FEATURES.md) ·
[`apps/web/FEATURES.md`](apps/web/FEATURES.md)

## Tech stack

| Layer | Technology |
|---|---|
| Bot | Node.js, TypeScript, Discord.js v14, `@napi-rs/canvas` (card rendering), `qrcode`, `node-cron` |
| API | Express, TypeScript, Prisma ORM, Socket.IO, JWT, Redis, Swagger/OpenAPI |
| Web | Next.js 14 (App Router), React 18, TailwindCSS, Framer Motion, Radix-based UI kit, Recharts |
| Data | PostgreSQL 16, Redis 7 |
| Auth | Discord OAuth2, Google OAuth2, Email + password, TOTP 2FA, JWT session rotation |
| Ops | Docker, Docker Compose, PM2, GitHub Actions CI |

## Getting started (local development)

### Prerequisites
- Node.js 20+
- Docker (for Postgres + Redis) or local installs of both
- A Discord application (bot token + OAuth2 client) — https://discord.com/developers/applications
- (Optional) Google OAuth2 client, Anthropic API key for the AI assistant

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# fill in DISCORD_TOKEN, DISCORD_CLIENT_ID/SECRET, JWT secrets, etc.
```

### 3. Start infrastructure (Postgres + Redis)
```bash
docker compose up -d postgres redis
```

### 4. Set up the database
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5. Run everything in dev mode
```bash
npm run dev
```
This runs `apps/bot`, `apps/api`, and `apps/web` in parallel via Turborepo. The dashboard
is available at `http://localhost:3000`, the API at `http://localhost:4000` (Swagger docs
at `http://localhost:4000/docs`).

### 6. Register Discord slash commands
```bash
npm run deploy-commands --workspace=@nexusbot/bot
```

## Running with Docker Compose (full stack)
```bash
cp .env.example .env   # configure secrets first
docker compose up --build
```
This builds and starts Postgres, Redis, a one-shot migration job, the API, the bot, and the
web dashboard.

## Production deployment with PM2
```bash
npm run build
npm run db:migrate:deploy --workspace=@nexusbot/database
pm2 start ecosystem.config.js
```

## Bot Console — controlling a bot you already run yourself

If you already have your own Discord bot running on your own server (not `apps/bot`), the
dashboard's **Bot Console** (`/dashboard/bot-console`) can still give you start/stop/restart
control and a live log stream for it, via `apps/agent` — a small daemon you run next to your
existing bot:

```
apps/agent (on YOUR server, next to YOUR bot)
   │ connects OUT over Socket.IO — no inbound ports needed on your box
   ▼
apps/api  `/agent` namespace — verifies the instance's agent token, tracks
          BotInstance status/pid in Postgres, relays start/stop/restart
          commands + live log lines between the agent and the dashboard
   │ Socket.IO room `instance:<id>`
   ▼
apps/web  Bot Console page — Start/Stop/Restart buttons + terminal-style
          live log viewer
```

Create an instance in **Bot Console → New Instance** to get a one-time agent token, then
configure and run `apps/agent` next to your bot (see
[`apps/agent/README.md`](apps/agent/README.md)). The agent only ever executes the single
start command you configure locally in its own `.env` — the dashboard can send it
start/stop/restart *signals*, never an arbitrary remote command.

## The plugin system

Both the bot and the dashboard are designed so new features don't require editing core
files:

- **Bot plugins** live in `apps/bot/src/plugins/<plugin-key>/plugin.ts` and export a
  `NexusPlugin` (commands, events, an `onLoad` hook). The plugin loader auto-discovers and
  registers them at boot — see `apps/bot/src/handlers/pluginLoader.ts` and the worked
  example in `apps/bot/src/plugins/example-birthday-announcer/`.
- **Guild-level feature toggles** are tracked in the `GuildPlugin` Prisma model so premium
  tiers/servers can enable or disable plugins independently, with per-guild JSON config.
- **Dashboard modules** follow a page-per-route convention under
  `apps/web/app/(dashboard)/dashboard/**`, each independently data-fetching from the API,
  so new panels can be added without modifying shared layout code.

## Security

- Passwords hashed with bcrypt; JWT access/refresh token rotation with server-side session
  revocation (`Session` model).
- 2FA (TOTP) for email accounts.
- Zod validation on every mutating API route.
- Helmet, CORS allowlisting, Redis-backed rate limiting (global + stricter on auth routes).
- Prisma parametrized queries (no raw SQL string interpolation).
- Audit logging (`AuditLog`) for admin and moderation actions.
- API keys are stored hashed (SHA-256) and shown in plaintext only once at creation.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run bot + api + web in parallel (Turborepo) |
| `npm run build` | Build all apps/packages |
| `npm run lint` / `typecheck` / `test` | Run across the whole monorepo |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:seed` | Seed demo data (owner user, guild, identity card, announcement) |
| `npm run db:studio` | Open Prisma Studio |

## License
Proprietary — all rights reserved unless a LICENSE file states otherwise.
