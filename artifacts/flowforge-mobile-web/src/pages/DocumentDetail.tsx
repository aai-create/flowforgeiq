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
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "extracted":
      return { color: "#22c55e", Icon: CheckCircle, label: "Extracted" };
    case "processing":
      return { color: "#f59e0b", Icon: Clock, label: "Processing" };
    case "failed":
      return { color: "#e63946", Icon: AlertCircle, label: "Failed" };
    default:
      return { color: "#8896a7", Icon: HelpCircle, label: status };
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

function FieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between items-start gap-3 py-2 border-b last:border-b-0" style={{ borderColor: "hsl(var(--border))" }}>
      <span className="text-xs text-muted-foreground flex-shrink-0 w-32">{label}</span>
      <span className="text-xs font-medium text-foreground text-right break-all">{String(value)}</span>
    </div>
  );
}

function ShipmentPickerSheet({
  onSelect,
  onClose,
}: {
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="flex-1" onClick={onClose} />
      <div className="bg-card rounded-t-2xl max-h-[70vh] flex flex-col" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <p className="font-semibold text-foreground text-base">Link to Shipment</p>
          <button onClick={onClose}><X size={20} color="hsl(var(--muted-foreground))" /></button>
        </div>
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-background" style={{ borderColor: "hsl(var(--border))" }}>
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

interface FieldEditState {
  key: string;
  draft: string;
}

function EditableFieldRow({
  label,
  fieldKey,
  value,
  docId,
  documentType,
  editingKey,
  setEditingKey,
}: {
  label: string;
  fieldKey: string;
  value: string | number | null | undefined;
  docId: number;
  documentType: string;
  editingKey: string | null;
  setEditingKey: (k: string | null) => void;
}) {
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const { mutate: saveCorrection, isPending } = useSaveExtractionCorrection();
  const isEditing = editingKey === fieldKey;

  function handleSave() {
    saveCorrection(
      {
        id: docId,
        data: {
          fieldPath: fieldKey,
          correctedValue: draft,
          documentType,
          originalValue: value != null ? String(value) : undefined,
        },
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
    <div className="py-2.5 border-b last:border-b-0" style={{ borderColor: "hsl(var(--border))" }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        {savedKey === fieldKey ? (
          <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: "#22c55e" }}>
            <Check size={11} /> Saved
          </span>
        ) : isEditing ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setEditingKey(null)}
              className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-md border"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md text-white"
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
          className="w-full text-sm text-foreground bg-background border rounded-lg px-3 py-2 outline-none focus:ring-1"
          style={{ borderColor: "hsl(var(--primary))", "--tw-ring-color": "hsl(var(--primary))" } as React.CSSProperties}
        />
      ) : (
        <p className="text-sm font-medium text-foreground break-all">{value != null && value !== "" ? String(value) : <span className="text-muted-foreground italic text-xs">—</span>}</p>
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
        <div className="status-bar-pad px-5 pb-4 flex items-center gap-3" style={{ background: "hsl(var(--primary))" }}>
          <button onClick={() => navigate("/documents")}><ArrowLeft size={20} color="white" /></button>
          <p className="text-white font-bold text-lg">Document</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "hsl(var(--primary))", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto">
        <div className="status-bar-pad px-5 pb-4 flex items-center gap-3" style={{ background: "hsl(var(--primary))" }}>
          <button onClick={() => navigate("/documents")}><ArrowLeft size={20} color="white" /></button>
          <p className="text-white font-bold text-lg">Document</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <p className="text-muted-foreground text-center">Could not load document.</p>
          <button onClick={() => navigate("/documents")} className="px-5 py-2.5 rounded-xl text-white font-semibold" style={{ backgroundColor: "hsl(var(--primary))" }}>
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
        <div className="status-bar-pad px-5 pb-4 flex items-start gap-3 shrink-0" style={{ background: "hsl(var(--primary))" }}>
          <button onClick={() => navigate("/documents")} className="mt-0.5">
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg leading-tight truncate">{doc.fileName}</p>
            <p className="text-white/70 text-xs mt-0.5">
              {formatBytes(doc.fileSize)} · {doc.sourceChannel} · {formatDate(doc.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex-1 scroll-area px-4 pt-4 pb-4 flex flex-col gap-4">
          {/* Status + file type */}
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "hsl(var(--accent))" }}>
              <FileIcon size={20} color="hsl(var(--primary))" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {doc.fileType.toUpperCase()} · {doc.mimeType}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Icon size={13} color={color} />
                <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                {extraction?.confidence != null && extraction.confidence > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    ({Math.round(extraction.confidence * 100)}% conf.)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Shipment linking */}
          <div className="rounded-xl border bg-card p-4 flex flex-col gap-3" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Linked Shipment</p>
            {linkedSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#22c55e18" }}>
                <Check size={14} color="#22c55e" />
                <span className="text-xs text-[#22c55e] font-medium">Shipment linked successfully</span>
              </div>
            )}
            {linkedShipment ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "hsl(var(--accent))" }}>
                  <Package size={15} color="hsl(var(--primary))" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">PO {linkedShipment.poNumber}</p>
                    <p className="text-xs text-muted-foreground truncate">{linkedShipment.product}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPicker(true)}
                    className="flex-1 text-xs font-medium py-2.5 rounded-xl border"
                    style={{ borderColor: "hsl(var(--primary))50", color: "hsl(var(--primary))" }}
                  >
                    Change
                  </button>
                  <button
                    onClick={handleUnlink}
                    disabled={isLinking}
                    className="flex-1 text-xs font-medium py-2.5 rounded-xl border"
                    style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
                  >
                    Unlink
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowPicker(true)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border font-medium"
                style={{ borderColor: "hsl(var(--primary))50", color: "hsl(var(--primary))" }}
              >
                <Search size={15} />
                Link to shipment
              </button>
            )}
          </div>

          {/* Extraction error */}
          {extraction?.errorMessage && (
            <div className="rounded-xl border p-4 flex gap-3" style={{ backgroundColor: "#e6394610", borderColor: "#e6394640" }}>
              <AlertCircle size={18} color="#e63946" />
              <div>
                <p className="text-sm font-semibold text-foreground">Extraction failed</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-[1.5]">{extraction.errorMessage}</p>
              </div>
            </div>
          )}

          {/* Extracted fields — editable with correction support */}
          {fields && Object.keys(fields).length > 0 && (
            <div className="rounded-xl border bg-card p-4 flex flex-col" style={{ borderColor: "hsl(var(--border))" }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Extracted Fields</p>
                <span className="text-[10px] text-muted-foreground">Tap Edit to correct</span>
              </div>
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
          )}

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="rounded-xl border bg-card p-4 flex flex-col gap-2" style={{ borderColor: "hsl(var(--border))" }}>
              <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Line Items</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {Object.keys(lineItems[0] ?? {}).map((h) => (
                        <th key={h} className="text-left text-muted-foreground font-medium pb-2 pr-3 whitespace-nowrap">
                          {h.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((row, i) => (
                      <tr key={i} style={{ borderTop: i > 0 ? "1px solid hsl(var(--border))" : undefined }}>
                        {Object.values(row as Record<string, unknown>).map((v, j) => (
                          <td key={j} className="py-2 pr-3 text-foreground whitespace-nowrap">{String(v ?? "—")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reconciliation findings */}
          {findings.length > 0 && (
            <div className="rounded-xl border bg-card p-4 flex flex-col gap-2" style={{ borderColor: "hsl(var(--border))" }}>
              <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
                Reconciliation Findings ({findings.length})
              </p>
              <div className="flex flex-col gap-2">
                {findings.map((f, i) => (
                  <div
                    key={i}
                    className="px-3 py-2.5 rounded-xl"
                    style={{ backgroundColor: "#f59e0b14", borderLeft: "3px solid #f59e0b" }}
                  >
                    <p className="text-xs font-medium text-foreground">{(f as any).field ?? `Finding ${i + 1}`}</p>
                    {(f as any).description && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-[1.4]">{(f as any).description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          {extraction?.transcriptText && (
            <div className="rounded-xl border bg-card p-4 flex flex-col gap-2" style={{ borderColor: "hsl(var(--border))" }}>
              <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Transcript</p>
              <p className="text-xs text-muted-foreground leading-[1.6] whitespace-pre-wrap">{extraction.transcriptText}</p>
            </div>
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
