import { ChannelType, type Guild, type User } from "discord.js";
import { getNextSequence } from "../../database/models/Counter";
import { GuildConfig } from "../../database/models/GuildConfig";
import { ModerationCase, type MODERATION_CASE_TYPES } from "../../database/models/ModerationCase";
import { buildEmbed } from "../../utils/embed";
import { logger } from "../../services/logger.service";

type ModerationCaseType = (typeof MODERATION_CASE_TYPES)[number];

export async function createModerationCase(
  guildId: string,
  type: ModerationCaseType,
  targetId: string,
  moderatorId: string,
  reason: string,
  options?: { duration?: number; expiresAt?: Date },
) {
  const caseNumber = await getNextSequence(`moderation-case:${guildId}`);

  return ModerationCase.create({
    guildId,
    caseNumber,
    type,
    targetId,
    moderatorId,
    reason,
    duration: options?.duration,
    expiresAt: options?.expiresAt,
    active: true,
  });
}

export async function dmModerationNotice(
  user: User,
  guildName: string,
  title: string,
  reason: string,
  extra?: string,
): Promise<void> {
  await user
    .send({
      embeds: [
        buildEmbed("warning")
          .setTitle(title)
          .setDescription(
            `Server: **${guildName}**\nAlasan: ${reason}${extra ? `\n${extra}` : ""}`,
          ),
      ],
    })
    .catch(() => undefined);
}

export async function getOrCreateMutedRole(guild: Guild): Promise<string> {
  const guildConfig = await GuildConfig.findOneAndUpdate(
    { guildId: guild.id },
    { $setOnInsert: { guildId: guild.id } },
    { upsert: true, new: true },
  );

  const existingRoleId = guildConfig.moderation?.mutedRoleId;
  if (existingRoleId && guild.roles.cache.has(existingRoleId)) {
    return existingRoleId;
  }

  const role = await guild.roles.create({
    name: "Muted",
    color: "#5c5c5c",
    permissions: [],
    reason: "Auto-provisioned mute role",
  });

  for (const channel of guild.channels.cache.values()) {
    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
      await channel.permissionOverwrites
        .edit(role, { SendMessages: false, Speak: false, AddReactions: false })
        .catch((error) => {
          logger.warn("Gagal mengatur overwrite role Muted", {
            channelId: channel.id,
            error: error instanceof Error ? error.message : error,
          });
        });
    }
  }

  guildConfig.moderation!.mutedRoleId = role.id;
  await guildConfig.save();

  return role.id;
}

export function isModerationTargetSafe(
  guild: Guild,
  moderatorId: string,
  targetId: string,
): boolean {
  if (targetId === moderatorId) return false;
  if (targetId === guild.ownerId) return false;
  if (targetId === guild.client.user.id) return false;
  return true;
}
