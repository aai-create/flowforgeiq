import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { NavSidebar } from "@/components/NavSidebar";
import { GlobalHeader } from "@/components/GlobalHeader";
import {
  Smartphone,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Share,
  MessageCircle,
  Key,
  ArrowRight,
  Download,
  AlertCircle,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const SHORTCUT_FILE_URL = `${basePath}/api/shortcuts/capture.shortcut`;
const SHORTCUTS_REDIRECT_URL = `${window.location.origin}${basePath}/shortcuts-redirect`;

const isIOS =
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const STEPS: {
  id: string;
  num: number;
  title: string;
  body: React.ReactNode;
}[] = [
  {
    id: "get-token",
    num: 1,
    title: "Get your API token",
    body: (
      <p className="text-[12px] text-[#5E687B] leading-relaxed">
        Go to{" "}
        <a
          href="/settings?tab=channels"
          className="text-[#9000FF] font-medium hover:underline"
        >
          Settings → Chat Channels → Mobile Capture
        </a>{" "}
        and click <strong className="text-[#212833]">Generate Token</strong>.
        Copy the token — you&apos;ll paste it into the Shortcut during setup.
      </p>
    ),
  },
  {
    id: "install-shortcut",
    num: 2,
    title: "Add the Shortcut to your iPhone in one tap",
    body: isIOS ? (
      <div className="space-y-3">
        <p className="text-[12px] text-[#5E687B] leading-relaxed">
          Tap the button below to download the shortcut — iOS will automatically
          open the <strong className="text-[#212833]">Add Shortcut</strong>{" "}
          prompt. Tap <strong className="text-[#212833]">Add Shortcut</strong>{" "}
          to finish.
        </p>
        <a
          href={SHORTCUT_FILE_URL}
          download
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-lg transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Install Shortcut
        </a>
        <p className="text-[11px] text-[#9E9FAE]">
          Requires iOS 16 or later · Free · No account needed
        </p>
      </div>
    ) : (
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-lg px-3.5 py-3">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-semibold text-amber-800">iPhone only</p>
          <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
            This file only works on iPhone. Scan the QR code below with your
            iPhone camera to open the download directly on your device.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "paste-token",
    num: 3,
    title: "Enter your token and default channel when prompted",
    body: (
      <div className="space-y-2">
        <p className="text-[12px] text-[#5E687B] leading-relaxed">
          During setup, Apple Shortcuts will ask two questions:
        </p>
        <ul className="space-y-1.5 ml-2">
          <li className="text-[12px] text-[#5E687B]">
            <strong className="text-[#212833]">API Token</strong> — paste the token you copied in Step 1.
            This authenticates each forwarded message to your account via{" "}
            <code className="bg-[#F0F4F8] text-[#9000FF] px-1 py-0.5 rounded text-[11px]">Authorization: Bearer</code>.
          </li>
          <li className="text-[12px] text-[#5E687B]">
            <strong className="text-[#212833]">Default channel</strong> — type{" "}
            <code className="bg-[#F0F4F8] text-[#9000FF] px-1 py-0.5 rounded text-[11px]">whatsapp</code>,{" "}
            <code className="bg-[#F0F4F8] text-[#9000FF] px-1 py-0.5 rounded text-[11px]">imessage</code>,{" "}
            <code className="bg-[#F0F4F8] text-[#9000FF] px-1 py-0.5 rounded text-[11px]">sms</code>, or{" "}
            <code className="bg-[#F0F4F8] text-[#9000FF] px-1 py-0.5 rounded text-[11px]">wechat</code>.
            Defaults to{" "}
            <code className="bg-[#F0F4F8] text-[#9000FF] px-1 py-0.5 rounded text-[11px]">whatsapp</code>{" "}
            if left blank.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "contacts",
    num: 4,
    title: "Allow Contacts access",
    body: (
      <p className="text-[12px] text-[#5E687B] leading-relaxed">
        The Shortcut reads your Contacts to auto-detect which supplier sent the
        message. When iOS asks for Contacts permission, tap{" "}
        <strong className="text-[#212833]">Allow</strong>. Then add a note with
        the text{" "}
        <code className="bg-[#F0F4F8] text-[#9000FF] px-1 py-0.5 rounded text-[11px]">
          FlowForge
        </code>{" "}
        to each supplier&apos;s contact card so the Shortcut can route messages to
        the right shipment thread.
      </p>
    ),
  },
  {
    id: "test",
    num: 5,
    title: "Test with a real message",
    body: (
      <div className="space-y-2">
        <p className="text-[12px] text-[#5E687B] leading-relaxed">
          Open WhatsApp, iMessage, or SMS, select a message from a supplier, tap
          the{" "}
          <strong className="text-[#212833]">Share</strong> button (
          <Share className="inline w-3 h-3 text-[#5E687B]" />
          ), scroll down and choose{" "}
          <strong className="text-[#212833]">FlowForge</strong> from the share
          sheet. The Shortcut runs, extracts the chat, and posts it to your
          FlowForge inbox.
        </p>
        <p className="text-[12px] text-[#5E687B]">
          Head to{" "}
          <a
            href="/inbox"
            className="text-[#9000FF] font-medium hover:underline"
          >
            Inbox → Needs Review
          </a>{" "}
          to confirm it arrived.
        </p>
      </div>
    ),
  },
];

function StepCard({
  num,
  title,
  body,
  id,
}: {
  num: number;
  title: string;
  body: React.ReactNode;
  id: string;
}) {
  return (
    <div id={`step-${id}`} className="flex gap-4 scroll-mt-4">
      <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
        <span className="w-7 h-7 rounded-full bg-[#9000FF]/10 text-[#9000FF] text-[11px] font-bold flex items-center justify-center border border-[#9000FF]/20">
          {num}
        </span>
        {num < STEPS.length && (
          <span className="w-px flex-1 min-h-[32px] bg-[#E5EAF0]" />
        )}
      </div>
      <div className="pb-8 flex-1">
        <h3 className="text-sm font-semibold text-[#212833] mb-2">{title}</h3>
        {body}
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#E5EAF0] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#FAFBFC] hover:bg-[#F0F4F8] transition-colors text-left gap-3"
      >
        <span className="text-[12px] font-semibold text-[#212833]">{q}</span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-[#9E9FAE] shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[#9E9FAE] shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3 border-t border-[#E5EAF0] bg-white text-[12px] text-[#5E687B] leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export function ShortcutsGuide() {
  return (
    <div
      className="flex h-screen overflow-hidden bg-[#FAFBFC]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <NavSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalHeader breadcrumb="iOS Shortcut" />
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">

            {/* Hero card */}
            <div className="bg-gradient-to-br from-[#9000FF]/8 to-[#9000FF]/3 border border-[#9000FF]/20 rounded-2xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#9000FF]/10 border border-[#9000FF]/20 flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6 text-[#9000FF]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#212833] mb-1">
                    Forward supplier chats from your iPhone
                  </h1>
                  <p className="text-[13px] text-[#5E687B] leading-relaxed">
                    The FlowForge iOS Shortcut adds a one-tap share action to
                    WhatsApp, iMessage, and SMS. Tap Share → FlowForge and the
                    message lands in your inbox — extracted, routed, and ready
                    to reply to.
                  </p>
                </div>
              </div>

              {/* Supported apps */}
              <div className="mt-4 flex flex-wrap gap-2">
                {["WhatsApp", "iMessage", "SMS", "Telegram"].map((app) => (
                  <span
                    key={app}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#9000FF]/20 bg-white text-[11px] font-medium text-[#5E687B]"
                  >
                    <MessageCircle className="w-3 h-3 text-[#9000FF]" />
                    {app}
                  </span>
                ))}
              </div>
            </div>

            {/* Step-by-step */}
            <div className="bg-white border border-[#E5EAF0] rounded-xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1 h-5 bg-[#9000FF] rounded-full shrink-0" />
                <h2 className="text-sm font-bold text-[#212833]">
                  Setup guide
                </h2>
              </div>

              <div>
                {STEPS.map((step) => (
                  <StepCard key={step.id} {...step} />
                ))}
              </div>

              {/* CTA at bottom of steps */}
              <div className="mt-2 p-4 bg-[#F7F9FA] rounded-xl border border-[#E5EAF0]">
                {isIOS ? (
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    <div>
                      <p className="text-[12px] font-semibold text-[#212833]">
                        Ready to install?
                      </p>
                      <p className="text-[11px] text-[#9E9FAE] mt-0.5">
                        Tap to download — iOS opens the Add Shortcut prompt automatically.
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <a
                        href={SHORTCUT_FILE_URL}
                        download
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-lg transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Install Shortcut
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 mb-4">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-semibold text-amber-800">
                        iPhone required
                      </p>
                      <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                        The FlowForge Shortcut only works on iPhone. Scan the QR
                        code below with your iPhone camera to open the download
                        directly on your device.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-5">
                  <div className="p-2 bg-white rounded-xl border border-[#E5EAF0] shadow-sm shrink-0">
                    <QRCodeSVG
                      value={SHORTCUTS_REDIRECT_URL}
                      size={100}
                      fgColor="#9000FF"
                      bgColor="#ffffff"
                      level="M"
                    />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#212833]">
                      Scan from any device
                    </p>
                    <p className="text-[11px] text-[#5E687B] mt-1 leading-relaxed">
                      iPhone camera opens the Shortcuts app directly. Android
                      or Mac downloads the{" "}
                      <code className="bg-[#F0F4F8] text-[#9000FF] px-1 py-0.5 rounded text-[10px]">.shortcut</code>{" "}
                      file for sideloading.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-white border border-[#E5EAF0] rounded-xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-5 bg-[#9000FF] rounded-full shrink-0" />
                <h2 className="text-sm font-bold text-[#212833]">
                  Quick links
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="/settings?tab=channels"
                  className="flex items-center gap-3 p-3 border border-[#E5EAF0] rounded-lg hover:border-[#9000FF]/30 hover:bg-[#9000FF]/3 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#9000FF]/8 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4 text-[#9000FF]" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#212833]">
                      Generate API Token
                    </p>
                    <p className="text-[11px] text-[#9E9FAE]">
                      Settings → Chat Channels
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C0C8D4] ml-auto group-hover:text-[#9000FF] transition-colors" />
                </a>
                <a
                  href="/inbox"
                  className="flex items-center gap-3 p-3 border border-[#E5EAF0] rounded-lg hover:border-[#9000FF]/30 hover:bg-[#9000FF]/3 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#9000FF]/8 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4 text-[#9000FF]" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#212833]">
                      View Inbox
                    </p>
                    <p className="text-[11px] text-[#9E9FAE]">
                      Check forwarded messages
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C0C8D4] ml-auto group-hover:text-[#9000FF] transition-colors" />
                </a>
              </div>
            </div>

            {/* FAQ */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-5 bg-[#9000FF] rounded-full shrink-0" />
                <h2 className="text-sm font-bold text-[#212833]">
                  Frequently asked questions
                </h2>
              </div>
              <div className="space-y-2">
                <FaqItem
                  q="Which apps work with the Shortcut?"
                  a={
                    <>
                      Any app that supports the iOS Share Sheet — WhatsApp,
                      iMessage, SMS, Telegram, WeChat, Signal, and more. If you
                      can tap the Share icon, FlowForge will appear as an option
                      after installing the Shortcut.
                    </>
                  }
                />
                <FaqItem
                  q="Why does it need Contacts access?"
                  a={
                    <>
                      The Shortcut reads your contact list to identify which
                      supplier sent the message and automatically routes it to
                      the correct shipment thread. It never stores or uploads
                      your contacts — the lookup happens entirely on-device.
                    </>
                  }
                />
                <FaqItem
                  q="My message ended up in 'Needs Review'. What does that mean?"
                  a={
                    <>
                      It means FlowForge couldn&apos;t automatically match the
                      message to a shipment — usually because the supplier
                      isn&apos;t tagged in your Contacts yet. Open{" "}
                      <a
                        href="/inbox"
                        className="text-[#9000FF] hover:underline font-medium"
                      >
                        Inbox → Needs Review
                      </a>
                      , select the message, and assign it to the right shipment.
                      Once tagged, future messages from that supplier route
                      automatically.
                    </>
                  }
                />
                <FaqItem
                  q="Can I regenerate my token if it's compromised?"
                  a={
                    <>
                      Yes. Go to{" "}
                      <a
                        href="/settings?tab=channels"
                        className="text-[#9000FF] hover:underline font-medium"
                      >
                        Settings → Chat Channels → Mobile Capture
                      </a>{" "}
                      and click <strong>Generate Token</strong> to issue a new
                      one. The old token is immediately invalidated. You&apos;ll need
                      to update the token inside the Shortcut — open the{" "}
                      <strong>FlowForge</strong> shortcut in the Shortcuts app,
                      tap the first action (the text with your token), and
                      replace it with the new value.
                    </>
                  }
                />
                <FaqItem
                  q="I don't see FlowForge in my share sheet."
                  a={
                    <>
                      Scroll all the way down in the share sheet and tap{" "}
                      <strong>More</strong> (the three dots). Find{" "}
                      <strong>FlowForge</strong> in the Shortcuts list and enable
                      it. You can also add it to your favourites for quicker
                      access. If it still doesn&apos;t appear, re-run the
                      Shortcut from the Shortcuts app once to register it with
                      the share sheet.
                    </>
                  }
                />
              </div>
            </div>

            {/* Footer nudge */}
            <p className="text-center text-[11px] text-[#C0C8D4]">
              Need help?{" "}
              <a href="/help" className="text-[#9000FF] hover:underline">
                Visit the Help centre
              </a>
            </p>

            <div className="h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShortcutsGuide;
