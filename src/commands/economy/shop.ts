import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/command";
import { ShopItem } from "../../database/models/ShopItem";
import { getCurrencySymbol } from "../../services/economy/economyService";
import { buildEmbed, errorEmbed } from "../../utils/embed";
import { paginateEmbeds } from "../../utils/pagination";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Lihat item yang dijual di toko server."),
  category: "economy",
  cooldownSeconds: 3,
  execute: async (interaction) => {
    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("Command ini hanya bisa dipakai di server.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const items = await ShopItem.find({ guildId: interaction.guildId, enabled: true }).sort({
      price: 1,
    });
    if (items.length === 0) {
      await interaction.editReply({
        embeds: [
          errorEmbed("Toko masih kosong. Admin bisa menambah item dengan `/shop-admin tambah`."),
        ],
      });
      return;
    }

    const symbol = await getCurrencySymbol(interaction.guildId);
    const perPage = 6;
    const embeds = [];

    for (let i = 0; i < items.length; i += perPage) {
      const description = items
        .slice(i, i + perPage)
        .map((item) => {
          const stock = item.stock < 0 ? "∞" : String(item.stock);
          const role = item.roleId ? ` • Role <@&${item.roleId}>` : "";
          return `**${item.name}** — ${symbol} ${item.price.toLocaleString("id-ID")} (stok: ${stock})${role}\nKey: \`${item.itemKey}\`${item.description ? `\n${item.description}` : ""}`;
        })
        .join("\n\n");
      embeds.push(
        buildEmbed("premium")
          .setTitle("🛒 Toko Server")
          .setDescription(description)
          .setFooter({ text: "Beli dengan /buy <key>" }),
      );
    }

    await paginateEmbeds(interaction, embeds);
  },
};

export default command;
