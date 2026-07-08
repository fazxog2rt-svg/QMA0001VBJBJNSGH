import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { buildEmbed, errorEmbed, successEmbed } from "../../utils/embed";
import { getCurrencySymbol } from "../../services/economy/economyService";
import {
  buyListing,
  cancelListing,
  createListing,
  listActiveListings,
  myListings,
} from "../../services/economy/marketService";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("pasar")
    .setDescription("Marketplace antar-member: jual-beli item dengan escrow aman.")
    .addSubcommand((s) =>
      s
        .setName("jual")
        .setDescription("Pasang item dari inventory untuk dijual.")
        .addStringOption((o) =>
          o.setName("item").setDescription("Kode item (itemKey) di inventory.").setRequired(true),
        )
        .addIntegerOption((o) =>
          o
            .setName("harga")
            .setDescription("Harga per unit (coins).")
            .setRequired(true)
            .setMinValue(1),
        )
        .addIntegerOption((o) =>
          o.setName("jumlah").setDescription("Jumlah yang dijual (default 1).").setMinValue(1),
        ),
    )
    .addSubcommand((s) => s.setName("list").setDescription("Lihat item yang sedang dijual."))
    .addSubcommand((s) =>
      s
        .setName("beli")
        .setDescription("Beli dari sebuah listing.")
        .addIntegerOption((o) =>
          o.setName("nomor").setDescription("Nomor listing.").setRequired(true).setMinValue(1),
        )
        .addIntegerOption((o) =>
          o.setName("jumlah").setDescription("Jumlah yang dibeli (default 1).").setMinValue(1),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName("batal")
        .setDescription("Batalkan listing-mu & tarik kembali item.")
        .addIntegerOption((o) =>
          o.setName("nomor").setDescription("Nomor listing.").setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((s) => s.setName("punyaku").setDescription("Lihat listing aktif milikmu.")),
  category: "economy",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Perintah ini hanya untuk di dalam server.")],
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const symbol = await getCurrencySymbol(guildId);

    if (sub === "jual") {
      const item = interaction.options.getString("item", true);
      const harga = interaction.options.getInteger("harga", true);
      const jumlah = interaction.options.getInteger("jumlah") ?? 1;
      const result = await createListing(guildId, userId, item, harga, jumlah);
      if (!result.ok || !result.data) {
        await interaction.reply({ embeds: [errorEmbed(result.error!)], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed(
            `Listing **#${result.data.listingNumber}** dibuat: **${result.data.itemName}** ×${result.data.quantity} @ ${symbol}${result.data.pricePerUnit}. Orang lain bisa beli dengan \`/pasar beli nomor:${result.data.listingNumber}\`.`,
          ),
        ],
      });
      return;
    }

    if (sub === "list") {
      const listings = await listActiveListings(guildId, 15);
      if (listings.length === 0) {
        await interaction.reply({
          embeds: [
            buildEmbed("info")
              .setTitle("🛒 Pasar")
              .setDescription("Belum ada yang dijual. Pasang barangmu dengan `/pasar jual`!"),
          ],
        });
        return;
      }
      const text = listings
        .map(
          (l) =>
            `**#${l.listingNumber}** — ${l.itemName} ×${l.quantity} @ ${symbol}${l.pricePerUnit} · penjual <@${l.sellerId}>`,
        )
        .join("\n");
      await interaction.reply({
        embeds: [
          buildEmbed("premium")
            .setTitle("🛒 Pasar — Item Dijual")
            .setDescription(text)
            .setFooter({ text: "Beli: /pasar beli nomor:<n> jumlah:<x>" }),
        ],
      });
      return;
    }

    if (sub === "beli") {
      const nomor = interaction.options.getInteger("nomor", true);
      const jumlah = interaction.options.getInteger("jumlah") ?? 1;
      const result = await buyListing(guildId, userId, nomor, jumlah);
      if (!result.ok || !result.data) {
        await interaction.reply({ embeds: [errorEmbed(result.error!)], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed(
            `Kamu membeli **${result.data.itemName}** ×${result.data.qty} seharga ${symbol}${result.data.totalPaid}. ` +
              `Penjual <@${result.data.sellerId}> menerima ${symbol}${result.data.sellerReceived} (setelah pajak).`,
          ),
        ],
      });
      return;
    }

    if (sub === "batal") {
      const nomor = interaction.options.getInteger("nomor", true);
      const result = await cancelListing(guildId, userId, nomor);
      if (!result.ok || !result.data) {
        await interaction.reply({ embeds: [errorEmbed(result.error!)], ephemeral: true });
        return;
      }
      await interaction.reply({
        embeds: [
          successEmbed(`Listing **#${nomor}** dibatalkan. Item dikembalikan ke inventory-mu.`),
        ],
      });
      return;
    }

    // punyaku
    const listings = await myListings(guildId, userId);
    if (listings.length === 0) {
      await interaction.reply({
        embeds: [buildEmbed("info").setDescription("Kamu tidak punya listing aktif.")],
        ephemeral: true,
      });
      return;
    }
    const text = listings
      .map(
        (l) =>
          `**#${l.listingNumber}** — ${l.itemName} ×${l.quantity} @ ${symbol}${l.pricePerUnit}`,
      )
      .join("\n");
    await interaction.reply({
      embeds: [buildEmbed("primary").setTitle("📦 Listing Milikmu").setDescription(text)],
      ephemeral: true,
    });
  },
};

export default command;
