import React, { useMemo, useRef, useState } from "react";
import {
  useCreateSampleRequest,
  useListDocuments,
  useUpdateRfqQuote,
  useUpdateSampleRequest,
  useUploadDocument,
  getListDocumentsQueryKey,
  getListRfqsQueryKey,
  getListSampleRequestsQueryKey,
} from "@workspace/api-client-react";
import type { RfqQuote, RfqWithQuotes, SampleRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Check, CheckCircle2, Circle, FileText, Mail, Paperclip, Truck,
  Upload, X, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type JourneyProps = {
  rfq: RfqWithQuotes;
  onConvert: (quoteId: number) => void;
};

const stages = [
  ["quotes", "rfqs.sourcing.quotesReceived"],
  ["requested", "rfqs.sourcing.sampleRequested"],
  ["received", "rfqs.sourcing.sampleReceived"],
  ["approval", "rfqs.sourcing.writtenApproval"],
  ["ready", "rfqs.sourcing.poReady"],
] as const;

function stageIndex(rfq: RfqWithQuotes) {
  const samples = rfq.samples ?? [];
  if (samples.some(s => s.approvalOutcome === "approved" && s.milestone === "approved")) return 4;
  if (samples.some(s => s.approvalOutcome === "changes_requested")) return 2;
  if (samples.some(s => s.milestone === "sample_received")) return 2;
  if (samples.length) return 1;
  if (rfq.quotes.length) return 0;
  return -1;
}

function sampleLabel(sample: SampleRequest) {
  if (sample.approvalOutcome === "approved") return "Approved";
  if (sample.approvalOutcome === "changes_requested") return "Changes requested";
  if (sample.milestone === "sample_received") return "Received — review required";
  if (sample.milestone === "sample_shipped") return "In transit";
  return "Requested";
}

function Evidence({ sample }: { sample: SampleRequest }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { data: documents = [], isLoading } = useListDocuments({ sampleRequestId: sample.id });
  const upload = useUploadDocument();
  const [error, setError] = useState<string | null>(null);

  async function uploadEvidence(file: File) {
    setError(null);
    try {
      await upload.mutateAsync({ data: { file, sampleRequestId: sample.id, sourceChannel: "rfq_sample" } });
      await queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey({ sampleRequestId: sample.id }) });
      await queryClient.invalidateQueries({ queryKey: getListRfqsQueryKey() });
    } catch {
      setError("Evidence upload failed. Please try again.");
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-[#d9d2ee] bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#5f4c99]"><Paperclip size={12} /> {t("rfqs.sourcing.evidence")}</span>
        <button type="button" className="flex items-center gap-1 rounded-md border border-[#ded8ef] px-2 py-1 text-[10px] font-bold text-[#7457c7] hover:bg-[#f7f4ff]" onClick={() => inputRef.current?.click()}>
          <Upload size={11} /> {t("rfqs.sourcing.upload")}
        </button>
        <input ref={inputRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={e => { const file = e.target.files?.[0]; if (file) void uploadEvidence(file); e.currentTarget.value = ""; }} />
      </div>
      {isLoading ? <p className="mt-2 text-[10px] text-[#8b93a0]">{t("common.loading")}</p> : documents.length === 0 ? <p className="mt-2 text-[10px] text-[#8b93a0]">{t("rfqs.sourcing.noEvidence")}</p> : (
        <ul className="mt-2 space-y-1">
          {documents.map(doc => <li key={doc.id} className="flex items-center gap-1.5 truncate text-[10px] text-[#586273]"><FileText size={11} className="shrink-0 text-[#8e78c9]" />{doc.fileName}<span className="ml-auto shrink-0 text-[9px] text-[#9ba2ad]">{doc.status}</span></li>)}
        </ul>
      )}
      {error && <p className="mt-2 flex items-center gap-1 text-[10px] text-red-600"><AlertCircle size={11} />{error}</p>}
    </div>
  );
}

function SampleCard({ sample, rfq, onRefresh }: { sample: SampleRequest; rfq: RfqWithQuotes; onRefresh: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const update = useUpdateSampleRequest();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [review, setReview] = useState(sample.writtenApproval ?? "");
  const [tracking, setTracking] = useState(sample.trackingCode ?? "");
  const [carrier, setCarrier] = useState(sample.carrierName ?? "");
  const [error, setError] = useState<string | null>(null);
  const quote = rfq.quotes.find(q => q.id === sample.rfqQuoteId);

  async function save(data: Parameters<typeof update.mutateAsync>[0]["data"]) {
    setError(null);
    try {
      await update.mutateAsync({ id: sample.id, data });
      await queryClient.invalidateQueries({ queryKey: getListRfqsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getListSampleRequestsQueryKey() });
      onRefresh();
      setReviewOpen(false);
    } catch {
      setError("Could not save this sample update.");
    }
  }

  function email(kind: "request" | "followup") {
    const subject = kind === "request" ? `Sample request — ${rfq.product} · RFQ-${rfq.id}` : `Sample follow-up — ${rfq.product} · RFQ-${rfq.id}`;
    const body = kind === "request"
      ? `Hello ${sample.supplierName ?? quote?.factoryName ?? "supplier"},\n\nPlease send a production sample for ${rfq.product} under RFQ-${rfq.id}. Quantity: ${rfq.quantity}. Please share tracking and photos when shipped.\n\nThank you.`
      : `Hello ${sample.supplierName ?? quote?.factoryName ?? "supplier"},\n\nFollowing up on the ${rfq.product} sample for RFQ-${rfq.id}. Current tracking: ${sample.trackingCode ?? "not provided"}. Please share an update and any inspection evidence.\n\nThank you.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <article className="rounded-xl border border-[#e3def0] bg-[#fbfaff] p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold text-[#303946]">{sample.supplierName ?? quote?.factoryName ?? "Supplier"} <span className="font-normal text-[#9299a5]">· Quote #{sample.rfqQuoteId ?? "—"}</span></p>
          <p className="mt-1 text-[10px] text-[#747d8a]">{sample.product} · {sampleLabel(sample)}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${sample.approvalOutcome === "approved" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : sample.approvalOutcome === "changes_requested" ? "border-amber-100 bg-amber-50 text-amber-700" : "border-[#ded8ef] bg-white text-[#7054b5]"}`}>{sampleLabel(sample)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-3">
        <div><span className="block text-[#9ba2ad]">Tracking</span><span className="font-semibold text-[#586273]">{sample.trackingCode ?? "Not added"}</span></div>
        <div><span className="block text-[#9ba2ad]">Carrier</span><span className="font-semibold text-[#586273]">{sample.carrierName ?? "Not added"}</span></div>
        <div><span className="block text-[#9ba2ad]">Requested</span><span className="font-semibold text-[#586273]">{new Date(sample.createdAt).toLocaleDateString()}</span></div>
      </div>
      {sample.approvalOutcome && <div className="mt-3 rounded-md bg-white p-2.5 text-[10px] text-[#5e687b]"><span className="font-bold text-[#4e416f]">{sample.approvalOutcome === "approved" ? "Written approval" : "Requested changes"}:</span> {sample.writtenApproval}</div>}
      <Evidence sample={sample} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {sample.milestone === "sample_requested" && <button type="button" className="rounded-md border border-[#dfe3e9] bg-white px-2 py-1.5 text-[10px] font-bold text-[#5e687b]" onClick={() => void save({ milestone: "sample_shipped", trackingCode: tracking || null, carrierName: carrier || null })}><Truck size={11} className="mr-1 inline" /> Mark shipped</button>}
        {sample.milestone === "sample_shipped" && <button type="button" className="rounded-md border border-[#dfe3e9] bg-white px-2 py-1.5 text-[10px] font-bold text-[#5e687b]" onClick={() => void save({ milestone: "sample_received", trackingCode: tracking || null, carrierName: carrier || null })}><Check size={11} className="mr-1 inline" /> Mark received</button>}
        {sample.milestone === "sample_received" || sample.approvalOutcome === "changes_requested" ? <button type="button" className="rounded-md bg-[#7457c7] px-2 py-1.5 text-[10px] font-bold text-white hover:bg-[#6246ab]" onClick={() => setReviewOpen(v => !v)}>{sample.approvalOutcome === "changes_requested" ? "Record new review" : "Review sample"}</button> : null}
        <button type="button" className="flex items-center gap-1 rounded-md border border-[#dfe3e9] bg-white px-2 py-1.5 text-[10px] font-bold text-[#5e687b]" onClick={() => email(sample.milestone === "sample_requested" ? "request" : "followup")}><Mail size={11} /> {sample.milestone === "sample_requested" ? "Request email" : "Follow-up email"}</button>
      </div>
      {(sample.milestone === "sample_requested" || sample.milestone === "sample_shipped") && <div className="mt-2 flex gap-2"><input aria-label="Tracking number" value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Tracking number" className="min-w-0 flex-1 rounded-md border border-[#e1e5eb] bg-white px-2 py-1.5 text-[10px] outline-none focus:border-[#7457c7]" /><input aria-label="Carrier" value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Carrier" className="w-28 rounded-md border border-[#e1e5eb] bg-white px-2 py-1.5 text-[10px] outline-none focus:border-[#7457c7]" /></div>}
      {reviewOpen && <div className="mt-3 rounded-lg border border-[#d8d0ee] bg-white p-3"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-bold text-[#4e416f]">Written review</p><button type="button" onClick={() => setReviewOpen(false)} aria-label="Close review"><X size={13} /></button></div><textarea value={review} onChange={e => setReview(e.target.value)} placeholder="Record the buyer's written approval or the changes requested…" className="min-h-20 w-full resize-y rounded-md border border-[#e1e5eb] p-2 text-[10px] outline-none focus:border-[#7457c7]" /><div className="mt-2 flex flex-wrap gap-2"><Button size="sm" className="h-7 bg-emerald-600 px-2 text-[10px] text-white hover:bg-emerald-700" disabled={!review.trim() || update.isPending} onClick={() => void save({ approvalOutcome: "approved", writtenApproval: review.trim() })}><CheckCircle2 size={12} className="mr-1" /> Approve sample</Button><Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" disabled={!review.trim() || update.isPending} onClick={() => void save({ approvalOutcome: "changes_requested", writtenApproval: review.trim() })}>Request changes</Button></div></div>}
      {error && <p className="mt-2 text-[10px] text-red-600">{error}</p>}
    </article>
  );
}

export function RfqSourcingJourney({ rfq, onConvert }: JourneyProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const create = useCreateSampleRequest();
  const shortlist = useUpdateRfqQuote();
  const [error, setError] = useState<string | null>(null);
  const currentStage = stageIndex(rfq);
  const samples = rfq.samples ?? [];
  const shortlistedQuotes = useMemo(() => rfq.quotes.filter(q => q.shortlisted), [rfq.quotes]);
  const approvedQuoteIds = new Set(samples.filter(s => s.approvalOutcome === "approved" && s.milestone === "approved").map(s => s.rfqQuoteId));

  async function toggleShortlist(quote: RfqQuote) {
    setError(null);
    try {
      await shortlist.mutateAsync({ id: rfq.id, quoteId: quote.id, data: { shortlisted: !quote.shortlisted } });
      await queryClient.invalidateQueries({ queryKey: getListRfqsQueryKey() });
    } catch {
      setError("Could not update the shortlist.");
    }
  }

  async function requestSample(quote: RfqQuote) {
    setError(null);
    try {
      await create.mutateAsync({ data: { rfqId: rfq.id, rfqQuoteId: quote.id, supplierId: quote.supplierId ?? undefined, product: rfq.product, quantity: rfq.quantity, notes: `Sample round for RFQ-${rfq.id}` } });
      await queryClient.invalidateQueries({ queryKey: getListRfqsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getListSampleRequestsQueryKey() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start the sample round.");
    }
  }

  return (
    <section className="border-b border-[#e8eaee] bg-[#fdfcff] px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b7ab2]">{t("rfqs.sourcing.title")}</p><h2 className="mt-1 text-sm font-bold text-[#303946]">{t("rfqs.sourcing.subtitle")}</h2></div>
        <p className="max-w-xs text-right text-[10px] leading-4 text-[#707989]">{currentStage < 0 ? t("rfqs.sourcing.addQuoteFirst") : currentStage < 4 ? t("rfqs.sourcing.nextAction") : t("rfqs.sourcing.approvedUnlocksPo")}</p>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-1" aria-label="RFQ sourcing stages">
        {stages.map(([key, label], index) => <div key={key} className="min-w-0"><div className="flex items-center">{index <= currentStage ? <CheckCircle2 size={15} className="shrink-0 text-[#7457c7]" /> : <Circle size={15} className="shrink-0 text-[#c8ccd4]" />}{index < stages.length - 1 && <div className={`mx-1 h-px flex-1 ${index < currentStage ? "bg-[#a796d3]" : "bg-[#e4e6eb]"}`} />}</div><p className={`mt-1 text-[9px] leading-3 ${index <= currentStage ? "font-bold text-[#5f4c99]" : "text-[#8b93a0]"}`}>{t(label)}</p></div>)}
      </div>
      <div className="mt-4 rounded-lg border border-[#ebe7f5] bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-bold text-[#4b5360]">{t("rfqs.sourcing.shortlistTitle")}</p><span className="text-[9px] text-[#8b93a0]">{shortlistedQuotes.length} {t("rfqs.sourcing.shortlisted")}</span></div>
        <div className="mt-2 space-y-2">{rfq.quotes.map(quote => <div key={quote.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[#fafbfc] px-2.5 py-2"><div className="min-w-0"><p className="truncate text-[10px] font-bold text-[#4d5664]">{quote.factoryName}</p><p className="text-[9px] text-[#8b93a0]">${quote.unitPriceUsd.toFixed(2)} · {quote.leadTimeDays} days · MOQ {quote.moq}</p></div><div className="flex items-center gap-1.5">{quote.shortlisted && <span className="text-[9px] font-bold text-[#7457c7]">Shortlisted</span>}<button type="button" onClick={() => void toggleShortlist(quote)} className={`rounded-md border px-2 py-1 text-[9px] font-bold ${quote.shortlisted ? "border-[#cfc3eb] bg-[#f4f0ff] text-[#7457c7]" : "border-[#dfe3e9] bg-white text-[#687282]"}`}>{quote.shortlisted ? "Remove" : "Shortlist"}</button>{quote.shortlisted && !samples.some(s => s.rfqQuoteId === quote.id) && <button type="button" onClick={() => void requestSample(quote)} className="rounded-md bg-[#7457c7] px-2 py-1 text-[9px] font-bold text-white">Request sample</button>}{approvedQuoteIds.has(quote.id) && <button type="button" onClick={() => onConvert(quote.id)} className="rounded-md bg-emerald-600 px-2 py-1 text-[9px] font-bold text-white">Create PO</button>}</div></div>)}</div>
      </div>
      {samples.length > 0 && <div className="mt-4 space-y-3"><div className="flex items-center justify-between"><p className="text-[10px] font-bold text-[#4b5360]">{t("rfqs.sourcing.samplesTitle")}</p><span className="text-[9px] text-[#8b93a0]">{samples.length} {t("rfqs.sourcing.rounds")}</span></div>{samples.map(sample => <SampleCard key={sample.id} sample={sample} rfq={rfq} onRefresh={() => void queryClient.invalidateQueries({ queryKey: getListRfqsQueryKey() })} />)}</div>}
      {error && <p className="mt-3 flex items-center gap-1 text-[10px] text-red-600"><AlertCircle size={11} />{error}</p>}
    </section>
  );
}