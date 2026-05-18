import React, { useState } from "react";
import {
  ShieldAlert, TrendingUp, AlertCircle, CheckCircle2, Clock,
  RefreshCw, ChevronDown, ChevronUp, Zap, DollarSign, Target,
  Calendar, Info, ArrowRight,
} from "lucide-react";
import {
  useGetShipmentPrediction,
  useGetShipmentPredictionHistory,
  useComputeShipmentPrediction,
} from "@workspace/api-client-react";
import type { ShipmentPrediction, ContributingSignal, RecommendedMitigation } from "@workspace/api-client-react";
import { shortDate } from "@/lib/adapters";

function riskColor(score: number) {
  if (score >= 70) return { gauge: "#EF4444", text: "text-red-600", light: "bg-red-50 border-red-100", label: "High Risk" };
  if (score >= 45) return { gauge: "#F59E0B", text: "text-amber-600", light: "bg-amber-50 border-amber-100", label: "Medium Risk" };
  return               { gauge: "#10B981", text: "text-emerald-600", light: "bg-emerald-50 border-emerald-100", label: "Low Risk" };
}

function RiskScoreMini({ score }: { score: number }) {
  const c = riskColor(score);
  const circumference = 2 * Math.PI * 22;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-[52px] h-[52px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="22" fill="none" stroke="#F0F4F8" strokeWidth="4" />
        <circle cx="24" cy="24" r="22" fill="none" stroke={c.gauge} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-sm font-bold leading-none ${c.text}`}>{score}</span>
      </div>
    </div>
  );
}

function SignalRow({ signal }: { signal: ContributingSignal }) {
  const isUp = signal.direction === "risk-up";
  const isDown = signal.direction === "risk-down";
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-[#F0F4F8] last:border-0">
      <div className={`mt-0.5 shrink-0 ${isUp ? "text-red-500" : isDown ? "text-emerald-500" : "text-[#9E9FAE]"}`}>
        {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : isDown ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[#212833] leading-snug">{signal.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="h-1 rounded-full overflow-hidden" style={{ width: `${signal.weight * 2.5}px`, maxWidth: 80 }}>
            <div className={`h-full rounded-full ${isUp ? "bg-red-400" : isDown ? "bg-emerald-400" : "bg-[#9E9FAE]"}`}
              style={{ width: "100%" }} />
          </div>
          <span className="text-[10px] text-[#9E9FAE]">weight {signal.weight}</span>
        </div>
      </div>
      <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
        isUp ? "bg-red-50 text-red-600 border-red-100"
        : isDown ? "bg-emerald-50 text-emerald-600 border-emerald-100"
        : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"
      }`}>
        {isUp ? "▲ risk" : isDown ? "▼ risk" : "neutral"}
      </span>
    </div>
  );
}

