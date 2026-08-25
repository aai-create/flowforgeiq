import { useTranslation } from "react-i18next";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function LegalLinks({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("legal.legalNavigation")} className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs ${className}`}>
      <a href={`${basePath}/privacy`} className="text-[#9000FF] hover:underline">{t("legal.privacyLink")}</a>
      <span className="text-[#C0C8D4]" aria-hidden="true">·</span>
      <a href={`${basePath}/terms`} className="text-[#9000FF] hover:underline">{t("legal.termsLink")}</a>
    </nav>
  );
}