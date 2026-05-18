import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, FileText, Image, FileSpreadsheet, Mic, X, CheckCircle2,
  AlertCircle, Clock, ChevronRight, ChevronDown, Edit2, Check,
  Sparkles, RefreshCw, Link2, Package, AlertTriangle, Info,
  FileBox, Zap, Eye, ChevronLeft, CornerDownRight, Mail, MessageSquare,
} from "lucide-react";
import {
  useListDocuments, useUploadDocument, useUpdateDocument,
  useSaveExtractionCorrection, useListShipments,
} from "@workspace/api-client-react";
import type {
  DocumentWithExtraction, Extraction, ExtractedFields,
  ReconciliationFinding, ExtractedLineItem, ExtractionFieldProvenance,
} from "@workspace/api-client-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fileTypeIcon(mime: string, size = 18) {
  if (mime.startsWith("image/")) return <Image size={size} className="text-blue-500" />;
  if (mime === "application/pdf") return <FileText size={size} className="text-red-500" />;
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.endsWith("csv"))
    return <FileSpreadsheet size={size} className="text-green-500" />;
  if (mime.startsWith("audio/")) return <Mic size={size} className="text-purple-500" />;
  return <FileText size={size} className="text-[#5E687B]" />;
}

function fileTypeBg(mime: string) {
  if (mime.startsWith("image/")) return "bg-blue-50 border-blue-100";
  if (mime === "application/pdf") return "bg-red-50 border-red-100";
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.endsWith("csv"))
    return "bg-green-50 border-green-100";
  if (mime.startsWith("audio/")) return "bg-purple-50 border-purple-100";
  return "bg-[#F0F4F8] border-[#E5EAF0]";
}

function confidenceColor(c: number) {
  if (c >= 0.8) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (c >= 0.5) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function confidenceLabel(c: number) {
  if (c >= 0.8) return "High";
  if (c >= 0.5) return "Medium";
  return "Low";
}

function statusBadge(status: string) {
  if (status === "processing")
    return <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200"><RefreshCw size={8} className="animate-spin" />Processing</span>;
  if (status === "extracted")
    return <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200"><CheckCircle2 size={8} />Extracted</span>;
  if (status === "failed")
    return <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200"><AlertCircle size={8} />Failed</span>;
  if (status === "unmatched")
    return <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200"><AlertTriangle size={8} />Unmatched</span>;
  return <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"><Clock size={8} />{status}</span>;
}

function channelBadge(sourceChannel: string) {
  if (sourceChannel === "gmail")
    return (
      <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200">
        <Mail size={8} />Email
      </span>
    );
  if (sourceChannel === "whatsapp")
    return (
      <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
        <MessageSquare size={8} />WhatsApp
      </span>
    );
  return null;
}

// ─── DropZone ───────────────────────────────────────────────────────────────

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  uploading: boolean;
}

