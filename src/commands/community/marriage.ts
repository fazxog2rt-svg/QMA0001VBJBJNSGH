import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { Member } from "../../database/models/Member";
import { getOrCreateMember } from "../../services/profile/profileService";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("marriage")
    .setDescription("Sistem pernikahan (fun).")
    .addSubcommand((s) =>
      s
        .setName("lamar")
        .setDescription("Lamar member lain untuk menikah.")
        .addUserOption((o) =>
          o.setName("pasangan").setDescription("Orang yang ingin kamu lamar.").setRequired(true),
        ),
    )
    .addSubcommand((s) => s.setName("cerai").setDescription("Ceraikan pasanganmu."))
    .addSubcommand((s) =>
      s
        .setName("status")
        .setDescription("Lihat status pernikahan.")
        .addUserOption((o) =>
          o.setName("member").setDescription("Member yang dicek (default: kamu)."),
        ),
    ),
  category: "community",
  cooldownSeconds: 5,
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === "lamar") {
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
          embeds: [errorEmbed("Kamu sudah menikah. Ceraikan dulu dengan `/marriage cerai`.")],
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
      return;
    }

    if (sub === "cerai") {
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
      await Member.updateOne(
        { guildId: interaction.guildId, userId: partnerId },
        { $unset: { partnerId: "", marriedAt: "" } },
      );
      await interaction.reply({
        embeds: [successEmbed(`Kamu telah bercerai dengan <@${partnerId}>. 💔`)],
      });
      return;
    }

    // status
    const user = interaction.options.getUser("member") ?? interaction.user;
    const member = await getOrCreateMember(interaction.guildId, user.id);
    if (!member.partnerId || !member.marriedAt) {
      await interaction.reply({
        embeds: [
          buildEmbed("primary").setDescription(
            `${user} masih jomblo. 💚 Coba \`/marriage lamar\`!`,
          ),
        ],
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
