import React, { useState } from "react";
import { useLocation } from "wouter";
import { NavSidebar } from "@/components/NavSidebar";
import {
  ShieldAlert, DollarSign, AlertCircle, Clock,
  ChevronRight, RefreshCw, Info, BarChart3,
  ArrowUpRight, CheckCircle2, Search,
  Inbox, Package, Target, Calendar, Zap,
  HelpCircle,
} from "lucide-react";
import { Link } from "wouter";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useGetRiskRadar, useGetPredictionAccuracy } from "@workspace/api-client-react";
import type { RiskRadarItem } from "@workspace/api-client-react";
import { shortDate } from "@/lib/adapters";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

function riskColor(score: number) {
  if (score >= 70) return { bg: "bg-red-500",   text: "text-red-600",   light: "bg-red-50 border-red-100",   badge: "bg-red-50 text-red-700 border-red-100" };
  if (score >= 45) return { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50 border-amber-100", badge: "bg-amber-50 text-amber-700 border-amber-100" };
  return               { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50 border-emerald-100", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" };
}

function riskLabel(score: number) {
  if (score >= 70) return "High";
  if (score >= 45) return "Medium";
  return "Low";
}

function fmt(usd: number) {
  if (usd >= 100_000) return `$${(usd / 1000).toFixed(0)}k`;
  if (usd >= 10_000)  return `$${(usd / 1000).toFixed(1)}k`;
  return `$${usd.toLocaleString()}`;
}

function RiskGauge({ score }: { score: number }) {
  const c = riskColor(score);
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-[72px] h-[72px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="#F0F4F8" strokeWidth="5" />
        <circle cx="32" cy="32" r="28" fill="none"
          stroke={score >= 70 ? "#EF4444" : score >= 45 ? "#F59E0B" : "#10B981"}
          strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold leading-none ${c.text}`}>{score}</span>
        <span className="text-[8px] text-[#9E9FAE] font-medium mt-0.5">risk</span>
      </div>
    </div>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-[#F0F4F8] rounded-full overflow-hidden">
        <div className="h-full bg-[#9000FF]/40 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-[#5E687B] shrink-0">{pct}%</span>
    </div>
  );
}

export function RiskRadar({ onNavigateToShipment }: { onNavigateToShipment?: (po: string) => void }) {
  const [location, navigate] = useLocation();
  const { data: radarData, isLoading: radarLoading, refetch } = useGetRiskRadar();
  const { data: accuracyData, isLoading: accuracyLoading } = useGetPredictionAccuracy();

  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"exposure" | "score">("exposure");
  const [selectedItem, setSelectedItem] = useState<RiskRadarItem | null>(null);

  const items = radarData?.items ?? [];

  const filtered = items.filter(i => {
    const rLevel = riskLabel(i.riskScore).toLowerCase() as "high" | "medium" | "low";
    if (filter !== "all" && rLevel !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.poNumber.toLowerCase().includes(q)
        || i.product.toLowerCase().includes(q)
        || i.supplierName.toLowerCase().includes(q)
        || i.customerName.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === "score") return b.riskScore - a.riskScore;
    return b.riskExposureUsd - a.riskExposureUsd;
  });

  const highCount = items.filter(i => i.riskScore >= 70).length;
  const medCount  = items.filter(i => i.riskScore >= 45 && i.riskScore < 70).length;
  const lowCount  = items.filter(i => i.riskScore < 45).length;

  return (
    <div className="h-full flex bg-[#FAFBFC] overflow-hidden" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>

      <NavSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="shrink-0 bg-white border-b border-[#E5EAF0] px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9000FF] to-[#B040FF] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#212833]">Risk Radar</h1>
              <p className="text-[11px] text-[#5E687B]">Portfolio risk ranked by financial exposure × probability</p>
            </div>
          </div>
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#5E687B] hover:text-[#212833] border border-[#E5EAF0] px-3 py-1.5 rounded-md hover:bg-[#F0F4F8] transition-colors">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-[#9000FF]" />
              <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide">Risk Exposure</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-[#C0C8D4] hover:text-[#9000FF] transition-colors ml-auto">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 text-[12px]" align="end">
                  <p className="font-semibold text-[#212833] mb-1">Risk Exposure</p>
                  <p className="text-[#5E687B] leading-relaxed">Total financial exposure weighted by each shipment's risk score — the higher the risk score, the more of the PO value is counted. Use this to prioritise which delays to address first.</p>
                  <Link to="/help#handle-delays" className="mt-2 inline-flex items-center gap-1 text-[#9000FF] hover:underline text-[11px] font-medium">
                    Learn more →
                  </Link>
                </PopoverContent>
              </Popover>
            </div>
            <div className="text-xl font-bold text-[#212833]">{fmt(radarData?.totalExposureUsd ?? 0)}</div>
            <div className="text-[10px] text-[#5E687B] mt-0.5">weighted by risk score</div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">High Risk</span>
            </div>
            <div className="text-xl font-bold text-red-600">{highCount}</div>
            <div className="text-[10px] text-red-500 mt-0.5">shipments score ≥70</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Medium Risk</span>
            </div>
            <div className="text-xl font-bold text-amber-600">{medCount}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">shipments score 45–69</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">On Track</span>
            </div>
            <div className="text-xl font-bold text-emerald-600">{lowCount}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">shipments score &lt;45</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* Left: Shipment list */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-[#E5EAF0]">
          {/* Filters */}
          <div className="shrink-0 px-4 py-3 bg-white border-b border-[#E5EAF0] flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9FAE]" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search PO, product, supplier..."
                className="w-full h-8 bg-[#F0F4F8] border border-transparent rounded-md pl-8 pr-3 text-[12px] focus:outline-none focus:border-[#9000FF]/30 focus:bg-white transition-colors" />
            </div>
            <div className="flex items-center gap-1">
              {(["all", "high", "medium", "low"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    filter === f
                      ? f === "all"    ? "bg-[#212833] text-white border-[#212833]"
                        : f === "high"   ? "bg-red-500 text-white border-red-500"
                        : f === "medium" ? "bg-amber-500 text-white border-amber-500"
                        : "bg-emerald-500 text-white border-emerald-500"
                      : "bg-white text-[#5E687B] border-[#E5EAF0] hover:border-[#D6E3EB]"
                  }`}>
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 text-[11px] text-[#5E687B]">
              <span>Sort:</span>
              <button onClick={() => setSortBy("exposure")}
                className={`px-2 py-1 rounded border text-[10px] font-semibold transition-colors ${sortBy === "exposure" ? "bg-[#9000FF]/10 text-[#9000FF] border-[#9000FF]/20" : "border-[#E5EAF0] hover:bg-[#F0F4F8]"}`}>
                Exposure
              </button>
              <button onClick={() => setSortBy("score")}
                className={`px-2 py-1 rounded border text-[10px] font-semibold transition-colors ${sortBy === "score" ? "bg-[#9000FF]/10 text-[#9000FF] border-[#9000FF]/20" : "border-[#E5EAF0] hover:bg-[#F0F4F8]"}`}>
                Risk Score
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {radarLoading && (
                <div className="flex items-center justify-center py-12 text-[#9E9FAE] gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Computing risk predictions...</span>
                </div>
              )}
              {!radarLoading && filtered.length === 0 && (
                <div className="text-center py-12 text-[#9E9FAE] text-sm">No shipments match the current filter.</div>
              )}
              {filtered.map((item, rank) => {
                const c = riskColor(item.riskScore);
                const isSelected = selectedItem?.shipmentId === item.shipmentId;
                return (
                  <div key={item.shipmentId}
                    onClick={() => setSelectedItem(isSelected ? null : item)}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${isSelected ? "border-[#9000FF]/30 shadow-md bg-[#FAFBFF]" : "border-[#E5EAF0] bg-white hover:border-[#D6E3EB] hover:shadow-sm"}`}>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 w-8 shrink-0">
                        <span className="text-[11px] font-bold text-[#9E9FAE] w-5 text-right">#{rank + 1}</span>
                      </div>
                      <RiskGauge score={item.riskScore} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border bg-[#FAFBFC] text-[#5E687B] border-[#E5EAF0]">
                            {item.poNumber}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>
                            {riskLabel(item.riskScore)} Risk
                          </span>
                          <span className="text-[10px] bg-[#F0F4F8] text-[#5E687B] border border-[#E5EAF0] px-1.5 py-0.5 rounded font-medium">
                            {item.customerName}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#212833] truncate mb-1">{item.product}</p>
                        <div className="flex items-center gap-3 text-[11px] text-[#5E687B]">
                          <span className="flex items-center gap-1"><Target className="w-3 h-3" />{item.supplierName}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {shortDate(item.predictedEtaMin)}–{shortDate(item.predictedEtaMax)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5E687B] mt-1 line-clamp-1 italic">"{item.topSignal}"</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-base font-bold text-[#212833]">{fmt(item.riskExposureUsd)}</div>
                        <div className="text-[10px] text-[#5E687B]">risk exposure</div>
                        <div className="text-[10px] text-[#9E9FAE] mt-0.5">{fmt(item.financialExposureUsd)} total</div>
                        <ConfidenceBar confidence={item.confidence} />
                      </div>
                      <ChevronRight className={`w-4 h-4 text-[#9E9FAE] shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    </div>

                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-[#E5EAF0]">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-[#9000FF]" /> Top Risk Signal
                            </div>
                            <div className="p-2.5 bg-[#FAFBFC] rounded-lg border border-[#E5EAF0] text-[12px] text-[#212833]">
                              {item.topSignal}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#9000FF]" /> Predicted ETA Range
                            </div>
                            <div className="p-2.5 bg-[#FAFBFC] rounded-lg border border-[#E5EAF0] text-[12px] text-[#212833]">
                              {shortDate(item.predictedEtaMin)} – {shortDate(item.predictedEtaMax)}
                              <span className="text-[11px] text-[#9E9FAE] ml-1">({Math.round(item.confidence * 100)}% conf.)</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); onNavigateToShipment?.(String(item.shipmentId)); }}
                            className="text-[10px] bg-[#9000FF] text-white px-3 py-1.5 rounded-md font-semibold hover:bg-[#7A00D9] transition-colors flex items-center gap-1.5">
                            <ArrowUpRight className="w-3 h-3" /> Open Shipment
                          </button>
                          <span className="text-[10px] text-[#9E9FAE]">
                            Computed {shortDate(item.computedAt)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Accuracy panel */}
        <div className="w-[300px] shrink-0 flex flex-col bg-white overflow-hidden">
          <div className="h-10 border-b border-[#E5EAF0] flex items-center px-4 shrink-0">
            <span className="text-[11px] font-bold text-[#212833] uppercase tracking-wide flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[#9000FF]" /> Model Accuracy
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {accuracyLoading ? (
                <div className="flex items-center justify-center py-8 text-[#9E9FAE] gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : accuracyData ? (
                <>
                  {/* Headline metrics */}
                  <div className="space-y-2">
                    <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#E5EAF0]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-semibold text-[#212833]">Within 3 days</span>
                        <span className="text-sm font-bold text-[#9000FF]">{accuracyData.overallWithinThreeDaysPct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#E5EAF0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#9000FF] rounded-full" style={{ width: `${accuracyData.overallWithinThreeDaysPct}%` }} />
                      </div>
                    </div>
                    <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#E5EAF0]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-semibold text-[#212833]">Within 7 days</span>
                        <span className="text-sm font-bold text-emerald-600">{accuracyData.overallWithinSevenDaysPct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#E5EAF0] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${accuracyData.overallWithinSevenDaysPct}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Bucket breakdown */}
                  <div>
                    <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wide mb-2">By Lead Time</div>
                    <div className="space-y-2">
                      {accuracyData.buckets.map(b => {
                        const within3Pct = b.totalPredictions > 0 ? Math.round((b.withinThreeDayCount / b.totalPredictions) * 100) : 0;
                        return (
                          <div key={b.leadTimeDays} className="flex items-center gap-2 text-[11px]">
                            <span className="text-[#5E687B] w-20 shrink-0">{b.leadTimeDays}</span>
                            <div className="flex-1 h-1.5 bg-[#F0F4F8] rounded-full overflow-hidden">
                              <div className="h-full bg-[#9000FF]/60 rounded-full" style={{ width: `${within3Pct}%` }} />
                            </div>
                            <span className="text-[#212833] font-semibold w-8 text-right">{within3Pct}%</span>
                            <span className="text-[#9E9FAE] text-[10px]">({b.totalPredictions})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg">
                      <div className="text-base font-bold text-[#212833]">{accuracyData.totalPredictions}</div>
                      <div className="text-[9px] text-[#5E687B]">total predictions</div>
                    </div>
                    <div className="p-2 bg-[#FAFBFC] border border-[#E5EAF0] rounded-lg">
                      <div className="text-base font-bold text-[#212833]">{accuracyData.resolvedPredictions}</div>
                      <div className="text-[9px] text-[#5E687B]">resolved POs</div>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg flex gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700 leading-relaxed">{accuracyData.disclaimer}</p>
                  </div>
                </>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </div>
      </div>
    </div>
  );
}
