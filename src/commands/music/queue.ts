import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed } from "../../utils/embed";
import { requireActiveQueue } from "../../services/music/guards";
import { formatDuration } from "../../services/music/types";

const MAX_LISTED = 10;

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("queue").setDescription("Lihat antrean lagu."),
  category: "music",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    const queue = await requireActiveQueue(interaction);
    if (!queue || !queue.current) return;

    const upcoming = queue.tracks
      .slice(0, MAX_LISTED)
      .map((t, i) => `\`${i + 1}.\` [${t.title}](${t.url}) — \`${formatDuration(t.durationSec)}\``)
      .join("\n");

    const remaining = queue.tracks.length - MAX_LISTED;
    const embed = buildEmbed("primary")
      .setTitle("📜 Antrean Musik")
      .setDescription(
        `**Sedang diputar:**\n[${queue.current.title}](${queue.current.url})\n\n` +
          (queue.tracks.length > 0
            ? `**Berikutnya:**\n${upcoming}${remaining > 0 ? `\n\n…dan ${remaining} lagu lagi.` : ""}`
            : "_Antrean kosong._"),
      )
      .setFooter({ text: `Total ${queue.tracks.length} lagu dalam antrean` });

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
