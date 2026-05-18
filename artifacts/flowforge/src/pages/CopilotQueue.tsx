import React, { useState } from "react";
import {
  useListCopilotProposals,
  useGetCopilotSummary,
  useListAutonomyPolicies,
  useTriggerCopilot,
  useUpdateCopilotProposal,
  useUpsertAutonomyPolicy,
  type CopilotProposal,
  type AutonomyPolicy,
} from "@workspace/api-client-react";
import {
  Sparkles, CheckCircle2, XCircle, Clock, Edit3, Send, RefreshCw,
  AlertCircle, Zap, MessageCircle, Mail, DollarSign, FileText,
  ArrowUpRight, Settings, ChevronDown, ChevronRight, X, RotateCcw,
  BrainCircuit, Shield, Bot, Play, Eye, ThumbsUp, TrendingUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ProposalStatus = "pending" | "approved" | "edited" | "rejected" | "snoozed" | "auto_executed";
type PolicyLevel = "always_ask" | "auto_ack" | "full_auto";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function actionTypeIcon(actionType: string, sz = 13) {
  if (actionType === "reply")            return <MessageCircle size={sz} className="text-blue-500" />;
  if (actionType === "nudge")            return <Send size={sz} className="text-amber-500" />;
  if (actionType === "payment_reminder") return <DollarSign size={sz} className="text-emerald-500" />;
  if (actionType === "doc_request")      return <FileText size={sz} className="text-purple-500" />;
  if (actionType === "escalation")       return <AlertCircle size={sz} className="text-red-500" />;
  if (actionType === "stage_advance")    return <ArrowUpRight size={sz} className="text-indigo-500" />;
  return <Sparkles size={sz} className="text-[#9000FF]" />;
}

function actionTypeLabel(t: string) {
  const map: Record<string, string> = {
    reply: "Draft Reply",
    nudge: "Follow-up Nudge",
    payment_reminder: "Payment Reminder",
    doc_request: "Doc Request",
    escalation: "Escalation",
    stage_advance: "Advance Stage",
  };
  return map[t] ?? t;
}

function triggerTypeLabel(t: string) {
  const map: Record<string, string> = {
    message_received: "New message",
    payment_overdue: "Payment due",
    stage_idle: "Stage idle",
    no_response_48h: "No response",
    port_delay: "Port delay",
    doc_missing: "Missing doc",
  };
  return map[t] ?? t;
}

function confidenceColor(c: number) {
  if (c >= 0.9) return "text-emerald-600";
  if (c >= 0.75) return "text-amber-500";
  return "text-red-500";
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending:       "bg-amber-50 text-amber-700 border-amber-100",
    approved:      "bg-emerald-50 text-emerald-700 border-emerald-100",
    edited:        "bg-blue-50 text-blue-700 border-blue-100",
    rejected:      "bg-red-50 text-red-700 border-red-100",
    snoozed:       "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]",
    auto_executed: "bg-purple-50 text-purple-700 border-purple-100",
  };
  return map[status] ?? "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]";
}

function policyLabel(p: PolicyLevel) {
  if (p === "always_ask") return "Always ask";
  if (p === "auto_ack")   return "Auto-send acknowledgements";
  return "Full auto";
}

function policyColor(p: PolicyLevel) {
  if (p === "always_ask") return "text-amber-600 bg-amber-50 border-amber-100";
  if (p === "auto_ack")   return "text-blue-600 bg-blue-50 border-blue-100";
  return "text-emerald-600 bg-emerald-50 border-emerald-100";
}

function getPayload(p: CopilotProposal): Record<string, unknown> {
  const active = (p.editedPayload ?? p.payload) as Record<string, unknown>;
  return active;
}

