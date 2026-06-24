import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Sparkles, Search, Bell, Clipboard, ChevronLeft,
  MessageCircle, Mail, MessageSquare, FileText,
  Image, FileSpreadsheet, Video,
} from "lucide-react";
import { AICopilotBar } from "@/components/AICopilotBar";
import { AIDrawer, AISparklesButton } from "@/components/TodaysFocusDrawer";
import {
  useListStages,
  useListMessages,
  useListShipments,
  useListFocusItems,
} from "@workspace/api-client-react";
import {
  adaptStages,
  adaptMessages,
  adaptShipments,
  type UiMessage,
  type UiShipment,
} from "@/lib/adapters";

export type BreadcrumbSegment =
  | { label: string; href: string }
  | { label: string; href?: undefined };

export interface GlobalHeaderProps {
  breadcrumb: string;
  onPasteChat?: () => void;
  onOpenMessage?: (id: string) => void;
  breadcrumbSegments?: BreadcrumbSegment[];
}

type Channel = "gmail" | "whatsapp" | "wechat" | "imessage" | "sms" | "sheets" | "pdf";

function chIcon(ch: Channel, sz = 12) {
  if (ch === "whatsapp") return <MessageCircle size={sz} className="text-emerald-500" />;
  if (ch === "gmail")    return <Mail size={sz} className="text-blue-500" />;
  if (ch === "wechat")   return <MessageSquare size={sz} className="text-teal-500" />;
  if (ch === "imessage") return <MessageCircle size={sz} className="text-blue-400" />;
  if (ch === "sms")      return <MessageCircle size={sz} className="text-slate-400" />;
  if (ch === "sheets")   return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
    </svg>
  );
  return <FileText size={sz} className="text-red-500" />;
}

function SearchResults({
  query,
  messages,
  shipments,
  onOpen,
}: {
  query: string;
  messages: UiMessage[];
  shipments: UiShipment[];
  onOpen: (id: string) => void;
}) {
  const shipmentMap = useMemo(
    () => new Map(shipments.map(s => [s.id, s])),
    [shipments],
  );

  const trimmed = query.trim();
  if (!trimmed) return null;
  const q = trimmed.toLowerCase();

  const getPoMatch = (m: UiMessage): string | null => {
    const s = shipmentMap.get(m.shipmentId);
    if (!s) return null;
    if (s.po.toLowerCase().includes(q)) return s.po;
    if (s.buyerPoNumber?.toLowerCase().includes(q)) return s.buyerPoNumber;
    return s.buyerPoNumbers.find(p => p.toLowerCase().includes(q)) ?? null;
  };

  const matched = messages.filter(m =>
    m.sender.toLowerCase().includes(q) ||
    m.snippet.toLowerCase().includes(q) ||
    m.fullBody.toLowerCase().includes(q) ||
    getPoMatch(m) !== null,
  );

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5EAF0] rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] z-50 mx-6 overflow-hidden max-h-[280px] overflow-y-auto">
      <div className="px-3 py-2 border-b border-[#E5EAF0] bg-[#FAFBFC] flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#5E687B] uppercase tracking-wider">
          {matched.length} result{matched.length !== 1 ? "s" : ""} for "{query}"
        </span>
        <span className="text-[11px] text-[#9E9FAE]">messages</span>
      </div>
      {matched.length === 0 ? (
        <div className="py-6 text-center text-xs text-[#9E9FAE]">No messages match "{query}"</div>
      ) : matched.map(m => {
        const poMatch = getPoMatch(m);
        return (
          <button
            key={m.id}
            onClick={() => onOpen(m.id)}
            className="w-full text-left px-3 py-2.5 hover:bg-[#FAFBFC] border-b border-[#E5EAF0] last:border-b-0 transition-colors"
          >
            <div className="flex items-center gap-2 mb-0.5 min-w-0">
              <span className="text-xs font-semibold text-[#212833] truncate">{m.sender}</span>
              {chIcon(m.channel as Channel)}
              {poMatch && (
                <span className="shrink-0 text-[11px] font-semibold bg-[#9000FF]/10 text-[#9000FF] px-1.5 py-0.5 rounded-full leading-none">
                  PO {poMatch}
                </span>
              )}
              <span className="text-[11px] text-[#9E9FAE] ml-auto shrink-0">{m.timestamp}</span>
            </div>
            <div className="text-xs text-[#5E687B] line-clamp-1">{m.snippet}</div>
          </button>
        );
      })}
    </div>
  );
}

