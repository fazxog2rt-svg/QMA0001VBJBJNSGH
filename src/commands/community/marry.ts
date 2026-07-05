import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { getOrCreateMember } from "../../services/profile/profileService";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("marry")
    .setDescription("Lamar member lain untuk menikah (fun)!")
    .addUserOption((opt) =>
      opt.setName("pasangan").setDescription("Orang yang ingin kamu lamar.").setRequired(true),
    ),
  category: "community",
  cooldownSeconds: 10,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const target = interaction.options.getUser("pasangan", true);
    if (target.bot || target.id === interaction.user.id) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu tidak bisa melamar dirimu sendiri atau bot.")],
        ephemeral: true,
      });
      return;
    }

    const [me, them] = await Promise.all([
      getOrCreateMember(interaction.guildId, interaction.user.id),
      getOrCreateMember(interaction.guildId, target.id),
    ]);

    if (me.partnerId) {
      await interaction.reply({
        embeds: [errorEmbed("Kamu sudah menikah. Ceraikan dulu dengan `/divorce`.")],
        ephemeral: true,
      });
      return;
    }
    if (them.partnerId) {
      await interaction.reply({
        embeds: [errorEmbed(`${target} sudah menikah dengan orang lain. 💔`)],
        ephemeral: true,
      });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`marry:accept:${interaction.user.id}`)
        .setLabel("Terima")
        .setEmoji("💍")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`marry:decline:${interaction.user.id}`)
        .setLabel("Tolak")
        .setEmoji("💔")
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({
      content: `${target}`,
      embeds: [
        buildEmbed("primary")
          .setTitle("💍 Lamaran!")
          .setDescription(
            `${interaction.user} melamar ${target}!\n\n${target}, apakah kamu menerima lamaran ini?`,
          ),
      ],
      components: [row],
    });
  },
};

export default command;