function DropZone({ onFiles, uploading }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }, [onFiles]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all select-none ${
        dragging
          ? "border-[#9000FF] bg-[#9000FF]/5 scale-[1.01]"
          : "border-[#E5EAF0] bg-white hover:border-[#9000FF]/50 hover:bg-[#FAFBFF]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.csv,.mp3,.wav,.m4a"
        className="hidden"
        onChange={e => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); }}
      />
      {uploading ? (
        <>
          <RefreshCw size={28} className="text-[#9000FF] animate-spin" />
          <p className="text-xs font-medium text-[#5E687B]">Uploading & extracting…</p>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-xl bg-[#9000FF]/8 border border-[#9000FF]/20 flex items-center justify-center">
            <Upload size={22} className="text-[#9000FF]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#212833]">Drop documents here</p>
            <p className="text-[11px] text-[#5E687B] mt-0.5">PDFs, images, spreadsheets, audio — or <span className="text-[#9000FF] font-medium underline underline-offset-1">browse</span></p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {["PDF", "JPEG/PNG", "XLS/CSV", "MP3/WAV"].map(t => (
              <span key={t} className="text-[9px] font-semibold bg-[#F0F4F8] border border-[#E5EAF0] px-2 py-0.5 rounded-full text-[#5E687B]">{t}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Field editor ────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  value: string | number | undefined | null;
  fieldPath: string;
  confidence: number;
  snippet?: string;
  extractionId: number;
  documentType: string;
  onCorrect: (field: string, corrected: string) => void;
}

function FieldRow({ label, value, fieldPath, confidence, snippet, extractionId, documentType, onCorrect }: FieldRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const [saved, setSaved] = useState(false);
  const { mutate: saveCorrection } = useSaveExtractionCorrection();

  const handleSave = () => {
    if (draft === String(value ?? "")) { setEditing(false); return; }
    saveCorrection({ id: extractionId, data: { documentType, fieldPath, correctedValue: draft, originalValue: String(value ?? "") } }, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); onCorrect(fieldPath, draft); },
    });
    setEditing(false);
  };

  const displayVal = String(value ?? "—");
  const isEmpty = !value;
  // Only show confidence badge when there is an actual extracted value
  const showConfidence = !isEmpty;
  // Values with per-field confidence below 0.65 were inferred rather than directly read
  const isInferred = !isEmpty && confidence < 0.65;

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-[#F0F4F8] last:border-b-0 group">
      <div className="w-[130px] shrink-0 text-[10px] text-[#5E687B] font-medium pt-0.5">{label}</div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 text-[11px] border border-[#9000FF]/40 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-[#9000FF]/30 bg-white"
            />
            <button onClick={handleSave} className="p-0.5 text-emerald-600 hover:text-emerald-700"><Check size={12} /></button>
            <button onClick={() => setEditing(false)} className="p-0.5 text-[#5E687B] hover:text-[#212833]"><X size={12} /></button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-medium ${isEmpty ? "text-[#C0C8D4] italic" : isInferred ? "text-amber-700" : "text-[#212833]"}`}>
                {displayVal}
              </span>
              {isInferred && (
                <span className="text-[8px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded" title="AI inferred this value — please verify">
                  inferred
                </span>
              )}
              {saved && <Check size={10} className="text-emerald-500" />}
              <button
                onClick={() => { setDraft(String(value ?? "")); setEditing(true); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[#F0F4F8] text-[#9E9FAE] hover:text-[#9000FF]"
              >
                <Edit2 size={10} />
              </button>
            </div>
            {snippet && !isEmpty && (
              <p className="text-[9px] text-[#5E687B] italic mt-0.5 truncate" title={snippet}>
                "{snippet}"
              </p>
            )}
          </div>
        )}
      </div>
      {showConfidence && (
        <div className={`shrink-0 text-[8px] font-semibold px-1 py-0.5 rounded border ${confidenceColor(confidence)}`}>
          {Math.round(confidence * 100)}%
        </div>
      )}
    </div>
  );
}

// ─── Document Detail ─────────────────────────────────────────────────────────

interface DocumentDetailProps {
  doc: DocumentWithExtraction;
  shipments: { id: number; po: string; supplier: string }[];
  onBack: () => void;
  onLinked: (docId: number, shipmentId: number | null) => void;
}

function DocumentDetail({ doc, shipments, onBack, onLinked }: DocumentDetailProps) {
  const ext = doc.extraction;
  const fields = ext?.extractedFields ?? {};
  const provenance = (ext?.fieldProvenance ?? {}) as Record<string, { confidence: number; snippet: string }>;
  const lineItems = ext?.lineItems ?? [];
  const findings = ext?.reconciliationFindings ?? [];
  const [localFields, setLocalFields] = useState<Record<string, string>>({});
  const [linkOpen, setLinkOpen] = useState(false);
  const { mutate: updateDoc } = useUpdateDocument();

  const fieldMap: { label: string; key: keyof ExtractedFields }[] = [
    { label: "Document Type", key: "documentType" },
    { label: "PO Number", key: "poNumber" },
    { label: "Invoice Number", key: "invoiceNumber" },
    { label: "Invoice Date", key: "invoiceDate" },
    { label: "Supplier", key: "supplier" },
    { label: "Buyer", key: "buyer" },
    { label: "Total Amount", key: "totalAmount" },
    { label: "Currency", key: "currency" },
    { label: "Payment Terms", key: "paymentTerms" },
    { label: "Incoterms", key: "incoterms" },
    { label: "ETD", key: "etd" },
    { label: "ETA", key: "eta" },
    { label: "Port of Loading", key: "portOfLoading" },
    { label: "Port of Discharge", key: "portOfDischarge" },
    { label: "QC Result", key: "qcResult" },
  ];

  const handleCorrect = (field: string, val: string) => {
    setLocalFields(prev => ({ ...prev, [field]: val }));
  };

  const handleLink = (shipmentId: number | null) => {
    updateDoc({ id: doc.id, data: { shipmentId } }, { onSuccess: () => onLinked(doc.id, shipmentId) });
    setLinkOpen(false);
  };

  const linkedShipment = shipments.find(s => s.id === doc.shipmentId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E5EAF0] shrink-0">
        <button onClick={onBack} className="p-1 rounded hover:bg-[#F0F4F8] text-[#5E687B] hover:text-[#212833]"><ChevronLeft size={15} /></button>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${fileTypeBg(doc.mimeType)}`}>
          {fileTypeIcon(doc.mimeType, 15)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#212833] truncate">{doc.fileName}</p>
          <p className="text-[10px] text-[#5E687B]">{fmtDate(doc.createdAt)} · {fmtSize(doc.fileSize)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge(doc.status)}
          {ext && (
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${confidenceColor(ext.confidence)}`}>
              {confidenceLabel(ext.confidence)} confidence
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Shipment Link */}
        <div className="bg-white border border-[#E5EAF0] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#F0F4F8] bg-[#FAFBFC]">
            <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider flex items-center gap-1.5"><Link2 size={10} />Shipment Link</span>
            <button onClick={() => setLinkOpen(v => !v)} className="text-[10px] text-[#9000FF] font-semibold hover:underline">
              {linkedShipment ? "Change" : "Link to PO"}
            </button>
          </div>
          <div className="p-3">
            {linkedShipment ? (
              <div className="flex items-center gap-2">
                <Package size={13} className="text-[#9000FF] shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold text-[#212833]">{linkedShipment.po}</p>
                  <p className="text-[10px] text-[#5E687B]">{linkedShipment.supplier}</p>
                </div>
                <button onClick={() => handleLink(null)} className="ml-auto p-0.5 text-[#C0C8D4] hover:text-red-500"><X size={11} /></button>
              </div>
            ) : (
              <p className="text-[11px] text-[#C0C8D4] italic">No shipment linked</p>
            )}
            {linkOpen && (
              <div className="mt-2 border border-[#E5EAF0] rounded-lg overflow-hidden shadow-sm max-h-[180px] overflow-y-auto">
                {shipments.map(s => (
                  <button key={s.id} onClick={() => handleLink(s.id)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-[#F0F4F8] border-b border-[#F0F4F8] last:border-b-0">
                    <Package size={11} className="text-[#9000FF] shrink-0" />
                    <span className="text-[11px] font-semibold text-[#212833]">{s.po}</span>
                    <span className="text-[10px] text-[#5E687B] truncate">{s.supplier}</span>
                    {s.id === doc.shipmentId && <Check size={11} className="text-emerald-500 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reconciliation findings */}
        {findings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-amber-200">
              <AlertTriangle size={11} className="text-amber-600" />
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">{findings.length} Reconciliation {findings.length === 1 ? "Issue" : "Issues"}</span>
            </div>
            <div className="divide-y divide-amber-100">
              {findings.map((f, i) => (
                <div key={i} className="px-3 py-2 flex items-start gap-2">
                  <span className={`mt-0.5 text-[8px] font-bold px-1 py-0.5 rounded border shrink-0 ${f.severity === "high" ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                    {f.severity?.toUpperCase() ?? "WARN"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-[#212833]">{f.field}</p>
                    <p className="text-[9px] text-[#5E687B]">{f.type}: expected <span className="font-medium text-emerald-700">{f.expected}</span> · got <span className="font-medium text-red-700">{f.actual}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extracted fields */}
        {ext && (
          <div className="bg-white border border-[#E5EAF0] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#F0F4F8] bg-[#FAFBFC]">
              <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider flex items-center gap-1.5"><Sparkles size={10} className="text-[#9000FF]" />Extracted Fields</span>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${confidenceColor(ext.confidence)}`}>
                {Math.round(ext.confidence * 100)}% confidence
              </span>
            </div>
            <div className="px-3 py-2">
              {fieldMap.map(({ label, key }) => (
                <FieldRow
                  key={key}
                  label={label}
                  value={(localFields[key] ?? fields[key]) as string | number | undefined}
                  fieldPath={key}
                  confidence={provenance[key]?.confidence ?? ext.confidence}
                  snippet={provenance[key]?.snippet}
                  extractionId={ext.id}
                  documentType={fields.documentType ?? "other"}
                  onCorrect={handleCorrect}
                />
              ))}
              {fields.transcriptSummary && (
                <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded-lg">
                  <p className="text-[9px] font-bold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1"><Mic size={9} />Transcript Summary</p>
                  <p className="text-[10px] text-[#212833] leading-relaxed">{fields.transcriptSummary}</p>
                </div>
              )}
              {(fields.detectedEntities ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(fields.detectedEntities ?? []).map((e, i) => (
                    <span key={i} className="text-[9px] bg-[#F0F4F8] border border-[#E5EAF0] px-1.5 py-0.5 rounded-full text-[#5E687B]">{e}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Line items */}
        {lineItems.length > 0 && (
          <div className="bg-white border border-[#E5EAF0] rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-[#F0F4F8] bg-[#FAFBFC]">
              <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">{lineItems.length} Line Items</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-[#F0F4F8]">
                    {["Description", "Qty", "Unit Price", "Total"].map(h => (
                      <th key={h} className="text-left px-3 py-1.5 text-[#5E687B] font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-b border-[#F0F4F8] last:border-b-0 hover:bg-[#FAFBFC]">
                      <td className="px-3 py-2 text-[#212833]">{item.description ?? "—"}</td>
                      <td className="px-3 py-2 text-[#5E687B]">{item.quantity ?? "—"}</td>
                      <td className="px-3 py-2 text-[#5E687B]">{item.unitPrice != null ? `$${item.unitPrice}` : "—"}</td>
                      <td className="px-3 py-2 text-[#212833] font-medium">{item.totalPrice != null ? `$${item.totalPrice}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error */}
        {doc.status === "failed" && ext?.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-red-700 flex items-center gap-1 mb-1"><AlertCircle size={11} />Extraction Failed</p>
            <p className="text-[10px] text-red-600">{ext.errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Document row ────────────────────────────────────────────────────────────

interface DocRowProps {
  doc: DocumentWithExtraction;
  selected: boolean;
  shipments: { id: number; po: string; supplier: string }[];
  onClick: () => void;
}

function DocRow({ doc, selected, shipments, onClick }: DocRowProps) {
  const ext = doc.extraction;
  const linked = shipments.find(s => s.id === doc.shipmentId);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-3 py-2.5 border-b border-[#F0F4F8] hover:bg-[#FAFBFF] transition-colors ${selected ? "bg-[#FAFBFF] border-l-2 border-l-[#9000FF]" : ""}`}
    >
      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${fileTypeBg(doc.mimeType)}`}>
        {fileTypeIcon(doc.mimeType, 14)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[11px] font-semibold text-[#212833] truncate">{doc.fileName}</span>
          {doc.status === "processing" && <RefreshCw size={9} className="text-blue-400 animate-spin shrink-0" />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {statusBadge(doc.status)}
          {channelBadge(doc.sourceChannel)}
          {linked ? (
            <span className="text-[9px] text-[#9000FF] flex items-center gap-0.5 font-medium"><Package size={8} />{linked.po}</span>
          ) : (
            <span className="text-[9px] text-amber-500 italic">unlinked</span>
          )}
          {ext && (
            <span className={`text-[8px] font-semibold px-1 py-0.5 rounded border ${confidenceColor(ext.confidence)}`}>
              {Math.round(ext.confidence * 100)}%
            </span>
          )}
          {(ext?.reconciliationFindings ?? []).length > 0 && (
            <span className="text-[8px] text-red-600 flex items-center gap-0.5 font-medium"><AlertTriangle size={8} />{ext!.reconciliationFindings.length} issue{ext!.reconciliationFindings.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="text-[9px] text-[#9E9FAE] mt-0.5">{relTime(doc.createdAt)} · {fmtSize(doc.fileSize)}</div>
      </div>
      <ChevronRight size={13} className="text-[#C0C8D4] shrink-0 mt-1" />
    </button>
  );
}

// ─── Main DocumentIntake component ──────────────────────────────────────────

interface DocumentIntakeProps {
  onDone: () => void;
}

export function DocumentIntake({ onDone }: DocumentIntakeProps) {
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pollInterval, setPollInterval] = useState<number | false>(false);
  const [localDocs, setLocalDocs] = useState<DocumentWithExtraction[]>([]);

  const { data: rawDocs, refetch } = useListDocuments(undefined, {
    query: { refetchInterval: pollInterval || undefined, queryKey: ["listDocuments"] },
  });
  const { data: shipmentsData } = useListShipments();
  const { mutate: upload, isPending: uploading } = useUploadDocument();

  const shipmentOptions = (shipmentsData ?? []).map(s => ({
    id: s.id,
    po: s.poNumber ?? `#${s.id}`,
    supplier: s.supplierName ?? "",
  }));

  useEffect(() => {
    if (rawDocs) setLocalDocs(rawDocs);
  }, [rawDocs]);

  // Poll quickly while any doc is processing; poll every 30s otherwise
  // to catch new inbound email / WhatsApp attachments as they arrive.
  useEffect(() => {
    const hasProcessing = localDocs.some(d => d.status === "processing");
    setPollInterval(hasProcessing ? 2000 : 30000);
  }, [localDocs]);

  const handleFiles = (files: File[]) => {
    for (const file of files) {
      const optimistic: DocumentWithExtraction = {
        id: Date.now() + Math.random(),
        fileName: file.name,
        fileType: file.type,
        mimeType: file.type,
        fileSize: file.size,
        sourceChannel: "upload",
        status: "processing",
        createdAt: new Date().toISOString(),
      };
      setLocalDocs(prev => [optimistic, ...prev]);

      upload({ data: { file: file as unknown as Blob } }, {
        onSuccess: (created) => {
          setLocalDocs(prev => prev.map(d => d.id === optimistic.id ? created : d));
          setPollInterval(2000);
        },
        onError: () => {
          setLocalDocs(prev => prev.map(d => d.id === optimistic.id ? { ...d, status: "failed" } : d));
        },
      });
    }
  };

  const handleLinked = (docId: number, shipmentId: number | null) => {
    setLocalDocs(prev => prev.map(d => d.id === docId ? { ...d, shipmentId } : d));
  };

  const filteredDocs = localDocs.filter(d => {
    if (statusFilter === "all") return true;
    if (statusFilter === "unmatched") return !d.shipmentId && d.status !== "processing";
    if (statusFilter === "issues") return (d.extraction?.reconciliationFindings ?? []).length > 0;
    return d.status === statusFilter;
  });

  const selectedDoc = localDocs.find(d => d.id === selectedDocId) ?? null;

  const counts = {
    all: localDocs.length,
    processing: localDocs.filter(d => d.status === "processing").length,
    extracted: localDocs.filter(d => d.status === "extracted").length,
    unmatched: localDocs.filter(d => !d.shipmentId && d.status !== "processing").length,
    issues: localDocs.filter(d => (d.extraction?.reconciliationFindings ?? []).length > 0).length,
    failed: localDocs.filter(d => d.status === "failed").length,
  };

  const FILTERS: { id: string; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "processing", label: "Processing", count: counts.processing },
    { id: "extracted", label: "Extracted", count: counts.extracted },
    { id: "unmatched", label: "Unlinked", count: counts.unmatched },
    { id: "issues", label: "Issues", count: counts.issues },
    { id: "failed", label: "Failed", count: counts.failed },
  ];

  return (
    <div className="flex-1 flex overflow-hidden bg-[#FAFBFC]">

      {/* Left panel — list */}
      <div className="w-[340px] shrink-0 flex flex-col border-r border-[#E5EAF0] bg-white">

        {/* Upload zone */}
        <div className="p-4 border-b border-[#E5EAF0]">
          <DropZone onFiles={handleFiles} uploading={uploading} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[#E5EAF0] overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                statusFilter === f.id
                  ? "bg-[#9000FF] text-white"
                  : "text-[#5E687B] hover:bg-[#F0F4F8]"
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`text-[9px] rounded-full px-1 ${statusFilter === f.id ? "bg-white/25 text-white" : "bg-[#F0F4F8] text-[#5E687B]"}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Doc list */}
        <div className="flex-1 overflow-y-auto">
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#9E9FAE] gap-3">
              <FileBox size={28} className="opacity-30" />
              <p className="text-xs">
                {statusFilter === "all" ? "No documents yet — drop files above" : `No ${statusFilter} documents`}
              </p>
            </div>
          ) : (
            filteredDocs.map(doc => (
              <DocRow
                key={doc.id}
                doc={doc}
                selected={doc.id === selectedDocId}
                shipments={shipmentOptions}
                onClick={() => setSelectedDocId(doc.id)}
              />
            ))
          )}
        </div>

        {/* Footer stats */}
        <div className="px-3 py-2 border-t border-[#E5EAF0] flex items-center gap-3 bg-[#FAFBFC]">
          <span className="text-[9px] text-[#9E9FAE]">{counts.all} documents</span>
          {counts.processing > 0 && (
            <span className="flex items-center gap-1 text-[9px] text-blue-500"><RefreshCw size={8} className="animate-spin" />{counts.processing} processing</span>
          )}
          {counts.issues > 0 && (
            <span className="flex items-center gap-1 text-[9px] text-amber-500"><AlertTriangle size={8} />{counts.issues} issues</span>
          )}
          <button onClick={() => refetch()} className="ml-auto p-1 rounded hover:bg-[#F0F4F8] text-[#C0C8D4] hover:text-[#5E687B]" title="Refresh">
            <RefreshCw size={10} />
          </button>
        </div>
      </div>

      {/* Right panel — detail or empty state */}
      {selectedDoc ? (
        <DocumentDetail
          doc={selectedDoc}
          shipments={shipmentOptions}
          onBack={() => setSelectedDocId(null)}
          onLinked={handleLinked}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[#9E9FAE]">
          <div className="w-16 h-16 rounded-2xl bg-[#9000FF]/5 border border-[#9000FF]/10 flex items-center justify-center">
            <Zap size={28} className="text-[#9000FF]/30" />
          </div>
          <div className="text-center max-w-xs">
            <p className="text-sm font-semibold text-[#5E687B] mb-1">Document Intelligence</p>
            <p className="text-xs leading-relaxed">Upload PDFs, spreadsheets, images, or audio files. AI extracts structured fields, matches to POs, and flags discrepancies automatically.</p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {[
              { icon: <FileText size={12} className="text-red-500" />, label: "Commercial invoices → PO reconciliation" },
              { icon: <FileSpreadsheet size={12} className="text-green-500" />, label: "Packing lists → line item extraction" },
              { icon: <Image size={12} className="text-blue-500" />, label: "QC photos → pass/fail detection" },
              { icon: <Mic size={12} className="text-purple-500" />, label: "Voice memos → transcript + summary" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-white border border-[#E5EAF0] rounded-lg px-3 py-2 shadow-sm">
                {item.icon}
                <span className="text-[10px] text-[#5E687B]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
