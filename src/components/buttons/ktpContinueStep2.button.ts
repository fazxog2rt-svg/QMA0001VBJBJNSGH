import type { ButtonComponent } from "../../types/component";
import { buildKtpStep2Modal } from "../../services/ktp/ktpModals";

const component: ButtonComponent = {
  customId: "ktp:continue-step2",
  execute: async (interaction) => {
    await interaction.showModal(buildKtpStep2Modal());
  },
};

export default component;
