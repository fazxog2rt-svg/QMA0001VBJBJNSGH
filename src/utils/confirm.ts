import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";
import { warningEmbed } from "./embed";

const CONFIRM_TIMEOUT_MS = 30_000;

/** Shows a confirm/cancel dialog and resolves to true/false/null (timeout). Interaction must already be deferred. */
export async function askConfirmation(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  question: string,
): Promise<boolean | null> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm:yes")
      .setLabel("Konfirmasi")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("confirm:no").setLabel("Batal").setStyle(ButtonStyle.Secondary),
  );

  const message = await interaction.editReply({
    embeds: [warningEmbed(question)],
    components: [row],
  });

  try {
    const buttonInteraction = await message.awaitMessageComponent({
      componentType: ComponentType.Button,
      time: CONFIRM_TIMEOUT_MS,
      filter: (i) => i.user.id === interaction.user.id,
    });

    await buttonInteraction.deferUpdate();
    return buttonInteraction.customId === "confirm:yes";
  } catch {
    await interaction.editReply({ components: [] }).catch(() => undefined);
    return null;
  }
}
