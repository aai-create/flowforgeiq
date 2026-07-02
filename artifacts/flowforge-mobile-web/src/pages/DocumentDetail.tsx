import { useParams, useLocation } from "wouter";
import {
  useGetDocument,
  useUpdateDocument,
  useListShipments,
  useSaveExtractionCorrection,
} from "@workspace/api-client-react";
import type { DocumentWithExtraction, ExtractedFields } from "@workspace/api-client-react";
import {
  ArrowLeft,
  FileText,
  Image,
  Grid,
  File,
  CheckCircle,
  Clock,
  AlertCircle,
  HelpCircle,
  Package,
  Search,
  ChevronRight,
  X,
  Check,
  Edit2,
} from "lucide-react";
import { useState } from "react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "extracted": return { color: "#22c55e", Icon: CheckCircle, label: "Extracted" };
    case "processing": return { color: "#f59e0b", Icon: Clock, label: "Processing" };
    case "failed": return { color: "#e63946", Icon: AlertCircle, label: "Failed" };
    default: return { color: "#8896a7", Icon: HelpCircle, label: status };
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

const GRADIENT_HEADER = {
  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
  boxShadow: "0 2px 16px hsl(var(--primary) / 0.3)",
};

function SectionPanel({ title, children, badge }: { title: string; children: React.ReactNode; badge?: string }) {
  return (
    <div className="section-panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="section-label">{title}</p>
        {badge && <span className="text-[10px] text-muted-foreground">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function ShipmentPickerSheet({ onSelect, onClose }: { onSelect: (id: number) => void; onClose: () => void }) {
  const { data: shipments } = useListShipments();
  const [q, setQ] = useState("");
  const filtered = (shipments ?? [])
    .filter((s) => {
      if (!q.trim()) return true;
      const ql = q.toLowerCase();
      return (
        s.poNumber?.toLowerCase().includes(ql) ||
        s.product?.toLowerCase().includes(ql) ||
        s.supplierName?.toLowerCase().includes(ql)
      );
    })
    .slice(0, 20);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div className="flex-1" onClick={onClose} />
      <div
        className="bg-card rounded-t-3xl max-h-[72vh] flex flex-col"
        style={{ borderTop: "1px solid hsl(var(--border))" }}
      >
        <div
          className="flex items-center justify-between px-5 pt-4 pb-3"
          style={{ borderBottom: "1px solid hsl(var(--border))" }}
        >
          <p className="font-bold text-foreground text-base">Link to Shipment</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center active:opacity-60"
            style={{ backgroundColor: "hsl(var(--muted))" }}
          >
            <X size={16} color="hsl(var(--muted-foreground))" />
          </button>
        </div>
        <div className="px-4 pt-3 pb-2">
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-background"
            style={{ border: "1px solid hsl(var(--border))" }}
          >
            <Search size={14} color="hsl(var(--muted-foreground))" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="PO number, product, supplier…"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No shipments found</p>
          ) : (
            filtered.map((s, i) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className="w-full flex items-center justify-between py-3.5 active:opacity-60"
                style={{ borderTop: i > 0 ? "1px solid hsl(var(--border))" : undefined }}
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">PO {s.poNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.product}{s.supplierName ? ` · ${s.supplierName}` : ""}
                  </p>
                </div>
                <ChevronRight size={14} color="hsl(var(--muted-foreground))" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EditableFieldRow({
  label, fieldKey, value, docId, documentType, editingKey, setEditingKey,
}: {
  label: string; fieldKey: string; value: string | number | null | undefined;
  docId: number; documentType: string; editingKey: string | null; setEditingKey: (k: string | null) => void;
}) {
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const { mutate: saveCorrection, isPending } = useSaveExtractionCorrection();
  const isEditing = editingKey === fieldKey;

  function handleSave() {
    saveCorrection(
      {
        id: docId,
        data: { fieldPath: fieldKey, correctedValue: draft, documentType, originalValue: value != null ? String(value) : undefined },
      },
      {
        onSuccess: () => {
          setSavedKey(fieldKey);
          setEditingKey(null);
          setTimeout(() => setSavedKey(null), 2000);
        },
      }
    );
  }

  return (
    <div
      className="py-2.5"
      style={{ borderBottom: "1px solid hsl(var(--border) / 0.7)" }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        {savedKey === fieldKey ? (
          <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "#22c55e" }}>
            <Check size={11} strokeWidth={2.5} /> Saved
          </span>
        ) : isEditing ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setEditingKey(null)}
              className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-lg"
              style={{ border: "1px solid hsl(var(--border))" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white"
              style={{ backgroundColor: "hsl(var(--primary))" }}
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(value != null ? String(value) : ""); setEditingKey(fieldKey); }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground active:opacity-60"
          >
            <Edit2 size={11} /> Edit
          </button>
        )}
      </div>
      {isEditing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditingKey(null); }}
          className="w-full text-sm text-foreground bg-background border rounded-xl px-3 py-2.5 outline-none"
          style={{ borderColor: "hsl(var(--primary))", boxShadow: "0 0 0 3px hsl(var(--primary) / 0.12)" }}
        />
      ) : (
        <p className="text-sm font-semibold text-foreground break-all leading-snug">
          {value != null && value !== "" ? String(value) : <span className="text-muted-foreground italic text-xs font-normal">—</span>}
        </p>
      )}
    </div>
  );
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const docId = Number(id);
  const { data: doc, isLoading, isError } = useGetDocument(docId);
  const { mutate: updateDoc, isPending: isLinking } = useUpdateDocument();
  const { data: shipments } = useListShipments();
  const [showPicker, setShowPicker] = useState(false);
  const [linkedSuccess, setLinkedSuccess] = useState(false);
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto">
        <div className="status-bar-pad px-5 pb-5 flex items-center gap-3 shrink-0" style={GRADIENT_HEADER}>
          <button onClick={() => navigate("/documents")} className="active:opacity-60">
            <ArrowLeft size={20} color="white" />
          </button>
          <p className="text-white font-bold text-[17px]">Document</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="app-spinner" />
        </div>
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto">
        <div className="status-bar-pad px-5 pb-5 flex items-center gap-3 shrink-0" style={GRADIENT_HEADER}>
          <button onClick={() => navigate("/documents")} className="active:opacity-60">
            <ArrowLeft size={20} color="white" />
          </button>
          <p className="text-white font-bold text-[17px]">Document</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-muted-foreground text-center">Could not load document.</p>
          <button
            onClick={() => navigate("/documents")}
            className="px-5 py-2.5 rounded-xl text-white font-semibold btn-press"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(274 100% 43%) 100%)",
              boxShadow: "0 4px 12px hsl(var(--primary) / 0.35)",
            }}
          >
            Back to Documents
          </button>
        </div>
      </div>
    );
  }

  const { color, Icon, label } = getStatusConfig(doc.status);
  const FileIcon = getFileIcon(doc.fileType);
  const extraction = doc.extraction;
  const linkedShipment = doc.shipmentId != null
    ? (shipments ?? []).find((s) => s.id === doc.shipmentId)
    : null;
  const fields = extraction?.extractedFields as Record<string, unknown> | undefined;
  const lineItems = extraction?.lineItems ?? [];
  const findings = extraction?.reconciliationFindings ?? [];

  function handleLinkShipment(shipId: number) {
    updateDoc(
      { id: docId, data: { shipmentId: shipId } },
      {
        onSuccess: () => {
          setShowPicker(false);
          setLinkedSuccess(true);
          setTimeout(() => setLinkedSuccess(false), 2500);
        },
      }
    );
  }

  function handleUnlink() {
    updateDoc({ id: docId, data: { shipmentId: null } });
  }

  return (
    <>
      <div className="flex flex-col h-full max-w-lg mx-auto overflow-hidden">
        {/* Header */}
        <div className="status-bar-pad px-5 pb-5 flex items-start gap-3 shrink-0" style={GRADIENT_HEADER}>
          <button onClick={() => navigate("/documents")} className="mt-0.5 active:opacity-60">
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[17px] leading-tight truncate">{doc.fileName}</p>
            <p className="text-white/65 text-xs mt-0.5">
              {formatBytes(doc.fileSize)} · {doc.sourceChannel} · {formatDate(doc.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-4">

          {/* File type + status */}
          <SectionPanel title="File Info">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: "hsl(var(--accent))",
                  border: "1.5px solid hsl(var(--primary) / 0.12)",
                }}
              >
                <FileIcon size={22} color="hsl(var(--primary))" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {doc.fileType.toUpperCase()} · {doc.mimeType}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-[3px] rounded-full"
                    style={{ backgroundColor: `${color}18` }}
                  >
                    <Icon size={12} color={color} />
                    <span className="text-[11px] font-bold" style={{ color }}>{label}</span>
                  </div>
                  {extraction?.confidence != null && extraction.confidence > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(extraction.confidence * 100)}% conf.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </SectionPanel>

          {/* Shipment linking */}
          <SectionPanel title="Linked Shipment">
            {linkedSuccess && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: "#22c55e12", border: "1px solid #22c55e25" }}
              >
                <Check size={14} color="#22c55e" strokeWidth={2.5} />
                <span className="text-xs font-semibold" style={{ color: "#22c55e" }}>Shipment linked successfully</span>
              </div>
            )}
            {linkedShipment ? (
              <div className="flex flex-col gap-2">
                <div
                  className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
                  style={{
                    backgroundColor: "hsl(var(--accent))",
                    border: "1.5px solid hsl(var(--primary) / 0.2)",
                  }}
                >
                  <Package size={15} color="hsl(var(--primary))" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">PO {linkedShipment.poNumber}</p>
                    <p className="text-xs text-muted-foreground truncate">{linkedShipment.product}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPicker(true)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center transition-all active:opacity-75"
                    style={{
                      border: "1.5px solid hsl(var(--primary) / 0.4)",
                      color: "hsl(var(--primary))",
                      backgroundColor: "hsl(var(--primary) / 0.05)",
                    }}
                  >
                    Change
                  </button>
                  <button
                    onClick={handleUnlink}
                    disabled={isLinking}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center active:opacity-75"
                    style={{
                      border: "1px solid hsl(var(--border))",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    Unlink
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowPicker(true)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold active:opacity-75 btn-press"
                style={{
                  border: "1.5px solid hsl(var(--primary) / 0.35)",
                  color: "hsl(var(--primary))",
                  backgroundColor: "hsl(var(--primary) / 0.05)",
                }}
              >
                <Search size={15} />
                Link to shipment
              </button>
            )}
          </SectionPanel>

          {/* Extraction error */}
          {extraction?.errorMessage && (
            <div
              className="rounded-2xl p-4 flex gap-3"
              style={{ backgroundColor: "#e6394610", border: "1px solid #e6394635" }}
            >
              <AlertCircle size={18} color="#e63946" className="shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Extraction failed</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{extraction.errorMessage}</p>
              </div>
            </div>
          )}

          {/* Extracted fields */}
          {fields && Object.keys(fields).length > 0 && (
            <SectionPanel title="Extracted Fields" badge="Tap Edit to correct">
              <div>
                {Object.entries(fields).map(([key, val]) => (
                  <EditableFieldRow
                    key={key}
                    label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    fieldKey={key}
                    value={val as string | number | null}
                    docId={docId}
                    documentType={doc.fileType}
                    editingKey={editingFieldKey}
                    setEditingKey={setEditingFieldKey}
                  />
                ))}
              </div>
            </SectionPanel>
          )}

          {/* Line items */}
          {lineItems.length > 0 && (
            <SectionPanel title="Line Items">
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {Object.keys(lineItems[0] ?? {}).map((h) => (
                        <th
                          key={h}
                          className="text-left font-semibold pb-2.5 pr-3 whitespace-nowrap"
                          style={{ color: "hsl(var(--muted-foreground))", borderBottom: "1px solid hsl(var(--border))" }}
                        >
                          {h.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((row, i) => (
                      <tr key={i} style={{ borderTop: i > 0 ? "1px solid hsl(var(--border) / 0.6)" : undefined }}>
                        {Object.values(row as Record<string, unknown>).map((v, j) => (
                          <td key={j} className="py-2 pr-3 text-foreground whitespace-nowrap font-medium">
                            {String(v ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionPanel>
          )}

          {/* Reconciliation findings */}
          {findings.length > 0 && (
            <SectionPanel title={`Reconciliation Findings (${findings.length})`}>
              <div className="flex flex-col gap-2">
                {findings.map((f, i) => (
                  <div
                    key={i}
                    className="px-3.5 py-3 rounded-xl"
                    style={{
                      backgroundColor: "#f59e0b10",
                      borderLeft: "3px solid #f59e0b",
                      border: "1px solid #f59e0b25",
                    }}
                  >
                    <p className="text-xs font-bold text-foreground">{(f as any).field ?? `Finding ${i + 1}`}</p>
                    {(f as any).description && (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{(f as any).description}</p>
                    )}
                  </div>
                ))}
              </div>
            </SectionPanel>
          )}

          {/* Transcript */}
          {extraction?.transcriptText && (
            <SectionPanel title="Transcript">
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {extraction.transcriptText}
              </p>
            </SectionPanel>
          )}

          <div className="h-2" />
        </div>
      </div>

      {showPicker && (
        <ShipmentPickerSheet
          onSelect={handleLinkShipment}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
