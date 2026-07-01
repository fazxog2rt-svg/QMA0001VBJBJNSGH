import type {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js";
import type { BotClient } from "../client";

/** customId prefix matching: "ticket:open" matches component id "ticket:open" or "ticket:open:123". */
export interface ButtonComponent {
  customId: string;
  execute: (interaction: ButtonInteraction, client: BotClient) => Promise<void>;
}

export interface SelectMenuComponent {
  customId: string;
  execute: (interaction: StringSelectMenuInteraction, client: BotClient) => Promise<void>;
}

export interface ModalComponent {
  customId: string;
  execute: (interaction: ModalSubmitInteraction, client: BotClient) => Promise<void>;
}
