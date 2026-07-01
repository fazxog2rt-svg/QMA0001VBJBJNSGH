# NexusBot — apps/bot Feature Status

Honest status of everything in this package. "implemented" means the Discord
action performs a real Discord API call, writes to the real Prisma schema via
`@nexusbot/database`, and (where applicable) publishes a `RealtimeEvent` to
Redis for apps/api to relay to the dashboard. "partial" means the mechanism
works but has a documented simplification. "planned-via-plugin" means it is
intentionally NOT built as a core feature — the plugin system
(`src/handlers/pluginLoader.ts`, `src/types/plugin.ts`) is the intended home
for it, and `src/plugins/example-birthday-announcer/plugin.ts` proves the
pattern end-to-end (command + cron job, registered with zero core-file
changes).

## Core platform

| Feature | Status | Notes |
|---|---|---|
| Command handler (recursive loader) | implemented | `src/handlers/commandHandler.ts`, loads `src/commands/**/*.ts` |
| Event handler (recursive loader) | implemented | `src/handlers/eventHandler.ts`, loads `src/events/**/*.ts` |
| Plugin system | implemented | `src/handlers/pluginLoader.ts` + `src/types/plugin.ts`; merges plugin commands/events into the same Collections core uses |
| Slash command deployment script | implemented | `src/handlers/deployCommands.ts`, guild-scoped via `DISCORD_DEV_GUILD_ID` or global |
| Per-user command cooldowns | implemented | `client.cooldowns` Collection, checked in `interactionCreate.ts` |
| Graceful shutdown | implemented | `src/index.ts`, SIGINT/SIGTERM destroy client + disconnect Redis + Prisma |
| Realtime event publishing | implemented | `src/lib/redis.ts` `publishRealtimeEvent`, used by every mutating feature below |
| bot.stats heartbeat | implemented | `ready.ts`, publishes every 60s with ping/cpu/ram/uptime via `process.memoryUsage()`/`os.loadavg()` |

## Moderation

| Feature | Status | Notes |
|---|---|---|
| warn / mute / timeout / kick / ban / softban / tempban / unban / jail / lockdown / purge / case-lookup | implemented | All write a `ModerationCase` with atomic per-guild incrementing `caseNumber`, DM the target best-effort, publish the matching `RealtimeEvent` |
| AutoMod: spam, link filter, invite filter, mention spam, scam/phishing, token grabber | implemented | Pure detector functions in `src/features/automod/`, orchestrated by `runAutoMod()`, writes `ModerationCase` + `AuditLog`-style realtime event on trigger |
| AutoMod AI escalation | implemented | Ambiguous scam/phishing hits get a second opinion from the AI provider when `GuildSettings.aiAssistantEnabled`, logged to `AiChatLog(feature="moderation")` |
| Jail role auto-provisioning | partial | Creates a "Jailed" role and denies send/react on every text channel on first use; doesn't yet restore previous roles automatically on unjail (no `/unjail` command yet) |
| Tempban/timeout auto-expiry sweep | planned-via-plugin | `ModerationCase.expiresAt` is recorded but there's no cron job actively re-checking and lifting expired tempbans/timeouts yet — a good first plugin to add |

## Economy

| Feature | Status | Notes |
|---|---|---|
| balance, daily (streak), weekly, work, pay, deposit, withdraw, shop, buy, inventory, coinflip, leaderboard | implemented | `src/features/economy/service.ts` wraps all balance mutations in `prisma.$transaction`, writes `Transaction` rows with `balanceAfter`, publishes `economy.transaction` |
| Casino minigame suite (blackjack, slots, roulette, etc.) | planned-via-plugin | Only coinflip is built; a full casino belongs in a plugin |
| Fishing / mining economy loops | planned-via-plugin | `TransactionType.FISHING`/`MINING` exist in the schema for future use but no gameplay is implemented |
| Marketplace / auction house | planned-via-plugin | `TransactionType.AUCTION` exists in the schema; no auction commands implemented |
| Pets | planned-via-plugin | `Pet` model exists; no commands read/write it yet |

## Leveling

| Feature | Status | Notes |
|---|---|---|
| XP gain on message (cooldown, random range) | implemented | `messageCreate.ts`, uses shared `XP_MESSAGE_COOLDOWN_SECONDS`/`xpForLevel`/`levelFromXp` |
| Level-up role rewards | implemented | Applies every `LevelRoleReward` crossed on multi-level jumps, publishes `level.up` |
| /rank, /xp-leaderboard | implemented | |

## Tickets

