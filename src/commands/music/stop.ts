import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { successEmbed } from "../../utils/embed";
import { ensureVoiceContext } from "../../services/music/guards";
import { destroyQueue, getQueue } from "../../services/music/musicManager";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Hentikan musik, kosongkan antrean, dan keluar dari voice channel."),
  category: "music",
  cooldownSeconds: 2,
  execute: async (interaction) => {
    if (!(await ensureVoiceContext(interaction))) return;

    const queue = getQueue(interaction.guildId ?? "");
    if (!queue) {
      await interaction.reply({
        embeds: [successEmbed("Tidak ada yang diputar. Bot sudah keluar.")],
        ephemeral: true,
      });
      return;
    }

    destroyQueue(interaction.guildId ?? "");
    await interaction.reply({
      embeds: [successEmbed("⏹️ Musik dihentikan dan antrean dikosongkan.")],
    });
  },
};

export default command;
