import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { getOrCreateMember } from "../../services/profile/profileService";
import { buildEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("marriage")
    .setDescription("Lihat status pernikahan.")
    .addUserOption((opt) =>
      opt.setName("member").setDescription("Member yang ingin dicek (default: kamu)."),
    ),
  category: "community",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const user = interaction.options.getUser("member") ?? interaction.user;
    const member = await getOrCreateMember(interaction.guildId, user.id);

    if (!member.partnerId || !member.marriedAt) {
      await interaction.reply({
        embeds: [buildEmbed("primary").setDescription(`${user} masih jomblo. 💚 Coba \`/marry\`!`)],
      });
      return;
    }

    const since = Math.floor(member.marriedAt.getTime() / 1000);
    await interaction.reply({
      embeds: [
        buildEmbed("success")
          .setTitle("💕 Status Pernikahan")
          .setDescription(
            `${user} menikah dengan <@${member.partnerId}>.\nSejak <t:${since}:D> (<t:${since}:R>).`,
          ),
      ],
    });
  },
};

export default command;