function MitigationCard({ m, idx }: { m: RecommendedMitigation; idx: number }) {
  return (
    <div className="p-3 bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg">
      <div className="flex items-start gap-2.5">
        <div className="w-5 h-5 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[9px] font-bold text-[#9000FF]">{idx + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-[#212833] mb-1">{m.action}</p>
          <p className="text-[11px] text-[#5E687B] leading-relaxed">{m.rationale}</p>
          {(m.estimatedCostUsd != null || m.recoveryDays != null) && (
            <div className="flex items-center gap-3 mt-1.5">
              {m.estimatedCostUsd != null && (
                <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />+${m.estimatedCostUsd.toLocaleString()} est.
                </span>
              )}
              {m.recoveryDays != null && (
                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />recovers ~{m.recoveryDays}d
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskTimeline({ history }: { history: ShipmentPrediction[] }) {
  if (history.length < 2) return null;
  const maxScore = 100;
  const sorted = [...history].sort((a, b) => new Date(a.computedAt).getTime() - new Date(b.computedAt).getTime());
  const points = sorted.map((p, i) => {
    const x = (i / (sorted.length - 1)) * 100;
    const y = 100 - (p.riskScore / maxScore) * 80 - 10;
    return { x, y, p };
  });
  const pathD = points.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");

  return (
    <div>
      <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <TrendingUp className="w-3 h-3 text-[#9000FF]" /> Risk Score Over Time
      </div>
      <div className="relative h-[70px] w-full">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9000FF" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#9000FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${pathD} L 100 100 L 0 100 Z`} fill="url(#riskGrad)" />
          <path d={pathD} fill="none" stroke="#9000FF" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {points.map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r="2.5" fill="white" stroke="#9000FF" strokeWidth="1.5"
              vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[8px] text-[#9E9FAE] px-0.5 pt-1">
          <span>{shortDate(sorted[0].computedAt)}</span>
          <span>{shortDate(sorted[sorted.length - 1].computedAt)}</span>
        </div>
      </div>
    </div>
  );
}

interface ShipmentRiskDetailProps {
  shipmentId: number;
}

export function ShipmentRiskDetail({ shipmentId }: ShipmentRiskDetailProps) {
  const { data: prediction, isLoading, refetch } = useGetShipmentPrediction(shipmentId);
  const { data: history = [] } = useGetShipmentPredictionHistory(shipmentId);
  const { mutate: recompute, isPending } = useComputeShipmentPrediction();

  const [showHistory, setShowHistory] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 px-3 text-[#9E9FAE]">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span className="text-xs">Loading risk prediction...</span>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="py-3 px-3">
        <button
          onClick={() => recompute({ id: shipmentId }, { onSuccess: () => refetch() })}
          className="text-[10px] font-semibold text-[#9000FF] hover:underline flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" /> Compute risk prediction
        </button>
      </div>
    );
  }

  const c = riskColor(prediction.riskScore);
  const signals = prediction.contributingSignals as ContributingSignal[];
  const mitigations = prediction.recommendedMitigations as RecommendedMitigation[];
  const visibleSignals = showAll ? signals : signals.slice(0, 3);

  return (
    <div className="space-y-3 text-[12px]">
      {/* Score + ETA row */}
      <div className="flex items-center gap-3 p-3 bg-[#FAFBFC] rounded-lg border border-[#E5EAF0]">
        <RiskScoreMini score={prediction.riskScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`font-bold text-sm ${c.text}`}>{c.label}</span>
            <span className="text-[10px] text-[#9E9FAE]">·</span>
            <span className="text-[10px] text-[#5E687B]">{Math.round(prediction.confidence * 100)}% confidence</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#212833]">
            <Calendar className="w-3 h-3 text-[#9000FF]" />
            <span>ETA {shortDate(prediction.predictedEtaMin)} – {shortDate(prediction.predictedEtaMax)}</span>
          </div>
        </div>
        <button
          onClick={() => recompute({ id: shipmentId }, { onSuccess: () => refetch() })}
          disabled={isPending}
          className="shrink-0 text-[#9E9FAE] hover:text-[#5E687B] transition-colors p-1">
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* History timeline */}
      {history.length >= 2 && (
        <div>
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-[#5E687B] hover:text-[#212833] transition-colors mb-2">
            <TrendingUp className="w-3 h-3 text-[#9000FF]" />
            Risk Timeline ({history.length} snapshots)
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showHistory && <RiskTimeline history={history} />}
        </div>
      )}

      {/* Contributing signals */}
      {signals.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[#9000FF]" /> Contributing Signals
          </div>
          <div className="bg-white rounded-lg border border-[#E5EAF0] px-3">
            {visibleSignals.map((s, i) => <SignalRow key={i} signal={s} />)}
          </div>
          {signals.length > 3 && (
            <button onClick={() => setShowAll(!showAll)}
              className="mt-1 text-[10px] text-[#9000FF] hover:underline flex items-center gap-1">
              {showAll ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> {signals.length - 3} more signal{signals.length - 3 !== 1 ? "s" : ""}</>}
            </button>
          )}
        </div>
      )}

      {/* Recommended mitigations */}
      {mitigations.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <Target className="w-3 h-3 text-[#9000FF]" /> Recommended Actions
          </div>
          <div className="space-y-2">
            {mitigations.map((m, i) => <MitigationCard key={i} m={m} idx={i} />)}
          </div>
        </div>
      )}

      <div className="text-[10px] text-[#9E9FAE] flex items-center gap-1">
        <Info className="w-3 h-3" />
        Last computed {shortDate(prediction.computedAt)}
      </div>
    </div>
  );
}
