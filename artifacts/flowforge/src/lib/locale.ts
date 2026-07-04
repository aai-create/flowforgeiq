import i18n from "@/i18n";

export function getDisplayLocale(): string {
  const lang = i18n.language;
  return lang === "en" ? "en-US" : lang;
}

export function fmtCountry(code: string, locale = "en"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
