import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { Member } from "../../database/models/Member";
import { getOrCreateMember } from "../../services/profile/profileService";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder().setName("divorce").setDescription("Ceraikan pasanganmu (fun)."),
  category: "community",
  cooldownSeconds: 10,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const me = await getOrCreateMember(interaction.guildId, interaction.user.id);
    if (!me.partnerId) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu belum menikah dengan siapa pun.")],
        ephemeral: true,
      });
      return;
    }

    const partnerId = me.partnerId;
    me.partnerId = undefined;
    me.marriedAt = undefined;
    await me.save();

    // Bersihkan sisi pasangan juga.
    await Member.updateOne(
      { guildId: interaction.guildId, userId: partnerId },
      { $unset: { partnerId: "", marriedAt: "" } },
    );

    await interaction.reply({
      embeds: [successEmbed(`Kamu telah bercerai dengan <@${partnerId}>. 💔`)],
    });
  },
};

export default command;