| Feature | Status | Notes |
|---|---|---|
| Ticket panel + button-driven open flow | implemented | `/ticket-panel`, `ticket:open` button creates a private channel + `Ticket` row with atomic per-guild `ticketNumber`, publishes `ticket.opened` |
| Ticket close (command + button) | implemented | Archives (deletes) the channel after a short delay, publishes `ticket.closed` |
| Ticket transcripts / message logging | partial | `TicketMessage` model and `addTicketMessage()` helper exist but nothing currently calls it automatically from channel activity — a plugin or a follow-up `messageCreate` hook could wire this up |
| AI auto-reply in tickets | planned-via-plugin | `TicketMessage.isAiReply` field exists for this; not wired |

## Identity Cards

| Feature | Status | Notes |
|---|---|---|
| `/card` generation (canvas render + QR + persist) | implemented | `src/features/identityCard/renderer.ts` using `@napi-rs/canvas` + `qrcode`, persists `IdentityCard` row with `shareSlug` |
| Themes: default, aurora, midnight | implemented | Distinct gradients/palettes in `CARD_THEMES` registry |
| Remaining themes from `IDENTITY_CARD_THEMES` (neon, gold, cyberpunk, minimal, military, police, corporate) | planned-via-plugin | Adding one is a single new entry in `CARD_THEMES` in `renderer.ts` — no other code changes needed. Requests for an unregistered theme currently fall back to `default` rather than erroring. |

## Engagement

| Feature | Status | Notes |
|---|---|---|
| Giveaways (`/gstart`, `/gend`, button entry, cron auto-end) | implemented | `ready.ts` cron checks `endsAt` every minute via `processDueGiveaways` |
| Reminders (`/remind`, cron delivery) | implemented | Checked every minute in `ready.ts` |
| Birthdays (`/birthday`, hourly announce cron) | implemented | Uses the guild's configured welcome channel as the announce target (no separate birthday-channel setting yet) |
| AFK (`/afk`, return-notice, mention notice) | implemented | In-memory `client.afkUsers` map, not persisted across restarts |
| Polls (`/poll`) | implemented | Reaction-based, up to 10 options |
| Reaction roles (`/reactionrole-add` + listener events) | implemented | `messageReactionAdd`/`messageReactionRemove` events look up `ReactionRole` rows and add/remove roles, publish `role.update` |
| Welcome/goodbye config (`/welcome set/goodbye/autorole`) | implemented | Templated with `{user}`/`{server}`/`{memberCount}` |
| AutoMod config (`/automod enable/disable/list`) | implemented | |
| Invite tracking | partial | `InviteRecord` cache is maintained via `inviteCreate`/`inviteDelete` events and an in-memory `client.inviteCache`, but `guildMemberAdd` does not yet diff invite uses to attribute "who invited whom" — a good next increment |
| Temp voice channels | partial | Heuristic hub-channel-name match ("Join to Create") in `voiceStateUpdate.ts`; a dedicated `GuildSettings` field for the hub channel ID would be a cleaner follow-up |
| Boost tracking | implemented | `guildMemberUpdate.ts` diffs `premiumSince`, writes `BoostEvent`, publishes `boost.event` |
| Voice minutes tracking | implemented | `voiceStateUpdate.ts` accumulates into `GuildMember.voiceMinutes` on leave/switch |

## AI Assistant

| Feature | Status | Notes |
|---|---|---|
| `AiProvider` interface + `AnthropicProvider` | implemented | `src/lib/ai/provider.ts`, model `claude-sonnet-5`, no-ops gracefully with a helpful message if `ANTHROPIC_API_KEY` is unset |
| `/ai-chat` | implemented | Logs to `AiChatLog(feature="chat")`, gated by `GuildSettings.aiAssistantEnabled` |
| `/ai-summarize` | implemented | Summarizes up to 100 recent channel messages, logs `feature="summarizer"` |
| `/ai-translate` | implemented | Logs `feature="translation"` |
| AutoMod ambiguous-case AI judgement | implemented | See Moderation section above, logs `feature="moderation"` |
| AI ticket auto-reply | planned-via-plugin | Schema supports it (`TicketMessage.isAiReply`, `AiChatLog.feature="ticket_reply"`) but no command/hook wired yet |

## Explicitly out of scope for this pass (build as plugins)

Music streaming, full casino minigame suite, fishing/mining economy loops,
marketplace/auction house, pet battling, clans/guilds-within-guilds,
season/battle pass, forum manager, captcha image generation. None of these
are implemented. The plugin system is the intended extension point for all
of them — see `src/plugins/example-birthday-announcer/plugin.ts` for the
reference shape (commands + events + cron via `onLoad`, zero core-file
changes).
