import path from "node:path";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import { DEFAULT_LOCALE } from "../config/constants";

export async function initLocales(): Promise<void> {
  await i18next.use(Backend).init({
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    ns: ["translation"],
    defaultNS: "translation",
    backend: {
      loadPath: path.join(__dirname, "..", "locales", "{{lng}}.json"),
    },
    interpolation: { escapeValue: false },
  });
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options);
}
