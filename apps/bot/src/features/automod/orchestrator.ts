import type { Message } from "discord.js";
import { prisma, ModerationAction, type AutoModRule, type GuildSettings } from "@nexusbot/database";
import { checkSpam } from "./spam";
import { checkLinks } from "./linkFilter";
import { checkInvites } from "./inviteFilter";
import { checkMentionSpam } from "./mentionSpam";
import { checkScamPhishing } from "./scamPhishing";
import { checkTokenGrabber } from "./tokenGrabber";
import { createModerationCase } from "../moderation/caseService";
import { aiProvider } from "../../lib/ai/provider";
import { publishRealtimeEvent } from "../../lib/redis";
import { RealtimeEvent } from "@nexusbot/shared";
import { childLogger } from "../../lib/logger";

const log = childLogger("automod");

export interface AutoModVerdict {
  triggered: boolean;
  ruleType: string;
  action: ModerationAction;
  reason: string;
  deleteMessage: boolean;
}

async function evaluateRule(
  message: Message,
  rule: AutoModRule,
  ownGuildInviteCodes: string[],
): Promise<AutoModVerdict | null> {
  const content = message.content ?? "";

  switch (rule.type) {
    case "spam": {
      const result = checkSpam(message.guildId!, message.author.id);
      if (result.triggered) {
        return {
          triggered: true,
          ruleType: rule.type,
          action: rule.action,
          reason: `Sent ${result.count} messages in a short window (spam)`,
          deleteMessage: true,
        };
      }
      return null;
    }
    case "link": {
      const result = checkLinks(content);
      if (result.triggered) {
        return {
          triggered: true,
          ruleType: rule.type,
          action: rule.action,
          reason: `Posted a link: ${result.links[0]}`,
          deleteMessage: true,
        };
      }
      return null;
    }
    case "invite": {
      const result = checkInvites(content, ownGuildInviteCodes);
      if (result.triggered) {
        return {
          triggered: true,
          ruleType: rule.type,
          action: rule.action,
          reason: `Posted an invite link (code: ${result.codes[0]})`,
          deleteMessage: true,
        };
      }
      return null;
    }
    case "mention": {
      const result = checkMentionSpam(
        message.mentions.users.size,
        message.mentions.roles.size,
        message.mentions.everyone,
      );
      if (result.triggered) {
        return {
          triggered: true,
          ruleType: rule.type,
          action: rule.action,
          reason: `Mass mention detected (${result.count} mentions)`,
          deleteMessage: true,
        };
      }
      return null;
    }
    case "scam":
    case "phishing": {
      const result = checkScamPhishing(content);
      if (result.triggered) {
        return {
          triggered: true,
          ruleType: rule.type,
          action: result.confidence === "high" ? rule.action : ModerationAction.WARN,
          reason: `Possible scam/phishing content (${result.confidence} confidence: ${result.reasons.join(", ")})`,
          deleteMessage: true,
        };
      }
      return null;
    }
    case "token_grabber": {
      const result = checkTokenGrabber(content);
      if (result.triggered) {
        return {
          triggered: true,
          ruleType: rule.type,
          action: rule.action,
          reason: `Raw Discord token/webhook URL posted (tokens: ${result.tokens}, webhooks: ${result.webhooks})`,
          deleteMessage: true,
        };
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Runs all enabled AutoModRules for a guild against a message. On the first
 * triggered rule: takes the configured action, deletes the message where
 * appropriate, writes a ModerationCase, and publishes the realtime event.
 * Ambiguous scam/phishing hits below "high" confidence get downgraded to a
 * WARN unless aiAssistantEnabled is on, in which case the AI provider is
 * consulted for a second opinion and logged to AiChatLog(feature=moderation).
 */
export async function runAutoMod(
  message: Message,
  rules: AutoModRule[],
  settings: GuildSettings | null,
): Promise<AutoModVerdict | null> {
  if (!message.guild || message.author.bot) return null;

  const enabledRules = rules.filter((rule) => rule.enabled);
  if (enabledRules.length === 0) return null;

  const ownInvites = await prisma.inviteRecord.findMany({
    where: { guildId: message.guildId! },
    select: { code: true },
  });
  const ownGuildInviteCodes = ownInvites.map((i) => i.code);

  for (const rule of enabledRules) {
    let verdict = await evaluateRule(message, rule, ownGuildInviteCodes);
    if (!verdict) continue;

    // Escalate ambiguous scam/phishing cases to the AI provider when enabled.
    if (
      (rule.type === "scam" || rule.type === "phishing") &&
      settings?.aiAssistantEnabled &&
      aiProvider.isConfigured
    ) {
      const judgement = await aiProvider.complete(
        `A Discord message was flagged by heuristic scam/phishing detection. ` +
          `Decide if this is truly malicious spam/scam content or a false positive. ` +
          `Reply with a single word verdict (MALICIOUS or SAFE) followed by a one-sentence reason.\n\n` +
          `Message: """${message.content}"""`,
        { system: "You are a Discord moderation assistant.", maxTokens: 150 },
      );

      await prisma.aiChatLog.create({
        data: {
          guildId: message.guildId!,
          userId: message.author.id,
          channelId: message.channelId,
          prompt: message.content.slice(0, 4000),
          response: judgement.text.slice(0, 4000),
          feature: "moderation",
          tokensUsed: judgement.tokensUsed,
        },
      });

      if (!judgement.text.toUpperCase().startsWith("MALICIOUS")) {
        // AI disagrees with the heuristic; don't act, just warn quietly via log.
        log.info({ guildId: message.guildId, messageId: message.id }, "AI overrode automod scam verdict to SAFE");
        continue;
      }
    }

    // Perform the Discord-side action.
    try {
      if (verdict.deleteMessage && message.deletable) {
        await message.delete().catch(() => undefined);
      }

      const member = message.member;
      if (verdict.action === ModerationAction.TIMEOUT && member?.moderatable) {
        await member.timeout(10 * 60 * 1000, verdict.reason).catch(() => undefined);
      } else if (verdict.action === ModerationAction.KICK && member?.kickable) {
        await member.kick(verdict.reason).catch(() => undefined);
      } else if (verdict.action === ModerationAction.BAN && member?.bannable) {
        await message.guild.members.ban(message.author.id, { reason: verdict.reason }).catch(() => undefined);
      }
    } catch (err) {
      log.error({ err }, "Failed to apply automod action");
    }

    await createModerationCase({
      guildId: message.guildId!,
      targetId: message.author.id,
      targetTag: message.author.tag,
      moderatorId: message.client.user!.id,
      moderatorTag: `${message.client.user!.username} (AutoMod)`,
      action: verdict.action,
      reason: `[AutoMod:${verdict.ruleType}] ${verdict.reason}`,
    });

    await publishRealtimeEvent(RealtimeEvent.AuditLog, message.guildId!, {
      type: "automod_trigger",
      ruleType: verdict.ruleType,
      action: verdict.action,
      targetId: message.author.id,
      reason: verdict.reason,
    });

    return verdict;
  }

  return null;
}
