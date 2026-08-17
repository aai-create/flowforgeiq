import React, { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSignalInbox,
  useAssessSignal,
  useApproveSignal,
  useSendSignal,
  useSkipSignal,
  useUpdateSignalDraft,
  getListSignalInboxQueryKey,
  type SignalInboxItem,
} from "@workspace/api-client-react";
import {
  Mail, MessageCircle, Phone, Globe, Inbox, Sparkles, CheckCircle2,
  Send, SkipForward, Edit3, RefreshCw, Clock, AlertTriangle, Check,
  X, Loader2, BrainCircuit, ArrowRight, ChevronDown, ChevronRight,
  Zap, RotateCcw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type SignalStatus = "new" | "assessing" | "draft_ready" | "approved" | "sending" | "sent" | "send_failed" | "skipped";
type Filter = "active" | "draft_ready" | "approved" | "sent" | "skipped";

interface Message {
  id: number;
  sender: string;
  channel: string;
  direction: string;
  snippet: string;
  fullBody: string;
  subject?: string | null;
  receivedAt: Date | string;
  signalStatus?: string | null;
  rawSenderEmail?: string | null;
  shipmentId?: number | null;
}

interface Proposal {
  id: number;
  payload: unknown;
  editedPayload?: unknown;
  reasoning: string;
  confidence: number;
  status: string;
  auditTrail?: unknown[];
  triggerRef?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function channelIcon(channel: string, sz = 14) {
  if (channel === "email") return <Mail size={sz} />;
  if (channel === "whatsapp") return <MessageCircle size={sz} className="text-emerald-500" />;
  if (channel === "sms") return <Phone size={sz} className="text-blue-500" />;
  return <Globe size={sz} className="text-[#9E9FAE]" />;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    new:             "New",
    assessing:       "Assessing…",
    draft_ready:     "Draft Ready",
    approved:        "Approved",
    sending:         "Sending…",
    sent:            "Sent",
    send_failed:     "Send Failed",
    send_uncertain:  "Uncertain",
    skipped:         "Skipped",
  };
  return map[status] ?? status;
}

function statusChip(status: string) {
  const base = "text-[10px] font-semibold px-2 py-0.5 rounded-full border";
  const map: Record<string, string> = {
    new:             `${base} bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]`,
    assessing:       `${base} bg-amber-50 text-amber-700 border-amber-100`,
    draft_ready:     `${base} bg-purple-50 text-purple-700 border-purple-100`,
    approved:        `${base} bg-emerald-50 text-emerald-700 border-emerald-100`,
    sending:         `${base} bg-blue-50 text-blue-700 border-blue-100`,
    sent:            `${base} bg-emerald-50 text-emerald-600 border-emerald-100`,
    send_failed:     `${base} bg-red-50 text-red-700 border-red-100`,
    send_uncertain:  `${base} bg-orange-50 text-orange-700 border-orange-100`,
    skipped:         `${base} bg-[#F0F4F8] text-[#9E9FAE] border-[#E5EAF0]`,
  };
  return map[status] ?? `${base} bg-[#F0F4F8] text-[#9E9FAE] border-[#E5EAF0]`;
}

function relTime(d: Date | string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getDraftBody(proposal: Proposal | null): string {
  if (!proposal) return "";
  const effective = proposal.editedPayload ?? proposal.payload;
  if (typeof effective === "object" && effective !== null) {
    const body = (effective as Record<string, unknown>).draftBody;
    return typeof body === "string" ? body : "";
  }
  return "";
}

const FILTER_LABELS: Record<Filter, string> = {
  active:      "Active",
  draft_ready: "Draft Ready",
  approved:    "Approved",
  sent:        "Sent",
  skipped:     "Skipped",
};

// ─── Signal List Item ─────────────────────────────────────────────────────────
function SignalListItem({
  item,
  isSelected,
  onClick,
}: {
  item: SignalInboxItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const msg = item.message as unknown as Message;
  const proposal = item.proposal as Proposal | null;
  const status = (msg.signalStatus ?? "new") as string;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-[#E5EAF0] transition-colors ${
        isSelected
          ? "bg-[#F0EEFF] border-l-2 border-l-[#9000FF]"
          : "hover:bg-[#F7F9FA]"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-[#9E9FAE]">{channelIcon(msg.channel)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-xs font-semibold text-[#212833] truncate">{msg.sender}</span>
            <span className="text-[9px] text-[#9E9FAE] shrink-0">{relTime(msg.receivedAt)}</span>
          </div>
          {msg.subject && (
            <div className="text-[10px] text-[#5E687B] truncate mb-0.5">{msg.subject}</div>
          )}
          <div className="text-[10px] text-[#9E9FAE] truncate">{msg.snippet}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={statusChip(status)}>{statusLabel(status)}</span>
            {proposal && status === "draft_ready" && (
              <span className="text-[9px] text-[#9000FF] flex items-center gap-0.5">
                <BrainCircuit size={9} /> AI draft
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Signal Detail Panel ──────────────────────────────────────────────────────
function SignalDetailPanel({
  item,
  onAssess,
  onApprove,
  onSend,
  onSkip,
  onDraftEdit,
  isAssessing,
  isApproving,
  isSending,
  isSkipping,
  isUpdatingDraft,
}: {
  item: SignalInboxItem;
  onAssess: () => void;
  onApprove: () => void;
  onSend: () => void;
  onSkip: () => void;
  onDraftEdit: (body: string) => void;
  isAssessing: boolean;
  isApproving: boolean;
  isSending: boolean;
  isSkipping: boolean;
  isUpdatingDraft: boolean;
}) {
  const msg = item.message as unknown as Message;
  const proposal = item.proposal as Proposal | null;
  const status = (msg.signalStatus ?? "new") as string;
  const draftBody = getDraftBody(proposal);

  const [editMode, setEditMode] = useState(false);
  const [editedBody, setEditedBody] = useState(draftBody);
  const [showFullBody, setShowFullBody] = useState(false);

  // Sync edit text when proposal changes
  React.useEffect(() => {
    setEditedBody(getDraftBody(proposal));
    setEditMode(false);
  }, [proposal?.id, (proposal?.editedPayload ?? proposal?.payload)]);

  const handleSaveDraft = useCallback(() => {
    if (editedBody.trim()) {
      onDraftEdit(editedBody);
      setEditMode(false);
    }
  }, [editedBody, onDraftEdit]);

  const canAssess = ["new", "send_failed"].includes(status) || (status === "draft_ready" && !proposal);
  const canApprove = status === "draft_ready" && !!proposal;
  const canSend = status === "approved";
  // send_uncertain is NOT retryable — email was accepted by Gmail, only DB write failed
  const canSkip = !["skipped", "sent", "send_uncertain", "sending"].includes(status);
  const canEdit = proposal && ["draft_ready", "approved"].includes(status);
  const canRetrySend = status === "send_failed";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E5EAF0] bg-white shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[#9E9FAE]">{channelIcon(msg.channel, 16)}</span>
            <span className="font-semibold text-sm text-[#212833]">{msg.sender}</span>
            {msg.rawSenderEmail && msg.rawSenderEmail !== msg.sender && (
              <span className="text-[10px] text-[#9E9FAE]">({msg.rawSenderEmail})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={statusChip(status)}>{statusLabel(status)}</span>
            <span className="text-[9px] text-[#9E9FAE]">{relTime(msg.receivedAt)}</span>
          </div>
        </div>
        {msg.subject && (
          <div className="text-xs text-[#5E687B] font-medium">{msg.subject}</div>
        )}
        {msg.shipmentId && (
          <div className="text-[9px] text-[#9E9FAE] mt-0.5">Linked shipment: #{msg.shipmentId}</div>
        )}
      </div>

      {/* Body scroll area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">

        {/* Original message */}
        <div>
          <div className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider mb-1.5">
            Original message
          </div>
          <div
            className={`text-xs text-[#212833] leading-relaxed bg-[#F7F9FA] border border-[#E5EAF0] rounded-xl p-3 ${
              !showFullBody ? "max-h-32 overflow-hidden relative" : ""
            }`}
          >
            <pre className="whitespace-pre-wrap font-sans">
              {showFullBody ? msg.fullBody : msg.snippet}
            </pre>
            {!showFullBody && msg.fullBody.length > 200 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#F7F9FA] to-transparent rounded-b-xl" />
            )}
          </div>
          {msg.fullBody.length > 200 && (
            <button
              onClick={() => setShowFullBody(f => !f)}
              className="text-[10px] text-[#9000FF] mt-1 flex items-center gap-0.5 hover:underline"
            >
              {showFullBody ? (
                <><ChevronDown size={10} /> Show less</>
              ) : (
                <><ChevronRight size={10} /> Show full message</>
              )}
            </button>
          )}
        </div>

        {/* AI Draft */}
        {proposal && draftBody && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider flex items-center gap-1">
                <BrainCircuit size={10} className="text-[#9000FF]" />
                AI Draft Reply
              </div>
              {canEdit && !editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-[10px] text-[#9000FF] flex items-center gap-0.5 hover:underline"
                >
                  <Edit3 size={10} /> Edit
                </button>
              )}
            </div>

            {editMode ? (
              <div>
                <textarea
                  className="w-full border border-[#9000FF]/30 rounded-xl px-3 py-2.5 text-xs text-[#212833] leading-relaxed outline-none focus:border-[#9000FF]/60 focus:ring-2 focus:ring-[#9000FF]/10 resize-none transition-all bg-white"
                  rows={6}
                  value={editedBody}
                  onChange={e => setEditedBody(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveDraft}
                    disabled={isUpdatingDraft}
                    className="text-[10px] font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {isUpdatingDraft ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                    Save draft
                  </button>
                  <button
                    onClick={() => { setEditMode(false); setEditedBody(draftBody); }}
                    className="text-[10px] text-[#5E687B] border border-[#E5EAF0] px-3 py-1.5 rounded-lg hover:bg-[#F0F4F8] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#212833] leading-relaxed bg-white border border-[#E5EAF0] rounded-xl p-3">
                <pre className="whitespace-pre-wrap font-sans">{draftBody}</pre>
              </div>
            )}

            {/* AI reasoning */}
            {proposal.reasoning && (
              <div className="mt-2 flex items-start gap-1.5 text-[10px] text-[#9E9FAE]">
                <BrainCircuit size={10} className="text-[#9000FF] mt-0.5 shrink-0" />
                <span>{proposal.reasoning}</span>
              </div>
            )}
          </div>
        )}

        {/* Status-specific info */}
        {status === "sent" && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
            <CheckCircle2 size={14} />
            Reply sent via {msg.channel}.
          </div>
        )}
        {status === "send_failed" && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
            <AlertTriangle size={14} />
            Send failed. Your draft is preserved — retry below.
          </div>
        )}
        {status === "send_uncertain" && (
          <div className="space-y-1.5">
            <div className="flex items-start gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                <strong>Delivery uncertain.</strong> The email may have been sent — check Gmail before retrying to avoid duplicates.
                The audit trail below contains the Gmail dispatch record.
              </span>
            </div>
          </div>
        )}

        {/* Audit trail */}
        {proposal && Array.isArray(proposal.auditTrail) && proposal.auditTrail.length > 0 && (
          <div>
            <div className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider mb-1.5">
              Activity
            </div>
            <div className="space-y-1">
              {(proposal.auditTrail as Array<{ at: string; actor: string; action: string; note?: string }>).map((entry, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-[#9E9FAE]">
                  <span className="text-[#E5EAF0] mt-1">•</span>
                  <span className="text-[#5E687B] font-medium">{entry.action.replace(/_/g, " ")}</span>
                  <span>by {entry.actor}</span>
                  {entry.note && <span className="text-[#9E9FAE]">— {entry.note}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="shrink-0 border-t border-[#E5EAF0] bg-white px-4 py-2.5 flex items-center gap-2 flex-wrap">

        {/* Assess / Re-assess */}
        {(canAssess || canRetrySend) && (
          <button
            onClick={onAssess}
            disabled={isAssessing || status === "assessing"}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isAssessing || status === "assessing" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {proposal ? "Re-assess" : "Assess"}
          </button>
        )}

        {/* Approve */}
        {canApprove && !editMode && (
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isApproving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Approve draft
          </button>
        )}

        {/* Send */}
        {canSend && (
          <button
            onClick={onSend}
            disabled={isSending}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Send reply
          </button>
        )}

        {/* Retry send */}
        {canRetrySend && proposal && (
          <button
            onClick={onSend}
            disabled={isSending}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isSending ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            Retry send
          </button>
        )}

        {/* Skip */}
        {canSkip && (
          <button
            onClick={onSkip}
            disabled={isSkipping}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#5E687B] border border-[#E5EAF0] hover:bg-[#F0F4F8] disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors ml-auto"
          >
            {isSkipping ? <Loader2 size={12} className="animate-spin" /> : <SkipForward size={12} />}
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SignalInbox() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("active");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Status query param mapping
  const statusParam = filter === "active" ? undefined : filter === "draft_ready" ? "draft_ready" : filter;

  const { data: items = [], isFetching } = useListSignalInbox(
    { status: statusParam },
    { query: { queryKey: getListSignalInboxQueryKey({ status: statusParam }), refetchInterval: 15000 } },
  );

  // Selected item
  const selectedItem = (items as SignalInboxItem[]).find(
    (i) => (i.message as unknown as Message).id === selectedId,
  ) ?? null;

  // Auto-select first item when filter changes
  React.useEffect(() => {
    const first = (items as SignalInboxItem[])[0];
    if (first) {
      setSelectedId((first.message as unknown as Message).id);
    } else {
      setSelectedId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Invalidate after any mutation
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getListSignalInboxQueryKey() });
  }, [queryClient]);

  // Mutations
  const { mutate: assess, isPending: isAssessing } = useAssessSignal({ mutation: { onSuccess: invalidate, onError: invalidate } });
  const { mutate: approve, isPending: isApproving } = useApproveSignal({ mutation: { onSuccess: invalidate } });
  const { mutate: send, isPending: isSending } = useSendSignal({ mutation: { onSuccess: invalidate } });
  const { mutate: skip, isPending: isSkipping } = useSkipSignal({ mutation: { onSuccess: invalidate } });
  const { mutate: updateDraft, isPending: isUpdatingDraft } = useUpdateSignalDraft({ mutation: { onSuccess: invalidate } });

  // Per-item mutation state (whether the mutation is for the selected item)
  const selectedMsg = selectedItem ? (selectedItem.message as unknown as Message) : null;

  // Active filter: show anything not skipped
  const filteredItems = filter === "active"
    ? (items as SignalInboxItem[]).filter(i => {
        const s = (i.message as unknown as Message).signalStatus ?? "new";
        return s !== "skipped" && s !== "sent";
      })
    : (items as SignalInboxItem[]);

  // Counts for badge
  const draftReadyCount = (items as SignalInboxItem[]).filter(
    i => (i.message as unknown as Message).signalStatus === "draft_ready",
  ).length;

  const sendFailedCount = (items as SignalInboxItem[]).filter(
    i => (i.message as unknown as Message).signalStatus === "send_failed",
  ).length;

  const badgeCount = draftReadyCount + sendFailedCount;

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      {/* ── LEFT: Signal list ── */}
      <div className="w-[300px] shrink-0 flex flex-col border-r border-[#E5EAF0] bg-white overflow-hidden">
        {/* Toolbar */}
        <div className="px-3 py-2 border-b border-[#E5EAF0] flex items-center gap-2 shrink-0 bg-[#F7F9FA]">
          <Inbox size={14} className="text-[#9000FF]" />
          <span className="text-xs font-bold text-[#212833]">Signal Inbox</span>
          {badgeCount > 0 && (
            <span className="ml-auto text-[9px] font-bold bg-[#9000FF] text-white px-1.5 py-0.5 rounded-full">
              {badgeCount}
            </span>
          )}
          {isFetching && <RefreshCw size={10} className="animate-spin text-[#9E9FAE] ml-auto" />}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0.5 px-2 py-1.5 border-b border-[#E5EAF0] bg-white shrink-0 overflow-x-auto">
          {(Object.keys(FILTER_LABELS) as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${
                filter === f
                  ? "bg-[#9000FF] text-white"
                  : "text-[#5E687B] hover:bg-[#F0F4F8]"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Signal list */}
        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <Inbox size={28} className="text-[#E5EAF0]" />
              <span className="text-xs text-[#9E9FAE]">
                {filter === "active" ? "No active signals" : `No ${FILTER_LABELS[filter].toLowerCase()} signals`}
              </span>
            </div>
          ) : (
            filteredItems.map(item => (
              <SignalListItem
                key={(item.message as unknown as Message).id}
                item={item}
                isSelected={(item.message as unknown as Message).id === selectedId}
                onClick={() => setSelectedId((item.message as unknown as Message).id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Detail + draft panel ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">
        {selectedItem && selectedMsg ? (
          <SignalDetailPanel
            key={selectedMsg.id}
            item={selectedItem}
            onAssess={() => assess({ messageId: selectedMsg.id })}
            onApprove={() => approve({ messageId: selectedMsg.id })}
            onSend={() => send({ messageId: selectedMsg.id })}
            onSkip={() => skip({ messageId: selectedMsg.id })}
            onDraftEdit={body => updateDraft({ messageId: selectedMsg.id, data: { draftBody: body } })}
            isAssessing={isAssessing}
            isApproving={isApproving}
            isSending={isSending}
            isSkipping={isSkipping}
            isUpdatingDraft={isUpdatingDraft}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-[#F0EEFF] flex items-center justify-center">
              <Sparkles size={24} className="text-[#9000FF]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#212833] mb-1">Signal Inbox</div>
              <div className="text-xs text-[#9E9FAE] max-w-xs">
                Inbound signals are triaged here. Select a message to review, assess, and approve an AI-generated reply before sending.
              </div>
            </div>
            <div className="flex flex-col gap-2 text-[10px] text-left">
              {[
                ["1", "Assess", "AI reads the signal and drafts a reply"],
                ["2", "Review", "Edit the draft if needed"],
                ["3", "Approve", "Confirm the reply"],
                ["4", "Send", "Dispatch via the originating channel"],
              ].map(([num, title, desc]) => (
                <div key={num} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#9000FF]/10 text-[#9000FF] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {num}
                  </span>
                  <span>
                    <span className="font-semibold text-[#212833]">{title}</span>
                    <span className="text-[#9E9FAE]"> — {desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
