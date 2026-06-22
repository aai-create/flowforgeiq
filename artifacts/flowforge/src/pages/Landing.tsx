import { useLocation } from "wouter";
import { ArrowRight, Package, MessageSquare, ShieldCheck } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function LandingPage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col items-center justify-center px-4" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-md text-center">
        <div className="flex items-center gap-2 justify-center mb-10">
          <div className="w-9 h-9 rounded-[7px] overflow-hidden shrink-0">
            <img src={`${basePath}/flowforge-logo.svg`} alt="FlowForgeIQ" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-[#9000FF]">FlowForge IQ</span>
        </div>

        <h1 className="text-2xl font-bold text-[#212833] mb-3 leading-snug">
          Supply-chain communication, unified
        </h1>
        <p className="text-sm text-[#5E687B] mb-8 leading-relaxed">
          One inbox for buyer↔supplier messages across email, WhatsApp, and WeChat —
          with shipment tracking, AI-drafted replies, and team collaboration.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: MessageSquare, label: "Unified inbox", desc: "All channels, one place" },
            { icon: Package, label: "Shipment tracking", desc: "Stage by stage" },
            { icon: ShieldCheck, label: "Risk radar", desc: "Catch issues early" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white border border-[#E5EAF0] rounded-xl p-3 text-left">
              <Icon className="w-4 h-4 text-[#9000FF] mb-2" />
              <div className="text-[11px] font-bold text-[#212833]">{label}</div>
              <div className="text-[10px] text-[#9E9FAE]">{desc}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/sign-in")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#9000FF] hover:bg-[#7A00D9] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Sign in to FlowForgeIQ
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
