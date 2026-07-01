import path from "node:path";
import type { BotClient } from "../client";
import { logger } from "../services/logger.service";
import type { ButtonComponent, ModalComponent, SelectMenuComponent } from "../types/component";
import { walkTsFiles } from "../utils/fileWalker";

export async function loadComponents(client: BotClient): Promise<void> {
  const componentsDir = path.join(__dirname, "..", "components");

  const buttonFiles = walkTsFiles(path.join(componentsDir, "buttons"));
  for (const file of buttonFiles) {
    const imported = (await import(file)) as { default?: ButtonComponent };
    if (imported.default?.customId) {
      client.buttons.set(imported.default.customId, imported.default);
    }
  }

  const selectFiles = walkTsFiles(path.join(componentsDir, "selects"));
  for (const file of selectFiles) {
    const imported = (await import(file)) as { default?: SelectMenuComponent };
    if (imported.default?.customId) {
      client.selectMenus.set(imported.default.customId, imported.default);
    }
  }

  const modalFiles = walkTsFiles(path.join(componentsDir, "modals"));
  for (const file of modalFiles) {
    const imported = (await import(file)) as { default?: ModalComponent };
    if (imported.default?.customId) {
      client.modals.set(imported.default.customId, imported.default);
    }
  }

  logger.info(
    `Berhasil memuat ${client.buttons.size} button, ${client.selectMenus.size} select menu, ${client.modals.size} modal.`,
  );
}
