import { Events, MessageFlags, type Interaction } from "discord.js";
import type { NexusClient } from "../client";
import type { EventModule } from "../types/event";
import { childLogger } from "../lib/logger";
import { handleTicketButton } from "../features/tickets/buttonHandlers";
import { handleGiveawayButton } from "../features/engagement/giveawayButtons";

const log = childLogger("interactionCreate");

const DEFAULT_COOLDOWN_SECONDS = 3;

async function handleChatInputCommand(client: NexusClient, interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    log.warn({ command: interaction.commandName }, "Unknown command invoked");
    return;
  }

  if (command.guildOnly !== false && !interaction.guildId) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const cooldownKey = `${interaction.user.id}:${command.data.name}`;
  const now = Date.now();
  const expiresAt = client.cooldowns.get(cooldownKey);
  if (expiresAt && expiresAt > now) {
    const remaining = ((expiresAt - now) / 1000).toFixed(1);
    await interaction.reply({
      content: `Please wait ${remaining}s before using \`/${command.data.name}\` again.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const cooldownSeconds = command.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS;
  client.cooldowns.set(cooldownKey, now + cooldownSeconds * 1000);
  setTimeout(() => client.cooldowns.delete(cooldownKey), cooldownSeconds * 1000).unref();

  try {
    await command.execute(interaction, client);
    client.commandsExecuted += 1;
  } catch (err) {
    log.error({ err, command: command.data.name, userId: interaction.user.id }, "Command execution failed");
    const errorContent = "Something went wrong running that command. Please try again.";
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorContent, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: errorContent, flags: MessageFlags.Ephemeral });
      }
    } catch {
      // interaction likely expired; nothing more we can do
    }
  }
}

async function handleButton(client: NexusClient, interaction: Interaction) {
  if (!interaction.isButton()) return;

  try {
    if (interaction.customId.startsWith("ticket:")) {
      await handleTicketButton(interaction, client);
      return;
    }
    if (interaction.customId.startsWith("giveaway:")) {
      await handleGiveawayButton(interaction);
      return;
    }
  } catch (err) {
    log.error({ err, customId: interaction.customId }, "Button interaction failed");
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: "Something went wrong handling that action.", flags: MessageFlags.Ephemeral })
        .catch(() => undefined);
    }
  }
}

export default {
  name: Events.InteractionCreate,
  async execute(client: NexusClient, interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      await handleChatInputCommand(client, interaction);
    } else if (interaction.isButton()) {
      await handleButton(client, interaction);
    }
  },
} satisfies EventModule<Events.InteractionCreate>;
