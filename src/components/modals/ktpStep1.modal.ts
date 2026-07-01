import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { ModalComponent } from "../../types/component";
import { saveDraft } from "../../services/ktp/ktpSession";
import { parseTanggalLahir, validateNik } from "../../services/ktp/ktpValidation";
import { buildEmbed, errorEmbed } from "../../utils/embed";

const component: ModalComponent = {
  customId: "ktp:step1",
  execute: async (interaction) => {
    if (!interaction.inGuild()) return;

    const nama = interaction.fields.getTextInputValue("nama").trim();
    const nikInput = interaction.fields.getTextInputValue("nik");
    const tempatLahir = interaction.fields.getTextInputValue("tempatLahir").trim();
    const tanggalLahirInput = interaction.fields.getTextInputValue("tanggalLahir");
    const pekerjaan = interaction.fields.getTextInputValue("pekerjaan").trim();

    const nik = validateNik(nikInput);
    if (!nik.ok) {
      await interaction.reply({ embeds: [errorEmbed(nik.error!)], ephemeral: true });
      return;
    }

    const tanggalLahir = parseTanggalLahir(tanggalLahirInput);
    if (!tanggalLahir.ok) {
      await interaction.reply({ embeds: [errorEmbed(tanggalLahir.error!)], ephemeral: true });
      return;
    }

    await saveDraft(interaction.guildId, interaction.user.id, {
      nama,
      nik: nik.value,
      tempatLahir,
      tanggalLahirIso: tanggalLahir.value!.toISOString(),
      pekerjaan,
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ktp:continue-step2")
        .setLabel("Lanjutkan ke Alamat")
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({
      embeds: [
        buildEmbed("success").setDescription("✅ Data diri tersimpan. Lanjutkan ke data alamat."),
      ],
      components: [row],
      ephemeral: true,
    });
  },
};

export default component;
