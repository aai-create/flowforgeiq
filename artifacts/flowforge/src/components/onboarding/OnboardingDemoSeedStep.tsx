import React, { useState } from "react";
import { Inbox, Loader2, Sparkles } from "lucide-react";

interface OnboardingDemoSeedStepProps {
  supplierId: number | null;
  buyerId: number | null;
  supplierName: string;
  buyerName: string;
  onComplete: () => void;
}

export function OnboardingDemoSeedStep({
  supplierId,
  buyerId,
  supplierName,
  buyerName,
  onComplete,
}: OnboardingDemoSeedStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSeed = supplierId != null && buyerId != null;

  const handleSeed = async () => {
    if (!canSeed) {
      onComplete();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/seed-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ supplierId, buyerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error((data as { error?: string }).error ?? `Server error ${res.status}`);
      }
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="px-8 py-7">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
          <Inbox className="w-4.5 h-4.5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#212833]">See your inbox in action</h2>
          <p className="text-xs text-[#5E687B] mt-0.5">Populate your inbox with realistic demo messages.</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#F8F4FF] to-[#F0EEFF] rounded-xl border border-[#E5D9FF] p-5 mb-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-[#9000FF] mt-0.5 shrink-0" />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-[#212833]">What we'll add to your inbox</p>
            <ul className="space-y-1 text-xs text-[#5E687B]">
              {[
                "A WhatsApp message from your supplier confirming the PO",
                "An email with a proforma invoice and payment terms",
                "A WeChat message requesting sample approval",
                "A QC report email with inspection results",
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-[#9000FF] mt-0.5 shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
            {canSeed && (
              <p className="text-[10px] text-[#9E9FAE] pt-1 border-t border-[#E5D9FF]">
                Linked to:{" "}
                <span className="font-semibold text-[#5E687B]">{supplierName}</span>
                {buyerName && (
                  <> → <span className="font-semibold text-[#5E687B]">{buyerName}</span></>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {!canSeed && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs text-amber-700">
            You skipped the supplier or buyer step. Demo messages will still be created but won't be linked to a specific supplier.
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <button
        onClick={handleSeed}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#7C3AED,#5B21B6)" }}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Populating inbox…</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Populate inbox with demo messages</>
        )}
      </button>
    </div>
  );
}
