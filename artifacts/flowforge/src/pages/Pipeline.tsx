import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import { NavSidebar } from "@/components/NavSidebar";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useGetPipelineReport, useListStages } from "@workspace/api-client-react";
import type { PipelineAgentSummary } from "@workspace/api-client-react";
import { adaptShipments, adaptStages } from "@/lib/adapters";
import { useMyRole } from "@/lib/useCurrentUser";
import { ArrowLeft, ArrowRight, Users, Package, DollarSign, TrendingUp } from "lucide-react";

function fmtUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 100_000) return `$${(n / 1000).toFixed(0)}k`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n: number | null) {
  return n == null ? "—" : `${n.toFixed(1)}%`;
}

function StageBreakdownBar({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = Object.entries(breakdown).filter(([, c]) => c > 0);
  const total = entries.reduce((sum, [, c]) => sum + c, 0);
  if (total === 0) return <span className="text-[11px] text-[#9E9FAE]">No active shipments</span>;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {entries.map(([stageId, count]) => (
        <span
          key={stageId}
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F0F4F8] text-[#5E687B] border border-[#E5EAF0]"
          title={stageId}
        >
          {stageId}: {count}
        </span>
      ))}
    </div>
  );
}

function AgentSummaryTable({
  agents,
  onSelectAgent,
}: {
  agents: PipelineAgentSummary[];
  onSelectAgent: (agent: PipelineAgentSummary) => void;
}) {
  if (agents.length === 0) {
    return <p className="text-sm text-[#9E9FAE] py-8 text-center">No shipments found.</p>;
  }

  const totalShipments = agents.reduce((s, a) => s + a.shipmentCount, 0);
  const totalValue = agents.reduce((s, a) => s + a.totalValueUsd, 0);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="border border-[#E5EAF0] rounded-lg p-3 bg-white">
          <div className="flex items-center gap-1.5 mb-1 text-[#9000FF]">
            <Users className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Agents</span>
          </div>
          <div className="text-xl font-bold text-[#212833]">{agents.length}</div>
        </div>
        <div className="border border-[#E5EAF0] rounded-lg p-3 bg-white">
          <div className="flex items-center gap-1.5 mb-1 text-[#9000FF]">
            <Package className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Shipments</span>
          </div>
          <div className="text-xl font-bold text-[#212833]">{totalShipments}</div>
        </div>
        <div className="border border-[#E5EAF0] rounded-lg p-3 bg-white">
          <div className="flex items-center gap-1.5 mb-1 text-[#9000FF]">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Total Value</span>
          </div>
          <div className="text-xl font-bold text-[#212833]">{fmtUsd(totalValue)}</div>
        </div>
      </div>

      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-[#E5EAF0]">
            <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">Agent</th>
            <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">Shipments</th>
            <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">Total Value</th>
            <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">Avg Spread %</th>
            <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2 pl-4">Stage Breakdown</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {agents.map(agent => (
            <tr
              key={agent.assigneeId ?? "unassigned"}
              className="border-b border-[#F0F4F8] last:border-0 hover:bg-[#FAFBFC] cursor-pointer transition-colors group"
              onClick={() => onSelectAgent(agent)}
            >
              <td className="py-2 font-medium text-[#212833]">
                {agent.assigneeName}
              </td>
              <td className="py-2 text-right text-[#5E687B]">{agent.shipmentCount}</td>
              <td className="py-2 text-right font-semibold text-[#212833]">{fmtUsd(agent.totalValueUsd)}</td>
              <td className="py-2 text-right">
                <span className={`font-semibold ${agent.avgSpreadPct != null && agent.avgSpreadPct < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {fmtPct(agent.avgSpreadPct)}
                </span>
              </td>
              <td className="py-2 pl-4">
                <StageBreakdownBar breakdown={agent.stageBreakdown} />
              </td>
              <td className="py-2 pr-1 text-right">
                <ArrowRight className="w-3.5 h-3.5 text-[#9000FF] opacity-0 group-hover:opacity-100 transition-opacity inline-block" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentDrilldown({
  agent,
  onBack,
}: {
  agent: PipelineAgentSummary;
  onBack: () => void;
}) {
  const [, navigate] = useLocation();
  const { data, isLoading } = useGetPipelineReport(
    agent.assigneeId ? { assignedUserId: agent.assigneeId } : undefined,
    { query: { enabled: !!agent.assigneeId, queryKey: ["getPipelineReport", agent.assigneeId] } },
  );
  const { data: stagesData } = useListStages();

  const uiShipments = useMemo(
    () => adaptShipments(data?.shipments ?? [], adaptStages(stagesData ?? [])),
    [data, stagesData],
  );

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-[#5E687B] hover:text-[#9000FF] transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to all agents
      </button>
      <div className="mb-4">
        <div className="text-lg font-bold text-[#212833]">{agent.assigneeName}</div>
        <div className="text-[12px] text-[#5E687B]">
          {agent.shipmentCount} shipments · {fmtUsd(agent.totalValueUsd)} total value · avg spread {fmtPct(agent.avgSpreadPct)}
        </div>
      </div>

      {!agent.assigneeId ? (
        <p className="text-sm text-[#9E9FAE] py-8 text-center">Unassigned shipments cannot be drilled into individually.</p>
      ) : isLoading ? (
        <p className="text-sm text-[#9E9FAE] py-8 text-center">Loading shipments…</p>
      ) : uiShipments.length === 0 ? (
        <p className="text-sm text-[#9E9FAE] py-8 text-center">No shipments for this agent.</p>
      ) : (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[#E5EAF0]">
              <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">PO</th>
              <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2 pl-2">Product</th>
              <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2 pl-2">Supplier</th>
              <th className="text-left text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2 pl-2">Stage</th>
              <th className="text-right text-[10px] font-bold text-[#5E687B] uppercase tracking-wide py-2">Spread</th>
            </tr>
          </thead>
          <tbody>
            {uiShipments.map(s => (
              <tr
                key={s.id}
                className="border-b border-[#F0F4F8] last:border-0 hover:bg-[#FAFBFC] cursor-pointer transition-colors group"
                onClick={() => navigate(`/orders?shipment=${s.id}&from=pipeline`)}
              >
                <td className="py-1.5">
                  <span className="font-mono text-[10px] bg-[#FAFBFC] border border-[#E5EAF0] px-1.5 py-0.5 rounded text-[#5E687B] group-hover:border-[#9000FF]/30 group-hover:text-[#9000FF] transition-colors">
                    {s.po}
                  </span>
                </td>
                <td className="py-1.5 pl-2 text-[#212833] font-medium max-w-[220px] truncate">{s.product}</td>
                <td className="py-1.5 pl-2 text-[#5E687B]">{s.supplier}</td>
                <td className="py-1.5 pl-2 text-[#5E687B]">{s.currentStage}</td>
                <td className="py-1.5 text-right font-semibold text-[#212833]">
                  {s.spreadPct != null ? `${s.spreadPct.toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function Pipeline() {
  const { isManager, loaded } = useMyRole();
  const [selectedAgent, setSelectedAgent] = useState<PipelineAgentSummary | null>(null);
  const { data, isLoading, error } = useGetPipelineReport(undefined, {
    query: { enabled: isManager, queryKey: ["getPipelineReport", "all"] },
  });

  if (loaded && !isManager) {
    return <Redirect to="/orders" />;
  }

  return (
    <div className="h-screen flex bg-[#FAFBFC]" style={{ fontFamily: "Inter, sans-serif" }}>
      <NavSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalHeader breadcrumb="Pipeline" />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#9000FF]" />
                <h1 className="text-lg font-bold text-[#212833]">Manager Pipeline Report</h1>
              </div>
              <p className="text-[12px] text-[#5E687B] mt-1">
                Per-agent deal aggregates across the organization. Click an agent to drill into their shipments.
              </p>
            </div>

            {isLoading ? (
              <p className="text-sm text-[#9E9FAE] py-8 text-center">Loading pipeline report…</p>
            ) : error ? (
              <p className="text-sm text-red-600 py-8 text-center">Failed to load pipeline report.</p>
            ) : selectedAgent ? (
              <AgentDrilldown agent={selectedAgent} onBack={() => setSelectedAgent(null)} />
            ) : (
              <AgentSummaryTable agents={data?.agents ?? []} onSelectAgent={setSelectedAgent} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
