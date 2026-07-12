import { Collection, type Interaction } from "discord.js";
import type { BotClient } from "../client";
import { checkCooldown } from "../middlewares/cooldown.middleware";
import { hasRequiredPermissions } from "../middlewares/permission.middleware";
import { isCategoryEnabled } from "../services/config/featureFlags";
import type { BotEvent } from "../types/event";
import { errorEmbed } from "../utils/embed";
import { logger } from "../services/logger.service";

/** Matches "ticket:open" against a registered id of "ticket:open" or "ticket:open:123". */
function findComponentHandler<T extends { customId: string }>(
  collection: Collection<string, T>,
  interactionCustomId: string,
): T | undefined {
  if (collection.has(interactionCustomId)) return collection.get(interactionCustomId);

  return collection.find((component) => interactionCustomId.startsWith(`${component.customId}:`));
}

const event: BotEvent<"interactionCreate"> = {
  name: "interactionCreate",
  execute: async (client: BotClient, interaction: Interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        if (!hasRequiredPermissions(interaction, command)) {
          await interaction.reply({
            embeds: [errorEmbed("Kamu tidak punya izin untuk menjalankan command ini.")],
            ephemeral: true,
          });
          return;
        }

        // Sakelar fitur dari dashboard: blokir command bila kategorinya dimatikan admin.
        if (
          interaction.inGuild() &&
          !(await isCategoryEnabled(interaction.guildId, command.category))
        ) {
          await interaction.reply({
            embeds: [errorEmbed("Fitur ini sedang dinonaktifkan oleh admin server.")],
            ephemeral: true,
          });
          return;
        }

        const remainingCooldown = checkCooldown(
          client,
          command.data.name,
          interaction.user.id,
          command.cooldownSeconds,
        );
        if (remainingCooldown > 0) {
          await interaction.reply({
            embeds: [
              errorEmbed(`Tunggu ${remainingCooldown} detik lagi sebelum memakai command ini.`),
            ],
            ephemeral: true,
          });
          return;
        }

        await command.execute(interaction, client);
        return;
      }

      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        await command?.autocomplete?.(interaction, client);
        return;
      }

      if (interaction.isContextMenuCommand()) {
        const command = client.contextMenuCommands.get(interaction.commandName);
        await command?.execute(interaction, client);
        return;
      }

      if (interaction.isButton()) {
        const handler = findComponentHandler(client.buttons, interaction.customId);
        await handler?.execute(interaction, client);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const handler = findComponentHandler(client.selectMenus, interaction.customId);
        await handler?.execute(interaction, client);
        return;
      }

      if (interaction.isModalSubmit()) {
        const handler = findComponentHandler(client.modals, interaction.customId);
        await handler?.execute(interaction, client);
        return;
      }
    } catch (error) {
      logger.error("Error saat menangani interaksi", {
        error: error instanceof Error ? error.message : error,
        customId: "customId" in interaction ? interaction.customId : undefined,
        commandName: "commandName" in interaction ? interaction.commandName : undefined,
      });

      if (interaction.isRepliable()) {
        const payload = { embeds: [errorEmbed("Terjadi kesalahan saat memproses permintaanmu.")] };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ ...payload, ephemeral: true }).catch(() => undefined);
        } else {
          await interaction.reply({ ...payload, ephemeral: true }).catch(() => undefined);
        }
      }
    }
  },
};

export default event;
