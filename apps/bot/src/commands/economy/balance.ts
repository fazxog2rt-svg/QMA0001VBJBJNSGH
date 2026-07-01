import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { Command } from "../../types/command";
import { getOrCreateProfile } from "../../features/economy/service";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your (or another member's) wallet and bank balance")
    .addUserOption((opt) => opt.setName("target").setDescription("Member to check").setRequired(false)) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const target = interaction.options.getUser("target") ?? interaction.user;

    const profile = await getOrCreateProfile(interaction.guild.id, target.id, target.username, target.displayAvatarURL());

    const embed = new EmbedBuilder()
      .setTitle(`${target.username}'s balance`)
      .addFields(
        { name: "Wallet", value: `${profile.wallet.toString()} coins`, inline: true },
        { name: "Bank", value: `${profile.bank.toString()} / ${profile.bankCapacity.toString()} coins`, inline: true },
      )
      .setColor(0x57f287)
      .setThumbnail(target.displayAvatarURL());

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
