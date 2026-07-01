import type { ChatInputCommandInteraction, PermissionsBitField } from "discord.js";
import { env } from "../config/env";
import type { SlashCommand } from "../types/command";

export function isOwner(userId: string): boolean {
  return env.OWNER_IDS.includes(userId);
}

export function hasRequiredPermissions(
  interaction: ChatInputCommandInteraction,
  command: SlashCommand,
): boolean {
  if (command.ownerOnly) {
    return isOwner(interaction.user.id);
  }

  if (!command.requiredPermissions || command.requiredPermissions.length === 0) {
    return true;
  }

  const memberPermissions = interaction.memberPermissions as PermissionsBitField | null;
  if (!memberPermissions) return false;

  return command.requiredPermissions.every((permission) => memberPermissions.has(permission));
}
