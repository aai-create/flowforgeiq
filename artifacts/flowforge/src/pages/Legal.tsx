import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { LegalLinks } from "@/components/LegalLinks";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
export const PRIVACY_VERSION = "2026-08-25-v1";
export const TERMS_VERSION = "2026-08-25-v1";

function LegalShell({ kind, title, children }: { kind: "privacy" | "terms"; title: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} | FlowForgeIQ`;
    const canonical = document.querySelector<HTMLLinkElement>("link[rel='canonical']") ?? document.head.appendChild(Object.assign(document.createElement("link"), { rel: "canonical" }));
    canonical.href = `${window.location.origin}${basePath}/${kind}`;
    return () => { document.title = "FlowForgeIQ"; };
  }, [kind, title]);
  return (
    <main className="min-h-screen bg-[#FAFBFC] text-[#212833]" style={{ fontFamily: "Inter, sans-serif" }}>
      <header className="border-b border-[#E5EAF0] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-bold tracking-tight text-[#9000FF]">FlowForgeIQ</Link>
          <LegalLinks />
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          <strong>Review-ready draft:</strong> This document is provided for owner and counsel review and is not legal advice or a statement that legal approval has been completed.
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-[#5E687B]">FlowForgeIQ Inc. · Effective August 25, 2026 · Last updated / version {kind === "privacy" ? PRIVACY_VERSION : TERMS_VERSION}</p>
        <div className="legal-body mt-10 space-y-8 text-[15px] leading-7">{children}</div>
        <div className="mt-12 border-t border-[#E5EAF0] pt-6 text-sm text-[#5E687B]">
          Questions or review comments: <a className="text-[#9000FF] hover:underline" href="mailto:privacy@flowforgeiq.com">privacy@flowforgeiq.com</a>
          <LegalLinks className="mt-3 justify-start" />
        </div>
      </article>
    </main>
  );
}
const Section = ({ title, children }: { title: string; children: ReactNode }) => <section><h2 className="mb-2 text-xl font-bold">{title}</h2>{children}</section>;

export function PrivacyPolicy() {
  return <LegalShell kind="privacy" title="Privacy Policy">
    <Section title="1. Scope"><p>This Privacy Policy describes how FlowForgeIQ Inc. handles information in FlowForgeIQ, our early-access sourcing and shipment operations product. It applies to the web application and related account features.</p></Section>
    <Section title="2. Information we handle"><p>Depending on how you use the product, we handle account and workspace information such as your name, email address, role, invitations, and workspace membership; shipment and trade information such as purchase orders, suppliers, buyers, quantities, pricing, dates, destinations, payment records, and risk or status information; and user content such as messages, notes, uploaded documents, document metadata, and files you choose to process.</p><p className="mt-3">We also receive usage and log information needed to operate, secure, troubleshoot, and improve the service, such as requests, actions, device or browser context, and error events. Please do not submit secrets or information that the product does not need.</p></Section>
    <Section title="3. How we use information"><p>We use this information to provide workspaces, authenticate accounts, process invitations, organize shipments and communications, extract and display document information, provide analytics and operational reports, maintain security, diagnose failures, and communicate about the service.</p></Section>
    <Section title="4. AI and copilot processing"><p>When you use extraction, risk, drafting, search, or copilot features, relevant messages, documents, shipment details, and prompts may be processed by the AI functionality to return the requested result. AI output can be incomplete or incorrect; review it before relying on it or sending a message. Do not use the product to make decisions that require guaranteed accuracy.</p></Section>
    <Section title="5. Sharing and service boundaries"><p>We disclose information only as needed to operate features you request, protect the service, comply with law, or support a business change. This draft does not make a complete list of subprocessors, international transfer mechanisms, retention periods, cookie practices, regulated-data commitments, or jurisdiction-specific rights. Those items remain for owner and legal review before publication.</p></Section>
    <Section title="6. Your choices and contact"><p>You control the content you upload and can contact us with privacy questions or review requests at privacy@flowforgeiq.com. We will evaluate requests and applicable obligations based on the account and information involved; this draft does not promise a particular response time or deletion SLA.</p></Section>
    <Section title="7. Updates"><p>We may update this policy as the product or legal review changes. The version and last-updated label above identify the copy presented at the time of acceptance.</p></Section>
  </LegalShell>;
}
export function TermsOfService() {
  return <LegalShell kind="terms" title="Terms of Service">
    <Section title="1. Agreement and beta status"><p>These Terms govern access to FlowForgeIQ, provided by FlowForgeIQ Inc. FlowForgeIQ is in beta / early access. Features may change, be unavailable, or contain defects. This review-ready draft is not legal advice and is not represented as approved by counsel.</p></Section>
    <Section title="2. Account access and invitations"><p>You are responsible for accurate account information, protecting access to your account, and activity under it. Invitations are intended for the named email address and may expire or be revoked. You must not use another person’s invitation or attempt to bypass workspace access controls.</p></Section>
    <Section title="3. User content and acceptable use"><p>You retain responsibility for messages, documents, shipment data, pricing, and other content you submit. You must have the rights and permissions needed to submit and share it. Do not use the service to violate law or another person’s rights, upload malicious code or secrets, probe or disrupt the service, evade limits, impersonate others, or misuse private workspace information.</p></Section>
    <Section title="4. AI limitations"><p>AI-generated extraction, recommendations, risk indicators, drafts, and copilot responses are assistive only. They are not professional, legal, financial, logistics, compliance, or safety advice, and do not replace your review or independent decisions. You are responsible for actions taken from outputs.</p></Section>
    <Section title="5. Disclaimers and beta limitations"><p>To the extent permitted by law, the beta service is provided on an “as is” and “as available” basis. We do not promise uninterrupted availability, error-free results, or that the service will meet every operational need. This section is intentionally conservative and remains subject to legal review.</p></Section>
    <Section title="6. Suspension and termination"><p>We may suspend or terminate access for misuse, security risk, legal reasons, or changes to the beta program. You may stop using the service at any time. Provisions that by their nature should continue, including responsibility for submitted content and limitations, may continue after access ends.</p></Section>
    <Section title="7. Updates and contact"><p>We may update these Terms as the product or legal review changes. The version and last-updated label above identify the copy presented at the time of acceptance. Questions or comments may be sent to privacy@flowforgeiq.com.</p></Section>
  </LegalShell>;
}