import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { Member } from "../../database/models/Member";
import { getRank } from "../../services/leveling/levelingService";
import { renderRankCard } from "../../services/leveling/rankCardRenderer";
import { errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Lihat rank dan progres XP.")
    .addUserOption((option) => option.setName("user").setDescription("Lihat rank member lain.")),
  category: "leveling",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser("user") ?? interaction.user;
    await interaction.deferReply();

    const member = await Member.findOne({ guildId: interaction.guildId, userId: target.id });
    if (!member) {
      await interaction.editReply({
        embeds: [
          errorEmbed(
            target.id === interaction.user.id
              ? "Kamu belum punya XP. Kirim pesan atau ngobrol di voice channel dulu!"
              : "Member ini belum punya XP.",
          ),
        ],
      });
      return;
    }

    const rank = await getRank(interaction.guildId, target.id);
    const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);

    const cardBuffer = await renderRankCard({
      displayName: guildMember?.displayName ?? target.username,
      avatarUrl: target.displayAvatarURL({ size: 256, extension: "png" }),
      level: member.level,
      xp: member.xp,
      prestige: member.prestige,
      rank,
    });

    await interaction.editReply({
      files: [new AttachmentBuilder(cardBuffer, { name: `rank-${target.id}.png` })],
    });
  },
};

export default command;
