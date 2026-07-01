import { SlashCommandBuilder } from "discord.js";
import { COMMAND_CATEGORIES } from "../../config/constants";
import type { BotClient } from "../../client";
import type { SlashCommand } from "../../types/command";
import { buildEmbed } from "../../utils/embed";
import { paginateEmbeds } from "../../utils/pagination";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Lihat semua command yang tersedia."),
  category: "utility",
  cooldownSeconds: 5,
  execute: async (interaction, client: BotClient) => {
    await interaction.deferReply();

    const embeds = COMMAND_CATEGORIES.map((category) => {
      const commandsInCategory = client.commands.filter((cmd) => cmd.category === category.key);

      const embed = buildEmbed("primary")
        .setTitle(`${category.emoji} ${category.label}`)
        .setFooter({
          text: `Kategori ${COMMAND_CATEGORIES.findIndex((c) => c.key === category.key) + 1} dari ${COMMAND_CATEGORIES.length}`,
        });

      if (commandsInCategory.size === 0) {
        embed.setDescription("_Belum ada command di kategori ini._");
      } else {
        embed.setDescription(
          commandsInCategory
            .map((cmd) => `\`/${cmd.data.name}\` — ${cmd.data.description}`)
            .join("\n"),
        );
      }

      return embed;
    });

    await paginateEmbeds(interaction, embeds);
  },
};

export default command;