// ─── Proposal Card ─────────────────────────────────────────────────────────────
function ProposalCard({
  proposal,
  shipmentMap,
  onApprove,
  onReject,
  onSnooze,
  onEdit,
}: {
  proposal: CopilotProposal;
  shipmentMap: Map<number, string>;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onSnooze: (id: number) => void;
  onEdit: (p: CopilotProposal) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const payload = getPayload(proposal);
  const poLabel = shipmentMap.get(proposal.shipmentId) ?? `Shipment #${proposal.shipmentId}`;
  const isPending = proposal.status === "pending" || proposal.status === "edited";
  const isAutoExecuted = proposal.status === "auto_executed";
  const draftBody = (payload.draftBody as string) || (payload.messageSnippet as string) || "";

  return (
    <div className={`border rounded-xl transition-all ${
      isPending
        ? "border-[#9000FF]/20 bg-white shadow-sm"
        : isAutoExecuted
        ? "border-purple-100 bg-purple-50/30"
        : "border-[#E5EAF0] bg-[#FAFBFC] opacity-70"
    }`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-start gap-3">
        {/* Action icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isPending ? "bg-[#9000FF]/10" : isAutoExecuted ? "bg-purple-100" : "bg-[#F0F4F8]"
        }`}>
          {actionTypeIcon(proposal.actionType, 15)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[11px] font-bold text-[#212833]">
              {actionTypeLabel(proposal.actionType)}
            </span>
            <span className="text-[9px] font-mono bg-[#F0F4F8] text-[#5E687B] border border-[#E5EAF0] px-1.5 py-0.5 rounded">
              {poLabel}
            </span>
            <span className={`text-[9px] border px-1.5 py-0.5 rounded-full font-semibold ${statusBadge(proposal.status)}`}>
              {proposal.status.replace(/_/g, " ")}
            </span>
            <span className="text-[9px] text-[#5E687B] bg-[#F0F4F8] border border-[#E5EAF0] px-1.5 py-0.5 rounded-full">
              {triggerTypeLabel(proposal.triggerType)}
            </span>
          </div>
          {/* Reasoning preview */}
          <p className="text-[11px] text-[#5E687B] leading-snug line-clamp-2">{proposal.reasoning}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {/* Confidence */}
          <span className={`text-[10px] font-bold ${confidenceColor(proposal.confidence ?? 0.8)}`}>
            {Math.round((proposal.confidence ?? 0.8) * 100)}%
          </span>
          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1 text-[#5E687B] hover:text-[#212833] hover:bg-[#F0F4F8] rounded transition-colors"
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-3 space-y-3 border-t border-[#E5EAF0] pt-3">
          {/* Draft preview */}
          {draftBody && (
            <div>
              <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Edit3 size={9} /> Proposed Message
              </div>
              <div className="bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg px-3 py-2.5 text-[11px] text-[#212833] leading-relaxed whitespace-pre-wrap">
                {draftBody}
              </div>
            </div>
          )}

          {/* Payload details */}
          <div className="flex flex-wrap gap-3">
            {Boolean(payload.channel) && (
              <div className="text-[10px] text-[#5E687B]">
                <span className="font-semibold text-[#212833]">Channel: </span>
                {String(payload.channel)}
              </div>
            )}
            {Boolean(payload.amountUsd) && (
              <div className="text-[10px] text-[#5E687B]">
                <span className="font-semibold text-[#212833]">Amount: </span>
                ${Number(payload.amountUsd).toLocaleString()}
              </div>
            )}
            {payload.daysOverdue != null && (
              <div className="text-[10px] text-red-600 font-semibold">
                {Number(payload.daysOverdue)} day(s) overdue
              </div>
            )}
            {payload.daysUntilDue != null && (
              <div className="text-[10px] text-amber-600 font-semibold">
                Due in {Number(payload.daysUntilDue)} day(s)
              </div>
            )}
            {Boolean(payload.requiredDocs) && (
              <div className="text-[10px] text-[#5E687B]">
                <span className="font-semibold text-[#212833]">Required: </span>
                {(payload.requiredDocs as string[]).join(", ")}
              </div>
            )}
          </div>

          {/* AI reasoning */}
          <div className="bg-[#9000FF]/5 border border-[#9000FF]/10 rounded-lg px-3 py-2 flex gap-2">
            <BrainCircuit size={11} className="text-[#9000FF] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#5E687B] leading-relaxed">{proposal.reasoning}</p>
          </div>

          {/* Audit trail */}
          {Array.isArray(proposal.auditTrail) && proposal.auditTrail.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {(proposal.auditTrail as Array<{ at: string; actor: string; action: string; note?: string }>).map((entry, i) => (
                <span key={i} className="text-[9px] text-[#9E9FAE]">
                  {entry.actor} · {entry.action}
                  {entry.note ? ` · ${entry.note}` : ""}
                  {i < (proposal.auditTrail as unknown[]).length - 1 ? " →" : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions bar — pending only */}
      {isPending && (
        <div className="px-4 py-2.5 border-t border-[#E5EAF0] flex items-center gap-2">
          <button
            onClick={() => onApprove(proposal.id)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] px-3 py-1.5 rounded-lg transition-colors"
          >
            <CheckCircle2 size={12} /> Approve & Send
          </button>
          <button
            onClick={() => onEdit(proposal)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9000FF] border border-[#9000FF]/30 bg-[#9000FF]/5 hover:bg-[#9000FF]/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Edit3 size={12} /> Edit Draft
          </button>
          <button
            onClick={() => onSnooze(proposal.id)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#5E687B] border border-[#E5EAF0] hover:bg-[#F0F4F8] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Clock size={12} /> Snooze 24h
          </button>
          <button
            onClick={() => onReject(proposal.id)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#5E687B] border border-[#E5EAF0] hover:bg-red-50 hover:text-red-600 hover:border-red-100 px-2.5 py-1.5 rounded-lg transition-colors ml-auto"
          >
            <XCircle size={12} /> Reject
          </button>
        </div>
      )}

      {/* Auto-executed banner */}
      {isAutoExecuted && (
        <div className="px-4 py-2 border-t border-purple-100 bg-purple-50/50 flex items-center gap-2">
          <Zap size={11} className="text-purple-500" />
          <span className="text-[10px] text-purple-600 font-medium">Auto-executed by copilot per your autonomy policy</span>
        </div>
      )}
    </div>
  );
}

// ─── Edit Draft Modal ─────────────────────────────────────────────────────────
function EditDraftModal({
  proposal,
  onSave,
  onClose,
}: {
  proposal: CopilotProposal;
  onSave: (id: number, editedBody: string) => void;
  onClose: () => void;
}) {
  const payload = getPayload(proposal);
  const [body, setBody] = useState(String(payload.draftBody ?? ""));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E5EAF0] w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <Edit3 size={15} className="text-[#9000FF]" />
            <span className="font-bold text-sm text-[#212833]">Edit Draft</span>
          </div>
          <button onClick={onClose} className="text-[#5E687B] hover:text-[#212833] p-1"><X size={14} /></button>
        </div>

        <div className="p-5">
          <div className="text-[10px] text-[#5E687B] mb-1 flex items-center gap-1.5">
            <BrainCircuit size={10} className="text-[#9000FF]" />
            AI reasoning: <span className="text-[#212833]">{proposal.reasoning}</span>
          </div>

          <div className="mt-3 mb-1 text-[9px] font-bold text-[#5E687B] uppercase tracking-wider">Message draft</div>
          <textarea
            className="w-full border border-[#E5EAF0] rounded-xl px-3 py-2.5 text-xs text-[#212833] leading-relaxed outline-none focus:border-[#9000FF]/40 focus:ring-2 focus:ring-[#9000FF]/10 resize-none transition-all"
            rows={7}
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          <p className="text-[9px] text-[#9E9FAE] mt-1">Your edits are saved and used to improve future drafts for this supplier.</p>
        </div>

        <div className="px-5 py-4 border-t border-[#E5EAF0] flex gap-2 justify-end">
          <button onClick={onClose} className="text-xs text-[#5E687B] border border-[#E5EAF0] px-3 py-1.5 rounded-lg hover:bg-[#F0F4F8] transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(proposal.id, body)}
            className="text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 size={12} /> Save & Approve
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Policy Row ───────────────────────────────────────────────────────────────
function PolicyRow({
  label,
  sublabel,
  currentPolicy,
  onChange,
}: {
  label: string;
  sublabel: string;
  currentPolicy: PolicyLevel;
  onChange: (p: PolicyLevel) => void;
}) {
  const levels: PolicyLevel[] = ["always_ask", "auto_ack", "full_auto"];
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#E5EAF0] last:border-0">
      <div className="min-w-0 mr-4">
        <div className="text-xs font-semibold text-[#212833]">{label}</div>
        <div className="text-[10px] text-[#5E687B]">{sublabel}</div>
      </div>
      <div className="flex gap-1 shrink-0">
        {levels.map(level => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
              currentPolicy === level
                ? policyColor(level)
                : "text-[#9E9FAE] border-[#E5EAF0] hover:border-[#D6E3EB]"
            }`}
          >
            {level === "always_ask" ? "Ask" : level === "auto_ack" ? "Auto-ack" : "Full auto"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CopilotQueue() {
  const { data: proposals = [], refetch: refetchProposals } = useListCopilotProposals({});
  const { data: summary } = useGetCopilotSummary();
  const { data: policies = [] } = useListAutonomyPolicies();

  const { mutate: triggerEngine, isPending: isTriggering } = useTriggerCopilot({
    mutation: {
      onSuccess: () => { void refetchProposals(); },
    },
  });

  const { mutate: updateProposal } = useUpdateCopilotProposal({
    mutation: {
      onSuccess: () => { void refetchProposals(); },
    },
  });

  const { mutate: upsertPolicy } = useUpsertAutonomyPolicy({
    mutation: {},
  });

  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "auto_executed" | "rejected">("all");
  const [showPolicies, setShowPolicies] = useState(false);
  const [editingProposal, setEditingProposal] = useState<CopilotProposal | null>(null);

  // Build a map of shipmentId → PO number from proposals payload
  const shipmentMap = new Map<number, string>();
  for (const p of proposals) {
    if (!shipmentMap.has(p.shipmentId)) {
      const payload = p.payload as Record<string, unknown>;
      shipmentMap.set(p.shipmentId, (payload.poNumber as string) || `PO #${p.shipmentId}`);
    }
  }

  // Enrich shipmentMap from summary recentActions too
  if (summary?.recentActions) {
    for (const p of summary.recentActions) {
      if (!shipmentMap.has(p.shipmentId)) {
        const payload = p.payload as Record<string, unknown>;
        shipmentMap.set(p.shipmentId, (payload.poNumber as string) || `PO #${p.shipmentId}`);
      }
    }
  }

  const filtered = proposals.filter(p => {
    if (filterStatus === "all") return true;
    return p.status === filterStatus;
  });

  const pending = proposals.filter(p => p.status === "pending" || p.status === "edited").length;
  const autoRan = proposals.filter(p => p.status === "auto_executed").length;

  function handleApprove(id: number) {
    updateProposal({
      id,
      data: { status: "approved" },
    });
  }

  function handleReject(id: number) {
    updateProposal({
      id,
      data: { status: "rejected" },
    });
  }

  function handleSnooze(id: number) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    updateProposal({
      id,
      data: { snoozedUntil: tomorrow.toISOString() },
    });
  }

  function handleEditSave(id: number, editedBody: string) {
    const proposal = proposals.find(p => p.id === id);
    if (!proposal) return;
    const currentPayload = proposal.payload as Record<string, unknown>;
    updateProposal({
      id,
      data: {
        status: "approved",
        editedPayload: { ...currentPayload, draftBody: editedBody },
      },
    });
    setEditingProposal(null);
  }

  function handlePolicyChange(
    supplierName: string | undefined,
    actionType: string | undefined,
    policy: PolicyLevel
  ) {
    upsertPolicy({
      data: {
        supplierName,
        actionType,
        policy,
      },
    });
  }

  function getEffectivePolicy(
    supplierName?: string,
    actionType?: string
  ): PolicyLevel {
    const typedPolicies = policies as AutonomyPolicy[];
    const specific = typedPolicies.find(
      p => p.supplierName === (supplierName ?? null) && p.actionType === (actionType ?? null)
    );
    if (specific) return specific.policy as PolicyLevel;
    const global = typedPolicies.find(p => !p.supplierName && !p.actionType);
    return (global?.policy as PolicyLevel) ?? "always_ask";
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FAFBFC]">
      {/* ── Summary Banner ── */}
      <div className="bg-white border-b border-[#E5EAF0] px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-[#9000FF]/10 flex items-center justify-center">
                <Bot size={13} className="text-[#9000FF]" />
              </div>
              <h1 className="text-sm font-bold text-[#212833]">Copilot Queue</h1>
              {pending > 0 && (
                <span className="text-[10px] font-bold bg-[#9000FF] text-white px-2 py-0.5 rounded-full">
                  {pending} pending
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#5E687B] max-w-lg">
              {summary?.highlights?.[0] ?? "Your AI copilot is watching all active shipments. Approve, edit, or reject proposed actions below."}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 shrink-0">
            {[
              { label: "Pending", value: summary?.pending ?? pending, color: "text-amber-600" },
              { label: "Auto-ran", value: summary?.autoExecuted ?? autoRan, color: "text-purple-600" },
              { label: "Watching", value: summary?.watched ?? proposals.length, color: "text-[#9000FF]" },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[9px] text-[#5E687B]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 mt-3">
          {/* Filter chips */}
          {(["all", "pending", "auto_executed", "rejected"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                filterStatus === s
                  ? "bg-[#212833] text-white border-[#212833]"
                  : "text-[#5E687B] border-[#E5EAF0] hover:border-[#D6E3EB] bg-white"
              }`}
            >
              {s === "all" ? "All" : s === "auto_executed" ? "Auto-ran" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}

          <div className="flex-1" />

          <button
            onClick={() => setShowPolicies(v => !v)}
            className={`flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              showPolicies
                ? "bg-[#9000FF] text-white border-[#9000FF]"
                : "text-[#5E687B] border-[#E5EAF0] hover:bg-[#F0F4F8] bg-white"
            }`}
          >
            <Shield size={11} /> Autonomy Policies
          </button>

          <button
            onClick={() => triggerEngine()}
            disabled={isTriggering}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {isTriggering ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
            {isTriggering ? "Scanning…" : "Run Copilot"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* ── Proposal List ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#9000FF]/10 flex items-center justify-center mb-4">
                <Sparkles size={24} className="text-[#9000FF]" />
              </div>
              <h2 className="text-sm font-bold text-[#212833] mb-1">
                {filterStatus === "pending" ? "All clear — no pending actions" : "Nothing here yet"}
              </h2>
              <p className="text-[11px] text-[#5E687B] max-w-xs mb-4">
                {filterStatus === "pending"
                  ? "Your copilot has nothing waiting for your approval. Run a scan to check for new actions."
                  : "No proposals in this category yet. Run the copilot to generate proposals from your active shipments."}
              </p>
              <button
                onClick={() => triggerEngine()}
                disabled={isTriggering}
                className="flex items-center gap-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] px-4 py-2 rounded-lg transition-colors"
              >
                <Play size={13} />
                {isTriggering ? "Scanning…" : "Run Copilot Now"}
              </button>
            </div>
          )}

          {filtered.map(p => (
            <ProposalCard
              key={p.id}
              proposal={p}
              shipmentMap={shipmentMap}
              onApprove={handleApprove}
              onReject={handleReject}
              onSnooze={handleSnooze}
              onEdit={setEditingProposal}
            />
          ))}

          {/* Recent auto-executed summary */}
          {filterStatus === "all" && autoRan > 0 && summary?.recentActions && summary.recentActions.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={12} className="text-purple-500" />
                <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">Auto-executed while you were away</span>
              </div>
              <div className="space-y-2">
                {summary.recentActions.slice(0, 3).map(a => {
                  const payload = a.payload as Record<string, unknown>;
                  return (
                    <div key={a.id} className="flex items-center gap-3 bg-white border border-[#E5EAF0] rounded-xl px-4 py-2.5">
                      <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center shrink-0">
                        {actionTypeIcon(a.actionType, 11)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-[#212833] truncate">{actionTypeLabel(a.actionType)}</p>
                        <p className="text-[10px] text-[#5E687B] truncate">{(payload.draftBody as string)?.slice(0, 60) ?? a.reasoning.slice(0, 60)}…</p>
                      </div>
                      <span className="text-[9px] text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full font-semibold shrink-0">auto</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Autonomy Policy Panel ── */}
        {showPolicies && (
          <div className="w-[340px] border-l border-[#E5EAF0] bg-white flex flex-col shrink-0 overflow-y-auto">
            <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#9000FF]" />
                <span className="text-xs font-bold text-[#212833]">Autonomy Policies</span>
              </div>
              <button onClick={() => setShowPolicies(false)} className="text-[#5E687B] hover:text-[#212833] p-1">
                <X size={13} />
              </button>
            </div>

            <div className="p-4 flex-1">
              <p className="text-[10px] text-[#5E687B] mb-4 leading-relaxed">
                Control how much the copilot can do on its own. Default is conservative — it always asks before sending.
              </p>

              {/* Global default */}
              <div className="mb-4">
                <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">Global Default</div>
                <PolicyRow
                  label="All suppliers & actions"
                  sublabel="Applied when no specific rule matches"
                  currentPolicy={getEffectivePolicy()}
                  onChange={p => handlePolicyChange(undefined, undefined, p)}
                />
              </div>

              {/* Per action type */}
              <div className="mb-4">
                <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">By Action Type</div>
                {[
                  { at: "reply",            label: "Draft replies",       sub: "AI-written responses to supplier messages" },
                  { at: "nudge",            label: "Follow-up nudges",    sub: "Automatic check-ins when suppliers go quiet" },
                  { at: "payment_reminder", label: "Payment reminders",   sub: "Reminders for overdue or upcoming payments" },
                  { at: "doc_request",      label: "Document requests",   sub: "Requests for shipping or trade documents" },
                  { at: "escalation",       label: "Escalations",         sub: "Urgent flags to management" },
                ].map(({ at, label, sub }) => (
                  <PolicyRow
                    key={at}
                    label={label}
                    sublabel={sub}
                    currentPolicy={getEffectivePolicy(undefined, at)}
                    onChange={p => handlePolicyChange(undefined, at, p)}
                  />
                ))}
              </div>

              {/* Per supplier */}
              <div>
                <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">Trusted Suppliers</div>
                {[
                  "Hangzhou Timber Co.",
                  "Guangzhou Metalworks",
                  "Shenzhen LEDPro",
                  "Tianjin Wire Works",
                ].map(name => (
                  <PolicyRow
                    key={name}
                    label={name}
                    sublabel="Override for this supplier specifically"
                    currentPolicy={getEffectivePolicy(name)}
                    onChange={p => handlePolicyChange(name, undefined, p)}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="mt-5 p-3 bg-[#FAFBFC] border border-[#E5EAF0] rounded-xl space-y-2">
                <div className="text-[9px] font-bold text-[#5E687B] uppercase tracking-wider">Policy legend</div>
                {[
                  { p: "always_ask" as PolicyLevel, desc: "Every action queued for your approval" },
                  { p: "auto_ack" as PolicyLevel, desc: "Auto-sends acknowledgements only; others need approval" },
                  { p: "full_auto" as PolicyLevel, desc: "All actions auto-executed, logged for audit" },
                ].map(({ p, desc }) => (
                  <div key={p} className="flex items-start gap-2">
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${policyColor(p)}`}>
                      {p === "always_ask" ? "Ask" : p === "auto_ack" ? "Auto-ack" : "Full auto"}
                    </span>
                    <span className="text-[10px] text-[#5E687B]">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Draft Modal */}
      {editingProposal && (
        <EditDraftModal
          proposal={editingProposal}
          onSave={handleEditSave}
          onClose={() => setEditingProposal(null)}
        />
      )}
    </div>
  );
}
