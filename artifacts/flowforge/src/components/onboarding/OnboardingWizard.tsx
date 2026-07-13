import React, { useState, useCallback } from "react";
import { X, ChevronLeft } from "lucide-react";
import { useOnboardingState } from "@/hooks/useOnboardingState";
import { OnboardingSupplierStep } from "./OnboardingSupplierStep";
import { OnboardingBuyerStep } from "./OnboardingBuyerStep";
import { OnboardingDemoSeedStep } from "./OnboardingDemoSeedStep";

interface OnboardingWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = [
  { id: "welcome",  label: "Welcome"  },
  { id: "supplier", label: "Supplier" },
  { id: "buyer",    label: "Buyer"    },
  { id: "demo",     label: "Inbox"    },
];

export function OnboardingWizard({ onClose, onComplete }: OnboardingWizardProps) {
  const { state, markStep, markComplete } = useOnboardingState();
  const [step, setStep] = useState(state.step < 4 ? state.step : 0);
  const [supplierId, setSupplierId] = useState<number | null>(state.supplierId);
  const [buyerId, setBuyerId] = useState<number | null>(state.buyerId);
  const [supplierName, setSupplierName] = useState<string>("");
  const [buyerName, setBuyerName] = useState<string>("");

  const goBack = useCallback(() => {
    setStep(s => Math.max(0, s - 1));
  }, []);

  const handleNext = useCallback(() => {
    setStep(s => {
      const next = s + 1;
      markStep(next);
      return next;
    });
  }, [markStep]);

  const handleSupplierCreated = useCallback((id: number, name: string) => {
    setSupplierId(id);
    setSupplierName(name);
    markStep(2, { supplierId: id });
    setStep(2);
  }, [markStep]);

  const handleBuyerCreated = useCallback((id: number, name: string) => {
    setBuyerId(id);
    setBuyerName(name);
    markStep(3, { buyerId: id });
    setStep(3);
  }, [markStep]);

  const handleDemoComplete = useCallback(() => {
    markComplete();
    onComplete();
  }, [markComplete, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div
        className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "min(90vh, 640px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md overflow-hidden shrink-0">
              <img src="/flowforge-logo.png" alt="FlowForgeIQ" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm text-[#9000FF]">FlowForgeIQ</span>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-5 h-2 bg-[#9000FF]"
                    : i < step
                    ? "w-2 h-2 bg-[#9000FF]/40"
                    : "w-2 h-2 bg-[#E5EAF0]"
                }`}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9E9FAE] hover:text-[#5E687B] hover:bg-[#F0F4F8] transition-colors"
            aria-label="Skip tutorial"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(min(90vh, 640px) - 140px)" }}>
          {step === 0 && <WelcomeStep onNext={handleNext} onSkip={onClose} />}
          {step === 1 && (
            <OnboardingSupplierStep
              onCreated={handleSupplierCreated}
            />
          )}
          {step === 2 && (
            <OnboardingBuyerStep
              onCreated={handleBuyerCreated}
            />
          )}
          {step === 3 && supplierId != null && buyerId != null && (
            <OnboardingDemoSeedStep
              supplierId={supplierId}
              buyerId={buyerId}
              supplierName={supplierName}
              buyerName={buyerName}
              onComplete={handleDemoComplete}
            />
          )}
          {step === 3 && (supplierId == null || buyerId == null) && (
            <div className="px-8 py-10 text-center">
              <p className="text-sm text-[#5E687B]">Please go back and create both a supplier and a buyer before this step.</p>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5EAF0] bg-[#FAFBFC]">
          {step > 0 ? (
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-xs font-medium text-[#5E687B] hover:text-[#212833] transition-colors"
            >
              <ChevronLeft size={13} />
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="text-xs text-[#9E9FAE] hover:text-[#5E687B] transition-colors"
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="px-8 py-8 text-center">
      <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg mx-auto mb-5" style={{ background: "linear-gradient(135deg,#7C3AED,#5B21B6)" }}>
        <img src="/flowforge-logo.png" alt="FlowForgeIQ" className="w-full h-full object-contain p-2" />
      </div>
      <h2 className="text-xl font-bold text-[#212833] mb-2">Welcome to FlowForge</h2>
      <p className="text-sm text-[#5E687B] leading-relaxed mb-6 max-w-sm mx-auto">
        Your supply-chain communication hub — manage supplier messages, track shipments, and handle payments all in one place.
      </p>
      <div className="text-left space-y-2.5 mb-8 max-w-sm mx-auto">
        {[
          { icon: "📥", text: "Unified inbox for email, WhatsApp, WeChat & SMS" },
          { icon: "📦", text: "Stage-by-stage shipment tracking from quote to delivery" },
          { icon: "✨", text: "AI-drafted replies and action suggestions" },
        ].map(item => (
          <div key={item.text} className="flex items-center gap-3">
            <span className="text-base shrink-0">{item.icon}</span>
            <span className="text-sm text-[#5E687B]">{item.text}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        className="w-full max-w-sm py-3 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
        style={{ background: "linear-gradient(135deg,#7C3AED,#5B21B6)" }}
      >
        Let&apos;s set up your workspace →
      </button>
    </div>
  );
}
