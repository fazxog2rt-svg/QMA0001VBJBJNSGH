import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { Member } from "../../database/models/Member";
import { getLeaderboard } from "../../services/leveling/levelingService";
import { buildEmbed, errorEmbed } from "../../utils/embed";
import { paginateEmbeds } from "../../utils/pagination";

const PAGE_SIZE = 10;
const MAX_PAGES = 5;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Papan peringkat XP server ini."),
  category: "leveling",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const totalMembers = await Member.countDocuments({ guildId: interaction.guildId });
    if (totalMembers === 0) {
      await interaction.editReply({
        embeds: [errorEmbed("Belum ada member dengan XP di server ini.")],
      });
      return;
    }

    const totalPages = Math.min(MAX_PAGES, Math.ceil(totalMembers / PAGE_SIZE));
    const embeds = [];

    for (let page = 0; page < totalPages; page += 1) {
      const entries = await getLeaderboard(interaction.guildId, PAGE_SIZE, page * PAGE_SIZE);
      const lines = entries.map((entry) => {
        const medal =
          entry.rank === 1
            ? "🥇"
            : entry.rank === 2
              ? "🥈"
              : entry.rank === 3
                ? "🥉"
                : `#${entry.rank}`;
        return `${medal} <@${entry.userId}> — Level ${entry.level} (${entry.xp} XP)`;
      });

      embeds.push(
        buildEmbed("primary")
          .setTitle("🏆 Papan Peringkat XP")
          .setDescription(lines.join("\n"))
          .setFooter({ text: `Halaman ${page + 1} dari ${totalPages}` }),
      );
    }

    await paginateEmbeds(interaction, embeds);
  },
};

export default command;
