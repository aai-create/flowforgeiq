import i18n from "@/i18n";

export function getDisplayLocale(): string {
  const lang = i18n.language;
  return lang === "en" ? "en-US" : lang;
}