export function GlobalHeader({
  breadcrumb,
  onPasteChat,
  onOpenMessage,
  breadcrumbSegments = [],
}: GlobalHeaderProps) {
  const [, navigate] = useLocation();
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  const { data: apiStages }    = useListStages();
  const { data: apiShipments } = useListShipments();
  const { data: apiMessages }  = useListMessages();
  const { data: focusData }    = useListFocusItems();

  const stages    = useMemo(() => adaptStages(apiStages ?? []),    [apiStages]);
  const shipments = useMemo(() => adaptShipments(apiShipments ?? [], stages), [apiShipments, stages]);
  const messages  = useMemo(() => adaptMessages(apiMessages ?? [], shipments),  [apiMessages, shipments]);

  const unreadCount = useMemo(() => messages.filter(m => m.unread).length, [messages]);
  const focusPendingCount = focusData?.pendingCount ?? 0;

  function handleOpenMessage(id: string) {
    if (onOpenMessage) {
      onOpenMessage(id);
    } else {
      navigate("/");
    }
    setSearchMode(false);
    setSearchQuery("");
  }

  return (
    <>
      <div className="h-12 bg-white border-b border-[#E5EAF0] flex items-center justify-between px-4 shrink-0 relative">
        <div className="font-bold text-sm flex items-center gap-2 w-[200px]">
          <div className="w-5 h-5 rounded-[4px] overflow-hidden shrink-0">
            <img src="/flowforge-logo.png" alt="FlowForgeIQ" className="w-full h-full object-contain" />
          </div>
          <span className="text-[#9000FF] tracking-tight">FlowForgeIQ</span>
          <span className="text-[#E5EAF0]">/</span>
          <span className="text-[#5E687B] font-medium text-xs">{breadcrumb}</span>
          {breadcrumbSegments.length > 0 && (
            <nav aria-label="breadcrumb" className="flex items-center gap-1 shrink-0">
              <ChevronLeft size={10} className="text-[#C0C8D4] shrink-0" />
              {breadcrumbSegments.map((seg, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <span className="text-[#C0C8D4] text-xs select-none">/</span>
                  )}
                  {seg.href ? (
                    <button
                      onClick={() => navigate(seg.href!)}
                      className="text-xs font-medium text-[#9000FF] hover:text-[#7A00D9] transition-colors"
                    >
                      {seg.label}
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-[#5E687B]">
                      {seg.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>

        <div className="flex-1 max-w-md mx-5 relative">
          {searchMode ? (
            <>
              <div className="flex items-center gap-1 absolute left-2 top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={() => { setSearchMode(false); setSearchQuery(""); }}
                  title="AI mode"
                  className="p-0.5 rounded transition-colors text-[#C0C8D4] hover:text-[#5E687B]"
                >
                  <Sparkles size={12} />
                </button>
                <button title="Search mode" className="p-0.5 rounded transition-colors text-[#9000FF]">
                  <Search size={12} />
                </button>
              </div>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search messages, POs, suppliers..."
                className="w-full pl-14 pr-3 py-1.5 bg-[#F0F4F8] border border-transparent rounded-full text-xs text-[#212833] placeholder-[#9E9FAE] focus:bg-white focus:border-[#9000FF]/30 focus:ring-2 focus:ring-[#9000FF]/10 transition-all outline-none"
              />
              {searchQuery && (
                <SearchResults
                  query={searchQuery}
                  messages={messages}
                  shipments={shipments}
                  onOpen={handleOpenMessage}
                />
              )}
            </>
          ) : (
            <AICopilotBar
              className="w-full"
              alwaysOpen
              leftNode={
                <div className="flex items-center gap-1">
                  <button title="AI mode" className="p-0.5 rounded transition-colors text-[#9000FF]">
                    <Sparkles size={12} />
                  </button>
                  <button
                    onClick={() => setSearchMode(true)}
                    title="Search mode"
                    className="p-0.5 rounded transition-colors text-[#C0C8D4] hover:text-[#5E687B]"
                  >
                    <Search size={12} />
                  </button>
                </div>
              }
            />
          )}
        </div>

        <div className="flex items-center gap-3 text-[#5E687B]">
          <AISparklesButton onClick={() => setAiDrawerOpen(true)} pendingCount={focusPendingCount} />
          {onPasteChat && (
            <button
              onClick={onPasteChat}
              className="hover:text-[#212833] p-1"
              title="Paste chat message (WhatsApp / WeChat / iMessage)"
            >
              <Clipboard size={15} />
            </button>
          )}
          <button className="hover:text-[#212833] p-1 relative">
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
            )}
          </button>
          <span className="w-px h-4 bg-[#E5EAF0] shrink-0" />
          <div className="w-7 h-7 rounded-md border border-[#E5EAF0] bg-gradient-to-br from-[#9000FF] to-[#6000FF] flex items-center justify-center text-white text-xs font-bold cursor-pointer">
            AX
          </div>
        </div>
      </div>

      <AIDrawer open={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
    </>
  );
}
