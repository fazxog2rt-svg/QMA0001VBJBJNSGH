import type { Message } from "discord.js";
import { GuildConfig } from "../../database/models/GuildConfig";
import { createModerationCase } from "../moderation/moderationService";
import { containsInviteLink, containsScamLink, countUniqueMentions } from "./autoModDetectors";
import { SlidingWindowTracker } from "./slidingWindowTracker";
import { logToSecurityChannel } from "./securityLogService";
import { buildEmbed } from "../../utils/embed";

const SPAM_WINDOW_MS = 7_000;
const SPAM_MAX_MESSAGES = 5;

const spamTracker = new SlidingWindowTracker();

/** Runs auto-moderation checks on a message. Returns true if the message was removed. */
export async function runAutoMod(message: Message<true>): Promise<boolean> {
  const guildConfig = await GuildConfig.findOne({ guildId: message.guildId });
  const autoMod = guildConfig?.autoMod;
  if (!autoMod) return false;

  const violations: string[] = [];

  if (autoMod.antiInvite && containsInviteLink(message.content)) {
    violations.push("Link invite Discord");
  }

  if (autoMod.antiScam && containsScamLink(message.content)) {
    violations.push("Link mencurigakan/scam");
  }

  if (autoMod.antiMentionSpam) {
    const mentionCount = countUniqueMentions([...message.mentions.users.keys()]);
    if (mentionCount > autoMod.maxMentionsPerMessage) {
      violations.push(`Spam mention (${mentionCount} mention)`);
    }
  }

  if (autoMod.antiSpam) {
    const recentCount = spamTracker.record(
      `${message.guildId}:${message.author.id}`,
      SPAM_WINDOW_MS,
    );
    if (recentCount > SPAM_MAX_MESSAGES) {
      violations.push("Spam pesan beruntun");
    }
  }

  if (violations.length === 0) return false;

  await message.delete().catch(() => undefined);

  const moderationCase = await createModerationCase(
    message.guildId,
    "warn",
    message.author.id,
    message.client.user.id,
    `Auto-moderasi: ${violations.join(", ")}`,
  );

  await logToSecurityChannel(
    message.guild,
    buildEmbed("danger")
      .setTitle("🛡️ Auto-Moderasi")
      .setDescription(
        `${message.author} • <#${message.channelId}>\n**Pelanggaran:** ${violations.join(", ")}\nCase #${moderationCase.caseNumber}`,
      ),
  );

  return true;
}
