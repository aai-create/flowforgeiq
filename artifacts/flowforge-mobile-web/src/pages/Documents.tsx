import { useState } from "react";
import { useListDocuments } from "@workspace/api-client-react";
import type { DocumentWithExtraction } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { GradientHeader } from "@/components/GradientHeader";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
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
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const FILTER_KEYS = ["all", "extracted", "processing", "unmatched", "failed"] as const;

function DocCard({ doc, onClick }: { doc: DocumentWithExtraction; onClick: () => void }) {
  const { t } = useTranslation();
  const { color, Icon } = getStatusConfig(doc.status);
  const FileIcon = getFileIcon(doc.fileType);
  const findings = doc.extraction?.reconciliationFindings?.length ?? 0;

  function statusLabel(status: string) {
    if (status === "extracted") return t("documents.filterExtracted");
    if (status === "processing") return t("documents.filterProcessing");
    if (status === "unmatched") return t("documents.filterUnmatched");
    if (status === "failed") return t("documents.filterFailed");
    return status;
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl bg-card p-4 flex flex-col gap-3 active:opacity-75 transition-all btn-press card-elevated"
      style={{ border: "1px solid hsl(var(--border))" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            backgroundColor: "hsl(var(--accent))",
            border: "1.5px solid hsl(var(--primary) / 0.12)",
          }}
        >
          <FileIcon size={18} color="hsl(var(--primary))" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{doc.fileName}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {formatBytes(doc.fileSize)} · {doc.sourceChannel} · {formatDate(doc.createdAt)}
          </p>
        </div>
        <ChevronRight size={15} color="hsl(var(--muted-foreground))" strokeWidth={2} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-[3px] rounded-full"
          style={{ color, backgroundColor: `${color}18` }}
        >
          <Icon size={11} />
          {statusLabel(doc.status)}
        </span>
        {doc.shipmentId != null && (
          <span
            className="text-[11px] font-medium px-2.5 py-[3px] rounded-full"
            style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
          >
            PO #{doc.shipmentId}
          </span>
        )}
        {findings > 0 && (
          <span
            className="text-[11px] font-medium px-2.5 py-[3px] rounded-full"
            style={{ color: "#d97706", backgroundColor: "#f59e0b18" }}
          >
            ⚠ {findings} {findings !== 1 ? t("documents.findings") : t("documents.finding")}
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
  const { t } = useTranslation();
  const { data: docs, isLoading, isRefetching, refetch, isError } = useListDocuments();
  const [filter, setFilter] = useState<typeof FILTER_KEYS[number]>("all");
  const [search, setSearch] = useState("");

  const filtered = (docs ?? []).filter((d) => {
    const matchFilter = filter === "all" || d.status === filter;
    const matchSearch = search.trim() === "" || d.fileName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const filterLabels: Record<string, string> = {
    all: t("documents.filterAll"),
    extracted: t("documents.filterExtracted"),
    processing: t("documents.filterProcessing"),
    unmatched: t("documents.filterUnmatched"),
    failed: t("documents.filterFailed"),
  };

  return (
    <AppShell>
      {/* Header */}
      <GradientHeader subtitle={t("documents.title")} />

      {/* Search + filter bar */}
      <div className="px-4 pt-3 pb-2 shrink-0 flex flex-col gap-2.5">
        <div
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-card card-elevated"
          style={{ border: "1px solid hsl(var(--border))" }}
        >
          <Search size={15} color="hsl(var(--muted-foreground))" />
          <input
            className="flex-1 bg-transparent text-sm outline-none text-foreground"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("documents.searchPlaceholder")}
          />
          {search && (
            <button onClick={() => setSearch("")} className="active:opacity-60">
              <X size={14} color="hsl(var(--muted-foreground))" />
            </button>
          )}
        </div>

        {/* Filter pill-tabs */}
        <div className="pill-scroll-row">
          {FILTER_KEYS.map((f) => {
            const active = filter === f;
            const count = f === "all" ? (docs?.length ?? 0) : (docs ?? []).filter((d) => d.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-xs px-3.5 py-2 rounded-full shrink-0 transition-all font-semibold"
                style={{
                  border: `1.5px solid ${active ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                  backgroundColor: active ? "hsl(var(--primary))" : "hsl(var(--card))",
                  color: active ? "white" : "hsl(var(--muted-foreground))",
                }}
              >
                {filterLabels[f]}{count > 0 ? ` ${count}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 scroll-area px-4 pb-4">
        {/* Loading */}
        {isLoading && !isRefetching && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="app-spinner" />
            <p className="text-sm text-muted-foreground">{t("documents.loadingDocuments")}</p>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "hsl(var(--muted))" }}
            >
              <WifiOff size={26} color="hsl(var(--muted-foreground))" />
            </div>
            <p className="text-sm font-medium text-foreground">{t("documents.cantLoad")}</p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white btn-press"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
                boxShadow: "0 4px 12px hsl(var(--primary) / 0.35)",
              }}
            >
              {t("common.retry")}
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "hsl(var(--accent))" }}
            >
              <Inbox size={28} color="hsl(var(--primary))" />
            </div>
            <p className="font-semibold text-foreground text-center">
              {search || filter !== "all" ? t("documents.noMatchingDocs") : t("documents.noDocsYet")}
            </p>
            <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-[240px]">
              {search || filter !== "all"
                ? t("documents.adjustFilter")
                : t("documents.emailDesc")}
            </p>
          </div>
        )}

        {/* List */}
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
