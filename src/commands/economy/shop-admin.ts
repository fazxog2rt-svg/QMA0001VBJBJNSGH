import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { ShopItem } from "../../database/models/ShopItem";
import { GuildConfig } from "../../database/models/GuildConfig";
import { errorEmbed, successEmbed } from "../../utils/embed";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("shop-admin")
    .setDescription("[Admin] Kelola item toko & mata uang.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tambah")
        .setDescription("Tambah/perbarui item toko.")
        .addStringOption((option) =>
          option.setName("key").setDescription("Key unik item.").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("nama").setDescription("Nama item.").setRequired(true),
        )
        .addIntegerOption((option) =>
          option.setName("harga").setDescription("Harga item.").setRequired(true).setMinValue(0),
        )
        .addStringOption((option) =>
          option.setName("deskripsi").setDescription("Deskripsi item.").setMaxLength(200),
        )
        .addRoleOption((option) =>
          option.setName("role").setDescription("Role yang diberikan saat membeli item ini."),
        )
        .addIntegerOption((option) =>
          option.setName("stok").setDescription("Stok (-1 = tak terbatas).").setMinValue(-1),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("hapus")
        .setDescription("Hapus item toko.")
        .addStringOption((option) =>
          option.setName("key").setDescription("Key item.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("mata-uang")
        .setDescription("Atur simbol mata uang server.")
        .addStringOption((option) =>
          option
            .setName("simbol")
            .setDescription("Emoji/simbol mata uang.")
            .setRequired(true)
            .setMaxLength(10),
        ),
    ),
  category: "economy",
  requiredPermissions: [PermissionFlagsBits.ManageGuild],
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

    if (subcommand === "tambah") {
      const key = interaction.options.getString("key", true).toLowerCase().replaceAll(" ", "-");
      const nama = interaction.options.getString("nama", true);
      const harga = interaction.options.getInteger("harga", true);
      const deskripsi = interaction.options.getString("deskripsi") ?? "";
      const role = interaction.options.getRole("role");
      const stok = interaction.options.getInteger("stok") ?? -1;

      await ShopItem.findOneAndUpdate(
        { guildId: interaction.guildId, itemKey: key },
        {
          guildId: interaction.guildId,
          itemKey: key,
          name: nama,
          description: deskripsi,
          price: harga,
          roleId: role?.id,
          stock: stok,
          enabled: true,
        },
        { upsert: true },
      );

      await interaction.reply({
        embeds: [successEmbed(`Item **${nama}** (\`${key}\`) disimpan di toko.`)],
      });
      return;
    }

    if (subcommand === "hapus") {
      const key = interaction.options.getString("key", true);
      const deleted = await ShopItem.findOneAndDelete({
        guildId: interaction.guildId,
        itemKey: key,
      });

      if (!deleted) {
        await interaction.reply({ embeds: [errorEmbed("Item tidak ditemukan.")], ephemeral: true });
        return;
      }

      await interaction.reply({ embeds: [successEmbed("Item dihapus dari toko.")] });
      return;
    }

    const simbol = interaction.options.getString("simbol", true);
    await GuildConfig.findOneAndUpdate(
      { guildId: interaction.guildId },
      { $set: { "economy.currencySymbol": simbol } },
      { upsert: true },
    );

    await interaction.reply({ embeds: [successEmbed(`Simbol mata uang diatur ke ${simbol}.`)] });
  },
};

export default command;
