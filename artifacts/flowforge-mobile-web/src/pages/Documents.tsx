import { useState } from "react";
import { useListDocuments } from "@workspace/api-client-react";
import type { DocumentWithExtraction } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { useLocation } from "wouter";
import { Search, X, CheckCircle, Clock, AlertCircle, HelpCircle, FileText, Image, Grid, File, ChevronRight, WifiOff, Inbox } from "lucide-react";

function getStatusConfig(status: string) {
  switch (status) {
    case "extracted": return { color: "#22c55e", Icon: CheckCircle };
    case "processing": return { color: "#f59e0b", Icon: Clock };
    case "failed": return { color: "#e63946", Icon: AlertCircle };
    default: return { color: "#8896a7", Icon: HelpCircle };
  }
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "pdf": return FileText;
    case "image": return Image;
    case "spreadsheet": return Grid;
    default: return File;
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  extracted: "Extracted",
  processing: "Processing",
  unmatched: "Unmatched",
  failed: "Failed",
};

const FILTER_KEYS = ["all", "extracted", "processing", "unmatched", "failed"] as const;

function DocCard({ doc, onClick }: { doc: DocumentWithExtraction; onClick: () => void }) {
  const { color, Icon } = getStatusConfig(doc.status);
  const FileIcon = getFileIcon(doc.fileType);
  const findings = doc.extraction?.reconciliationFindings?.length ?? 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border bg-card p-3.5 flex flex-col gap-2.5 active:opacity-75 transition-opacity"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "hsl(var(--accent))" }}
        >
          <FileIcon size={18} color="hsl(var(--primary))" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{doc.fileName}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {formatBytes(doc.fileSize)} · {doc.sourceChannel} · {formatDate(doc.createdAt)}
          </p>
        </div>
        <ChevronRight size={16} color="hsl(var(--muted-foreground))" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color, backgroundColor: `${color}18` }}
        >
          <Icon size={11} />
          {STATUS_LABELS[doc.status] ?? doc.status}
        </span>
        {doc.shipmentId != null && (
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
            PO #{doc.shipmentId}
          </span>
        )}
        {findings > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: "#f59e0b", backgroundColor: "#f59e0b18" }}>
            ⚠ {findings} finding{findings !== 1 ? "s" : ""}
          </span>
        )}
        {doc.extraction?.confidence != null && doc.extraction.confidence > 0 && (
          <span className="text-[11px] text-muted-foreground ml-auto">
            {Math.round(doc.extraction.confidence * 100)}%
          </span>
        )}
      </div>
    </button>
  );
}

export default function DocumentsPage() {
  const [, navigate] = useLocation();
  const { data: docs, isLoading, isRefetching, refetch, isError } = useListDocuments();
  const [filter, setFilter] = useState<typeof FILTER_KEYS[number]>("all");
  const [search, setSearch] = useState("");

  const filtered = (docs ?? []).filter((d) => {
    const matchFilter = filter === "all" || d.status === filter;
    const matchSearch = search.trim() === "" || d.fileName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <AppShell>
      <div
        className="status-bar-pad px-5 pb-4 shrink-0"
        style={{ background: "hsl(var(--primary))" }}
      >
        <p className="text-white font-bold text-xl tracking-tight">FlowForge</p>
        <p className="text-white/70 text-xs mt-0.5 tracking-wide">Documents</p>
      </div>

      <div className="px-4 pt-3 pb-2 shrink-0 flex flex-col gap-2">
        {/* Search */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-card"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <Search size={15} color="hsl(var(--muted-foreground))" />
          <input
            className="flex-1 bg-transparent text-sm outline-none text-foreground"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={14} color="hsl(var(--muted-foreground))" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {FILTER_KEYS.map((f) => {
            const active = filter === f;
            const count = f === "all" ? (docs?.length ?? 0) : (docs ?? []).filter((d) => d.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-xs px-3 py-1.5 rounded-full border shrink-0 font-medium"
                style={{
                  borderColor: active ? "hsl(var(--primary))" : "hsl(var(--border))",
                  backgroundColor: active ? "hsl(var(--primary))" : "hsl(var(--card))",
                  color: active ? "white" : "hsl(var(--muted-foreground))",
                }}
              >
                {STATUS_LABELS[f]}{count > 0 ? ` ${count}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 scroll-area px-4 pb-4">
        {isLoading && !isRefetching && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--primary))", borderTopColor: "transparent" }} />
            <p className="text-sm text-muted-foreground">Loading documents…</p>
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <WifiOff size={32} color="hsl(var(--muted-foreground))" />
            <p className="text-sm text-muted-foreground text-center">Could not load documents</p>
            <button onClick={() => refetch()} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "hsl(var(--primary))" }}>Retry</button>
          </div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Inbox size={36} color="hsl(var(--muted-foreground))" />
            <p className="font-semibold text-foreground text-center">
              {search || filter !== "all" ? "No matching documents" : "No documents yet"}
            </p>
            <p className="text-sm text-muted-foreground text-center leading-5">
              {search || filter !== "all" ? "Try adjusting your search or filter." : "Documents shared via email will appear here."}
            </p>
          </div>
        )}
        {!isError && filtered.length > 0 && (
          <div className="flex flex-col gap-2.5 pt-1">
            {filtered.map((d) => <DocCard key={d.id} doc={d} onClick={() => navigate(`/documents/${d.id}`)} />)}
            <div className="h-2" />
          </div>
        )}
      </div>
    </AppShell>
  );
}
