import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { Member } from "../../database/models/Member";
import { PRESTIGE_MIN_LEVEL } from "../../config/constants";
import { askConfirmation } from "../../utils/confirm";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("prestige")
    .setDescription(
      `Reset level ke 0 untuk mendapatkan Prestige (butuh minimal Level ${PRESTIGE_MIN_LEVEL}).`,
    ),
  category: "leveling",
  cooldownSeconds: 10,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const member = await Member.findOne({
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });
    if (!member || member.level < PRESTIGE_MIN_LEVEL) {
      await interaction.editReply({
        embeds: [
          errorEmbed(`Kamu butuh minimal Level ${PRESTIGE_MIN_LEVEL} untuk melakukan prestige.`),
        ],
      });
      return;
    }

    const confirmed = await askConfirmation(
      interaction,
      `Prestige akan mereset **Level dan XP-mu ke 0** dan menaikkan Prestige ke **${member.prestige + 1}**. Badge dan achievement tidak akan hilang. Lanjutkan?`,
    );

    if (confirmed !== true) {
      await interaction.editReply({ embeds: [errorEmbed("Prestige dibatalkan.")], components: [] });
      return;
    }

    member.level = 0;
    member.xp = 0;
    member.prestige += 1;
    await member.save();

    await interaction.editReply({
      embeds: [
        buildEmbed("premium").setDescription(
          `🌟 Selamat! Kamu sekarang **Prestige ${member.prestige}**. Level dan XP-mu direset ke 0 — waktunya naik lagi!`,
        ),
      ],
      components: [],
    });
  },
};

export default command;
