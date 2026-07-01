import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { Faq } from "../../database/models/Faq";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";
import { paginateEmbeds } from "../../utils/pagination";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("faq")
    .setDescription("Kelola dan lihat FAQ server.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tambah")
        .setDescription("[Admin] Tambah entri FAQ.")
        .addStringOption((option) =>
          option
            .setName("pertanyaan")
            .setDescription("Pertanyaan.")
            .setRequired(true)
            .setMaxLength(200),
        )
        .addStringOption((option) =>
          option.setName("jawaban").setDescription("Jawaban.").setRequired(true).setMaxLength(1000),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("hapus")
        .setDescription("[Admin] Hapus entri FAQ.")
        .addStringOption((option) =>
          option.setName("id").setDescription("ID FAQ.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("Lihat semua FAQ server."),
    ),
  category: "ai",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const hasManageGuild =
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;

    if (subcommand === "tambah") {
      if (!hasManageGuild) {
        await interaction.reply({
          embeds: [errorEmbed("Kamu butuh izin **Manage Server**.")],
          ephemeral: true,
        });
        return;
      }

      const pertanyaan = interaction.options.getString("pertanyaan", true);
      const jawaban = interaction.options.getString("jawaban", true);

      const faq = await Faq.create({
        guildId: interaction.guildId,
        question: pertanyaan,
        answer: jawaban,
        createdBy: interaction.user.id,
      });
      await interaction.reply({
        embeds: [successEmbed(`FAQ ditambahkan (ID: \`${faq._id.toString()}\`).`)],
      });
      return;
    }

    if (subcommand === "hapus") {
      if (!hasManageGuild) {
        await interaction.reply({
          embeds: [errorEmbed("Kamu butuh izin **Manage Server**.")],
          ephemeral: true,
        });
        return;
      }

      const id = interaction.options.getString("id", true);
      const deleted = await Faq.findOneAndDelete({ _id: id, guildId: interaction.guildId }).catch(
        () => null,
      );

      if (!deleted) {
        await interaction.reply({ embeds: [errorEmbed("FAQ tidak ditemukan.")], ephemeral: true });
        return;
      }

      await interaction.reply({ embeds: [successEmbed("FAQ dihapus.")] });
      return;
    }

    const faqs = await Faq.find({ guildId: interaction.guildId }).sort({ createdAt: 1 });
    if (faqs.length === 0) {
      await interaction.reply({
        embeds: [errorEmbed("Belum ada FAQ di server ini.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const perPage = 5;
    const embeds = [];
    for (let i = 0; i < faqs.length; i += perPage) {
      const description = faqs
        .slice(i, i + perPage)
        .map((faq) => `**Q: ${faq.question}**\nA: ${faq.answer}\n\`${faq._id.toString()}\``)
        .join("\n\n");
      embeds.push(buildEmbed("primary").setTitle("❓ FAQ Server").setDescription(description));
    }

    await paginateEmbeds(interaction, embeds);
  },
};

export default command;
