import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { grantBonusXp, handleLevelUpSideEffects } from "../../services/leveling/levelingService";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("xp")
    .setDescription("[Admin] Kelola XP member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("beri")
        .setDescription("Berikan atau kurangi XP bonus (mis. hadiah event).")
        .addUserOption((option) =>
          option.setName("user").setDescription("Member penerima XP.").setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("jumlah")
            .setDescription("Jumlah XP (gunakan angka negatif untuk mengurangi).")
            .setRequired(true),
        ),
    ),
  category: "leveling",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("jumlah", true);

    const result = await grantBonusXp(interaction.guildId, target.id, amount);

    await interaction.reply({
      embeds: [
        successEmbed(
          `${amount >= 0 ? "Memberikan" : "Mengurangi"} **${Math.abs(amount)} XP** ${amount >= 0 ? "kepada" : "dari"} <@${target.id}>. Total XP sekarang: ${result.member.xp} (Level ${result.newLevel}).`,
        ),
      ],
    });

    if (result.leveledUp) {
      const discordMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (discordMember) await handleLevelUpSideEffects(interaction.guild, discordMember, result);
    }
  },
};

export default command;
