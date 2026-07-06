import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useSearch, useLocation } from "wouter";
import { Settings2, Save, Eye, RefreshCw, MessageCircle, MessageSquare, Mail, Copy, Check, Smartphone, ChevronDown, ChevronRight, ExternalLink, Zap, Users, Trash2, Plus, UserPlus, LogOut, Crown, GitBranch, GripVertical, Pencil, X, Globe, Download, PlayCircle, Key, AlertTriangle } from "lucide-react";
import { useTour } from "@/hooks/useTour";
import { useGetPoNumberingConfig, useUpdatePoNumberingConfig, useGetInboundEmailAddress, useUpdateInboundEmailHandle, useListStages, useCreateStage, useUpdateStage, useDeleteStage, useReorderStages, useListDeviceTokens, useCreateDeviceToken, useDeleteDeviceToken, getListDeviceTokensQueryKey, useGetCopilotSettings, useUpdateCopilotSettings } from "@workspace/api-client-react";
import type { Stage, CreateDeviceTokenResponse } from "@workspace/api-client-react";
import { NavSidebar } from "@/components/NavSidebar";
import { useUser, useClerk } from "@clerk/react";
import { useUserPref } from "@/lib/useUserPref";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { SECTION_LABEL, PAGE_TITLE, BODY_MUTED } from "@/lib/typography";
import { useQueryClient } from "@tanstack/react-query";

type SettingsTab = "general" | "pipeline" | "channels" | "team";

const isIOS =
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function BeeperSection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#E5EAF0] rounded-lg overflow-hidden mb-5">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-3.5 py-3 bg-[#FAFBFC] hover:bg-[#F0F4F8] transition-colors text-left">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[#9000FF]"/>
          <span className="text-xs font-semibold text-[#212833]">{t("settings.channels.upgradeTitle")}</span>
          <span className="text-[9px] font-bold bg-[#9000FF]/8 text-[#9000FF] border border-[#9000FF]/15 px-1.5 py-0.5 rounded-full">Beeper</span>
        </div>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-[#9E9FAE]"/> : <ChevronRight className="w-3.5 h-3.5 text-[#9E9FAE]"/>}
      </button>
      {open && (
        <div className="px-3.5 py-3 border-t border-[#E5EAF0] bg-white space-y-2.5">
          <p className="text-[11px] text-[#5E687B] leading-relaxed">{t("settings.channels.beeperDesc")}</p>
          <ul className="space-y-1.5">
            {([
              t("settings.channels.beeperFeature1"),
              t("settings.channels.beeperFeature2"),
              t("settings.channels.beeperFeature3"),
            ] as string[]).map(item => (
              <li key={item} className="flex items-start gap-1.5 text-[11px] text-[#5E687B]">
                <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5"/>
                {item}
              </li>
            ))}
          </ul>
          <a href="https://beeper.com/desktop-api" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9000FF] hover:text-[#7A00D9] transition-colors">
            <ExternalLink className="w-3 h-3"/>
            {t("settings.channels.learnBeeper")}
          </a>
        </div>
      )}
    </div>
  );
}

function CopilotSettingsSection() {
  const { data, isLoading } = useGetCopilotSettings();
  const updateMutation = useUpdateCopilotSettings();
  const [minMessages, setMinMessages] = useState<number>(5);
  const [minDays, setMinDays] = useState<number>(14);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setMinMessages(data.sparseThreadMinMessages);
      setMinDays(data.sparseThreadMinDays);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        data: { sparseThreadMinMessages: minMessages, sparseThreadMinDays: minDays },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
  };

  return (
    <section className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-3.5 h-3.5 text-[#9000FF]" />
        <h2 className="text-sm font-bold text-[#212833]">Copilot</h2>
      </div>
      <p className="text-xs text-[#5E687B] mb-5 leading-relaxed">
        Configure when the copilot flags a shipment thread as sparse. The warning appears inline on proposals when a thread has fewer messages than expected for the time spent in the current stage.
      </p>
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-[#9E9FAE]">
          <RefreshCw className="w-3 h-3 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">
                Sparse threshold — messages
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={minMessages}
                onChange={e => setMinMessages(Number(e.target.value))}
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
              />
              <p className="text-[10px] text-[#9E9FAE] mt-1">Flag threads with fewer than this many messages.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">
                Sparse threshold — days in stage
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={minDays}
                onChange={e => setMinDays(Number(e.target.value))}
                className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
              />
              <p className="text-[10px] text-[#9E9FAE] mt-1">Only flag if shipment has been in this stage for more than this many days.</p>
            </div>
          </div>
          <button
            onClick={() => void handleSave()}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#9000FF] text-white rounded-md text-xs font-bold hover:bg-[#7A00D9] disabled:opacity-50 transition-colors"
          >
            {saved ? <><Check className="w-3 h-3" />Saved</> : updateMutation.isPending ? "Saving…" : <><Save className="w-3 h-3" />Save</>}
          </button>
        </div>
      )}
    </section>
  );
}

function buildPreview(prefix: string, format: string, suffix: string, seq: number) {
  const buyerPo = prefix + format.replace("{seq}", String(seq).padStart(4, "0"));
  return { buyerPo, supplierPo: buyerPo + suffix };
}

interface TeamMember {
  clerkUserId: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface TeamInvitation {
  id: number;
  email: string;
  role: string;
  token: string;
  invitedBy: string;
  createdAt: string;
  acceptedAt: string | null;
  inviteUrl: string;
}

function TeamSection() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [myRole, setMyRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string; emailSent: boolean; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const loadTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${basePath}api/team`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { members: TeamMember[]; pendingInvitations: TeamInvitation[] };
      setMembers(data.members);
      setPendingInvitations(data.pendingInvitations);
      const me = data.members.find(m => m.clerkUserId === user?.id);
      if (me) setMyRole(me.role);
    } catch {
      setError(t("settings.team.couldNotLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTeam(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      setError(t("settings.team.inviteError"));
      return;
    }
    setInviting(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}api/team/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.status === 403) { setError(t("settings.team.adminOnly")); return; }
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { inviteUrl: string; emailSent?: boolean };
      setInviteResult({ url: data.inviteUrl, emailSent: data.emailSent === true, email: inviteEmail.trim() });
      setInviteEmail("");
      void loadTeam();
    } catch {
      setError(t("settings.team.failed"));
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (clerkUserId: string) => {
    if (!confirm(t("settings.team.removeConfirm"))) return;
    try {
      await fetch(`${basePath}api/team/${clerkUserId}`, { method: "DELETE" });
      void loadTeam();
    } catch {
      setError(t("settings.team.removeError"));
    }
  };

  const handleCancelInvitation = async (id: number) => {
    try {
      await fetch(`${basePath}api/team/invitations/${id}`, { method: "DELETE" });
      void loadTeam();
    } catch {
      setError(t("settings.team.cancelFailed"));
    }
  };

  const [resendingId, setResendingId] = useState<number | null>(null);
  const [resendResult, setResendResult] = useState<{ id: number; emailSent: boolean } | null>(null);

  const handleResendInvitation = async (id: number) => {
    setResendingId(id);
    setResendResult(null);
    try {
      const res = await fetch(`${basePath}api/team/invitations/${id}/resend`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { emailSent: boolean };
      setResendResult({ id, emailSent: data.emailSent });
      void loadTeam();
    } catch {
      setError(t("settings.team.resendFailed"));
    } finally {
      setResendingId(null);
    }
  };

  const copyInviteLink = (url: string) => {
    const finish = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(finish).catch(() => {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { document.execCommand("copy"); finish(); } catch { window.prompt("Copy this link:", url); }
        document.body.removeChild(ta);
      });
    } else {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); finish(); } catch { window.prompt("Copy this link:", url); }
      document.body.removeChild(ta);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#9E9FAE] py-4">
        <RefreshCw className="w-3 h-3 animate-spin" /> {t("common.loadingTeam")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-xs px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Members list */}
      <div className="bg-white border border-[#E5EAF0] rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-[#9000FF]" />
          <span className="text-xs font-bold text-[#212833]">{t("settings.team.members")}</span>
          <span className="ml-auto text-[10px] font-bold bg-[#E5EAF0] text-[#5E687B] px-1.5 py-0.5 rounded-full">{members.length}</span>
        </div>
        {members.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-[#9E9FAE]">{t("settings.team.noMembers")}</div>
        ) : (
          <ul className="divide-y divide-[#E5EAF0]">
            {members.map(m => (
              <li key={m.clerkUserId} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-[#9000FF]">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#212833] truncate">{m.name}</span>
                    {m.clerkUserId === user?.id && (
                      <span className="text-[9px] font-bold text-[#9000FF] bg-[#9000FF]/8 border border-[#9000FF]/15 px-1 py-0.5 rounded-full">{t("common.you")}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#9E9FAE] truncate">{m.email}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${
                    m.role === "admin"
                      ? "bg-amber-50 text-amber-700 border-amber-100"
                      : "bg-[#F0F4F8] text-[#5E687B] border-[#E5EAF0]"
                  }`}>
                    {m.role === "admin" && <Crown className="w-2.5 h-2.5" />}
                    {m.role}
                  </span>
                  {myRole === "admin" && m.clerkUserId !== user?.id && (
                    <button
                      onClick={() => void handleRemove(m.clerkUserId)}
                      className="p-1 text-[#9E9FAE] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white border border-[#E5EAF0] rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center gap-2">
            <UserPlus className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-[#212833]">{t("settings.team.pendingInvites")}</span>
            <span className="ml-auto text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full">{pendingInvitations.length}</span>
          </div>
          <ul className="divide-y divide-[#E5EAF0]">
            {pendingInvitations.map(inv => {
              const isExpired = Date.now() - new Date(inv.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000;
              const wasResent = resendResult?.id === inv.id;
              return (
                <li key={inv.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#212833] truncate">{inv.email}</span>
                        {isExpired && (
                          <span className="text-[9px] font-bold bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-full shrink-0">{t("settings.team.expired")}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#9E9FAE]">
                        {t("settings.team.invitedAs")} <span className="font-medium">{inv.role}</span>
                        {" · "}
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => copyInviteLink(inv.inviteUrl)}
                        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium border border-[#E5EAF0] rounded-md text-[#5E687B] hover:bg-[#F0F4F8] transition-colors"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        {t("settings.team.copyLink")}
                      </button>
                      {myRole === "admin" && (
                        <button
                          onClick={() => void handleResendInvitation(inv.id)}
                          disabled={resendingId === inv.id}
                          className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium border border-[#9000FF]/30 rounded-md text-[#9000FF] hover:bg-[#9000FF]/5 disabled:opacity-60 transition-colors"
                          title={t("settings.team.resend")}
                        >
                          {resendingId === inv.id
                            ? <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            : <RefreshCw className="w-2.5 h-2.5" />}
                          {t("settings.team.resend")}
                        </button>
                      )}
                      {myRole === "admin" && (
                        <button
                          onClick={() => void handleCancelInvitation(inv.id)}
                          className="p-1 text-[#9E9FAE] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {wasResent && (
                    <div className={`flex items-center gap-1.5 text-[10px] rounded-md px-2.5 py-1.5 ${resendResult.emailSent ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {resendResult.emailSent
                        ? <><Check className="w-3 h-3 shrink-0" />{t("settings.team.resendEmailSent", { email: inv.email })}</>
                        : <><Mail className="w-3 h-3 shrink-0" />{t("settings.team.resendLinkReady")}</>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Invite form (admin only) */}
      {myRole === "admin" && (
        <div className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-3.5 h-3.5 text-[#9000FF]" />
            <h3 className="text-xs font-bold text-[#212833]">{t("settings.team.inviteTitle")}</h3>
          </div>
          <p className="text-[11px] text-[#5E687B] mb-4 leading-relaxed">{t("settings.team.inviteDesc")}</p>
          <div className="flex gap-2 mb-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && void handleInvite()}
              placeholder={t("settings.team.emailPlaceholder")}
              className="flex-1 border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as "admin" | "member")}
              className="border border-[#E5EAF0] rounded-md px-2.5 py-2 text-sm text-[#212833] outline-none focus:border-[#9000FF] bg-white"
            >
              <option value="member">{t("settings.team.roleMember")}</option>
              <option value="admin">{t("settings.team.roleAdmin")}</option>
            </select>
          </div>
          <button
            onClick={() => void handleInvite()}
            disabled={inviting}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] disabled:opacity-60 rounded-md transition-colors"
          >
            {inviting ? <><RefreshCw className="w-3 h-3 animate-spin" />{t("settings.team.inviting")}</> : <><UserPlus className="w-3 h-3" />{t("settings.team.sendInvite")}</>}
          </button>

          {inviteResult && (
            <div className="mt-4 space-y-2">
              {inviteResult.emailSent ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3.5 py-3 flex items-start gap-2.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">{t("settings.team.emailSentTitle")}</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">{t("settings.team.emailSentDesc", { email: inviteResult.email })}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3.5 py-2.5 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-700">{t("settings.team.emailFallback")}</p>
                </div>
              )}
              <div className="bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg p-3.5">
                <div className={`${SECTION_LABEL} mb-2`}>{t("settings.team.inviteLink")}</div>
                <p className="text-[11px] text-[#5E687B] mb-2">
                  {t("settings.team.inviteLinkDesc")} <strong>{t(inviteRole === "admin" ? "settings.team.roleAdmin" : "settings.team.roleMember")}</strong>.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[10px] font-mono text-[#212833] bg-white border border-[#E5EAF0] rounded px-2 py-1.5 truncate">
                    {inviteResult.url}
                  </code>
                  <button
                    onClick={() => copyInviteLink(inviteResult.url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5EAF0] rounded-md text-xs font-medium text-[#5E687B] hover:bg-white transition-colors shrink-0"
                  >
                    {copied ? <><Check className="w-3 h-3 text-emerald-500" />{t("common.copied")}</> : <><Copy className="w-3 h-3" />{t("settings.team.copyTeamLink")}</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {myRole !== "admin" && (
        <div className="bg-[#F7F9FA] border border-[#E5EAF0] rounded-xl p-4 text-center">
          <p className="text-[11px] text-[#9E9FAE]">{t("settings.team.adminOnly")}</p>
        </div>
      )}
    </div>
  );
}

function PipelineSection({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  const { data: stages = [], refetch } = useListStages();
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const reorderStages = useReorderStages();

  const [localStages, setLocalStages] = useState<Stage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  useEffect(() => {
    const sorted = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
    setLocalStages(sorted);
  }, [stages]);

  const handleDragStart = (idx: number) => { dragItem.current = idx; };
  const handleDragEnter = (idx: number) => { dragOver.current = idx; };

  const handleDragEnd = async () => {
    const from = dragItem.current;
    const to = dragOver.current;
    if (from === null || to === null || from === to) { dragItem.current = null; dragOver.current = null; return; }
    const updated = [...localStages];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved!);
    setLocalStages(updated);
    dragItem.current = null;
    dragOver.current = null;
    try {
      await reorderStages.mutateAsync({ data: { stageIds: updated.map(s => s.id) } });
      void refetch();
    } catch {
      setError(t("settings.pipeline.failedOrder"));
      void refetch();
    }
  };

  const startEdit = (stage: Stage) => {
    setEditingId(stage.id);
    setEditLabel(stage.label);
    setError(null);
  };

  const commitEdit = async (id: string) => {
    if (!editLabel.trim()) { setEditingId(null); return; }
    setSaving(true);
    try {
      await updateStage.mutateAsync({ id, data: { label: editLabel.trim() } });
      void refetch();
    } catch {
      setError(t("settings.pipeline.failedRename"));
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await deleteStage.mutateAsync({ id });
      void refetch();
    } catch (e: unknown) {
      const status = e && typeof e === "object" && "status" in e ? (e as { status: number }).status : 0;
      if (status === 409) {
        const data = (e as { data?: { error?: string } }).data;
        setError(data?.error ?? t("settings.pipeline.failedDelete"));
      } else {
        setError(t("settings.pipeline.failedDeleteGeneric"));
      }
    }
  };

  const handleAddStage = async () => {
    if (!newLabel.trim()) return;
    const id = "stage-" + newLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    setSaving(true);
    setError(null);
    try {
      await createStage.mutateAsync({ data: { id, label: newLabel.trim() } });
      void refetch();
      setNewLabel("");
      setAddingNew(false);
    } catch {
      setError(t("settings.pipeline.failedCreate"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white border border-[#E5EAF0] rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center gap-2">
        <GitBranch className="w-3.5 h-3.5 text-[#9000FF]" />
        <span className="text-xs font-bold text-[#212833]">{t("settings.pipeline.titleHeader")}</span>
        <span className="ml-auto text-[10px] font-bold bg-[#E5EAF0] text-[#5E687B] px-1.5 py-0.5 rounded-full">{localStages.length}</span>
      </div>

      <div className="px-4 py-3 border-b border-[#E5EAF0] bg-[#FAFBFC]">
        <p className="text-[11px] text-[#5E687B] leading-relaxed">
          {isAdmin ? t("settings.pipeline.adminDesc") : t("settings.pipeline.memberDesc")}
        </p>
      </div>

      {error && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-100 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>
      )}

      <ul className="divide-y divide-[#E5EAF0]">
        {localStages.map((stage, idx) => (
          <li
            key={stage.id}
            draggable={isAdmin}
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragEnd={() => void handleDragEnd()}
            onDragOver={e => e.preventDefault()}
            className="flex items-center gap-3 px-4 py-2.5 group hover:bg-[#F7F9FA] transition-colors"
          >
            {isAdmin && (
              <GripVertical className="w-3.5 h-3.5 text-[#C0C8D4] group-hover:text-[#9E9FAE] cursor-grab shrink-0" />
            )}
            <span className="w-5 h-5 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-[#9000FF]">
              {idx + 1}
            </span>
            {editingId === stage.id ? (
              <input
                autoFocus
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                onBlur={() => void commitEdit(stage.id)}
                onKeyDown={e => {
                  if (e.key === "Enter") void commitEdit(stage.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                disabled={saving}
                className="flex-1 border border-[#9000FF] rounded px-2 py-0.5 text-xs font-medium text-[#212833] outline-none focus:ring-1 focus:ring-[#9000FF]/20"
              />
            ) : (
              <span className="flex-1 text-xs font-medium text-[#212833]">{stage.label}</span>
            )}
            {isAdmin && editingId !== stage.id && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => startEdit(stage)}
                  className="p-1 rounded text-[#9E9FAE] hover:text-[#9000FF] hover:bg-[#9000FF]/8 transition-colors"
                  title="Rename"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => void handleDelete(stage.id)}
                  className="p-1 rounded text-[#9E9FAE] hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && (
        <div className="px-4 py-3 border-t border-[#E5EAF0]">
          {addingNew ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") void handleAddStage();
                  if (e.key === "Escape") { setAddingNew(false); setNewLabel(""); }
                }}
                placeholder={t("settings.pipeline.newStagePlaceholder")}
                disabled={saving}
                className="flex-1 border border-[#9000FF] rounded-md px-3 py-1.5 text-xs text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:ring-1 focus:ring-[#9000FF]/20"
              />
              <button
                onClick={() => void handleAddStage()}
                disabled={saving || !newLabel.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] disabled:opacity-60 rounded-md transition-colors"
              >
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                {t("common.add")}
              </button>
              <button
                onClick={() => { setAddingNew(false); setNewLabel(""); }}
                className="p-1.5 text-[#9E9FAE] hover:text-[#212833] hover:bg-[#E5EAF0] rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setAddingNew(true); setError(null); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#9000FF] hover:text-[#7A00D9] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("settings.pipeline.addStage")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

type LandingPagePref = "inbox" | "orders" | "risk-radar";

function DefaultLandingPageSection() {
  const { t } = useTranslation();
  const [pref, setPref] = useUserPref<LandingPagePref>("defaultLandingPage", "inbox");

  const landingPageOptions: { value: LandingPagePref; label: string; description: string }[] = [
    { value: "inbox",      label: t("landingPage.inbox"),      description: t("landingPage.inboxDesc") },
    { value: "orders",     label: t("landingPage.orders"),     description: t("landingPage.ordersDesc") },
    { value: "risk-radar", label: t("landingPage.riskRadar"),  description: t("landingPage.riskRadarDesc") },
  ];

  return (
    <section className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-sm">
      <h2 className="text-sm font-bold text-[#212833] mb-1">{t("settings.general.landingPage")}</h2>
      <p className="text-xs text-[#5E687B] mb-4 leading-relaxed">{t("settings.general.landingPageDesc")}</p>
      <div className="space-y-2">
        {landingPageOptions.map(opt => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              pref === opt.value
                ? "border-[#9000FF] bg-[#9000FF]/4"
                : "border-[#E5EAF0] hover:bg-[#F7F9FA]"
            }`}
          >
            <input
              type="radio"
              name="defaultLandingPage"
              value={opt.value}
              checked={pref === opt.value}
              onChange={() => setPref(opt.value)}
              className="mt-0.5 accent-[#9000FF]"
            />
            <div>
              <div className={`text-xs font-semibold ${pref === opt.value ? "text-[#9000FF]" : "text-[#212833]"}`}>
                {opt.label}
              </div>
              <div className="text-[10px] text-[#9E9FAE] mt-0.5">{opt.description}</div>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function MobileAppSection() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isMobile = isIos || isAndroid;

  const mobileUrl = (() => {
    const base = window.location.origin;
    return `${base}/mobile/`;
  })();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(mobileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = mobileUrl;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
      document.body.removeChild(ta);
    });
  };

  return (
    <section className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#9000FF]/8 border border-[#9000FF]/15 flex items-center justify-center shrink-0">
          <Smartphone className="w-4.5 h-4.5 text-[#9000FF]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#212833] mb-0.5">{t("settings.general.mobileApp")}</h2>
          <p className="text-xs text-[#5E687B] leading-relaxed">{t("settings.general.mobileAppDesc")}</p>
        </div>
      </div>

      {/* Open button always shown */}
      <a
        href="/mobile/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-md transition-colors mb-4"
      >
        <Smartphone className="w-3.5 h-3.5" />
        {t("settings.general.mobileAppOpen")}
        <ExternalLink className="w-3 h-3 opacity-70" />
      </a>

      {/* iOS instructions */}
      {isIos && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{t("settings.general.mobileAppInstallTitle")}</span>
          </div>
          <p className="text-[11px] text-blue-700">{t("settings.general.mobileAppIosNote")}</p>
          <ol className="space-y-1.5">
            {[
              t("settings.general.mobileAppIosStep1"),
              t("settings.general.mobileAppIosStep2"),
              t("settings.general.mobileAppIosStep3"),
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-blue-800">
                <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Android install */}
      {isAndroid && deferredPrompt && !installed && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3.5">
          <p className="text-[11px] text-emerald-700 mb-2.5">{t("settings.general.mobileAppAndroidDesc")}</p>
          <button
            onClick={() => void handleAndroidInstall()}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
          >
            <Download className="w-3 h-3" />
            {t("settings.general.mobileAppInstallAndroid")}
          </button>
        </div>
      )}

      {isAndroid && installed && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-[11px] text-emerald-700 font-medium">{t("settings.general.mobileAppInstalledAndroid")}</span>
        </div>
      )}

      {/* Desktop / fallback — show QR code + copyable URL */}
      {!isMobile && (
        <div className="bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg p-3.5 space-y-3">
          <div className="text-[10px] font-bold text-[#9E9FAE] uppercase tracking-wider">{t("settings.general.mobileAppUrl")}</div>
          <p className="text-[11px] text-[#5E687B]">{t("settings.general.mobileAppDesktopDesc")}</p>

          {/* QR code */}
          <div className="flex justify-center py-2">
            <div className="bg-white border border-[#E5EAF0] rounded-lg p-3 inline-flex flex-col items-center gap-2 shadow-sm">
              <QRCodeSVG
                value={mobileUrl}
                size={120}
                bgColor="#ffffff"
                fgColor="#212833"
                level="M"
              />
              <span className="text-[9px] text-[#9E9FAE] font-medium tracking-wide">Scan to install</span>
            </div>
          </div>

          {/* Copyable URL */}
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-[11px] text-[#212833] bg-white border border-[#E5EAF0] rounded px-2.5 py-1.5 truncate">
              {mobileUrl}
            </code>
            <button
              onClick={copyUrl}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#E5EAF0] rounded-md text-xs font-medium text-[#5E687B] hover:bg-white hover:text-[#212833] transition-colors shrink-0"
            >
              {copied ? <><Check className="w-3 h-3 text-emerald-500" />{t("common.copied")}</> : <><Copy className="w-3 h-3" />{t("common.copy")}</>}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function HelpOnboardingSection() {
  const { replayTour } = useTour();
  return (
    <section className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#9000FF]/8 border border-[#9000FF]/15 flex items-center justify-center shrink-0">
          <PlayCircle className="w-4.5 h-4.5 text-[#9000FF]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#212833] mb-0.5">Help &amp; Onboarding</h2>
          <p className="text-xs text-[#5E687B] leading-relaxed">
            New to FlowForge? The product tour walks you through every key feature in under 2 minutes.
          </p>
        </div>
      </div>
      <button
        onClick={replayTour}
        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-md transition-colors"
      >
        <PlayCircle className="w-3.5 h-3.5" />
        Take the tour again
      </button>
    </section>
  );
}

const TOKEN_SESSION_KEY = "flowforge:ios_token_draft";
const TOKEN_TTL_MS = 5 * 60 * 1000;

interface StoredTokenDraft {
  token: string;
  id: number;
  label: string;
  createdAt: string;
  lastUsedAt?: string | null;
  expiresAt: number;
}

function saveTokenToSession(t: CreateDeviceTokenResponse) {
  const draft: StoredTokenDraft = { ...t, expiresAt: Date.now() + TOKEN_TTL_MS };
  try { sessionStorage.setItem(TOKEN_SESSION_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
}

function clearTokenFromSession() {
  try { sessionStorage.removeItem(TOKEN_SESSION_KEY); } catch { /* ignore */ }
}

function loadTokenFromSession(): { token: CreateDeviceTokenResponse; secondsLeft: number } | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_SESSION_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StoredTokenDraft;
    const secondsLeft = Math.floor((draft.expiresAt - Date.now()) / 1000);
    if (secondsLeft <= 0) { sessionStorage.removeItem(TOKEN_SESSION_KEY); return null; }
    const { expiresAt: _expiresAt, ...tokenResponse } = draft;
    return { token: tokenResponse as CreateDeviceTokenResponse, secondsLeft };
  } catch { return null; }
}

function MobileCaptureSection() {
  const queryClient = useQueryClient();
  const { data: tokens = [], refetch: refetchTokens } = useListDeviceTokens();
  const createMutation = useCreateDeviceToken();
  const deleteMutation = useDeleteDeviceToken();

  const [newToken, setNewToken] = useState<CreateDeviceTokenResponse | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [tokenCountdown, setTokenCountdown] = useState<number | null>(null);

  useEffect(() => {
    const restored = loadTokenFromSession();
    if (restored) {
      setNewToken(restored.token);
      setTokenCountdown(restored.secondsLeft);
    }
  }, []);

  useEffect(() => {
    if (newToken === null) { setTokenCountdown(null); return; }
    const tick = () => {
      const restored = loadTokenFromSession();
      if (!restored) { setNewToken(null); setTokenCountdown(null); return; }
      setTokenCountdown(restored.secondsLeft);
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [newToken]);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [androidInstalled, setAndroidInstalled] = useState(false);
  const [androidHowOpen, setAndroidHowOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => { void refetchTokens(); }, 30_000);
    return () => clearInterval(id);
  }, [refetchTokens]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleGenerateToken = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const result = await createMutation.mutateAsync({ data: { label: "iOS Shortcut" } });
      setNewToken(result);
      saveTokenToSession(result);
      void refetchTokens();
    } catch {
      setGenerateError("Failed to generate token. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDismissToken = () => {
    clearTokenFromSession();
    setNewToken(null);
    setTokenCountdown(null);
    setTokenCopied(false);
  };

  const copyToken = (value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); setTokenCopied(true); setTimeout(() => setTokenCopied(false), 2000); } catch { /* ignore */ }
      document.body.removeChild(ta);
    });
  };

  const handleRevoke = async (id: number) => {
    if (!window.confirm("Revoke this token? Any iOS Shortcut using it will stop working.")) return;
    setRevoking(id);
    try {
      await deleteMutation.mutateAsync({ id });
      void queryClient.invalidateQueries({ queryKey: getListDeviceTokensQueryKey() });
    } catch {
      alert("Failed to revoke token. Please try again.");
    } finally {
      setRevoking(null);
    }
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setAndroidInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const statusBadge = (() => {
    if (tokens.length === 0) return { color: "bg-red-50 text-red-600 border-red-200", label: "No token" };
    const lastUsed = tokens
      .map((t: { lastUsedAt?: string | null }) => t.lastUsedAt ? new Date(t.lastUsedAt).getTime() : 0)
      .reduce((a: number, b: number) => Math.max(a, b), 0);
    if (lastUsed === 0) return { color: "bg-amber-50 text-amber-700 border-amber-200", label: "Not used yet" };
    const age = Date.now() - lastUsed;
    if (age < 24 * 60 * 60 * 1000) return { color: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Active" };
    return { color: "bg-amber-50 text-amber-700 border-amber-200", label: "Inactive" };
  })();

  return (
    <div className="space-y-4">
      {/* iOS Shortcuts */}
      <section className="bg-white border border-[#E5EAF0] rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center gap-2 bg-[#FAFBFC]">
          <Key className="w-3.5 h-3.5 text-[#9000FF]" />
          <span className="text-xs font-bold text-[#212833]">iOS Shortcuts</span>
          <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
            ● {statusBadge.label}
          </span>
        </div>
        <div className="px-4 py-4 space-y-4">
          <p className="text-[11px] text-[#5E687B] leading-relaxed">
            Generate a one-time token and install the FlowForge iOS Shortcut to forward conversations to your inbox directly from the share sheet.
          </p>

          {/* Step 1 — Generate token */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#9000FF]/10 flex items-center justify-center text-[9px] font-bold text-[#9000FF] shrink-0">1</span>
              <span className="text-xs font-semibold text-[#212833]">Generate your device token</span>
            </div>
            {newToken ? (
              <div className="ml-7 space-y-2">
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-amber-800 font-medium">Copy this token now — it will not be shown again.</p>
                    {tokenCountdown !== null && (
                      <p className="text-[10px] text-amber-700 mt-0.5">
                        Visible for <span className="font-semibold tabular-nums">{Math.floor(tokenCountdown / 60)}:{String(tokenCountdown % 60).padStart(2, "0")}</span> more
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-[11px] text-[#212833] bg-[#F7F9FA] border border-[#E5EAF0] rounded-md px-2.5 py-2 break-all leading-relaxed">
                    {newToken.token}
                  </code>
                  <button
                    onClick={() => copyToken(newToken.token)}
                    className="flex items-center gap-1.5 px-2.5 py-2 border border-[#E5EAF0] rounded-md text-xs font-medium text-[#5E687B] hover:bg-[#F0F4F8] transition-colors shrink-0"
                  >
                    {tokenCopied ? <><Check className="w-3 h-3 text-emerald-500" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
                  </button>
                </div>
                <button
                  onClick={handleDismissToken}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Done — I copied it
                </button>
              </div>
            ) : (
              <div className="ml-7">
                {generateError && (
                  <p className="text-[11px] text-red-600 mb-2">{generateError}</p>
                )}
                <button
                  onClick={() => void handleGenerateToken()}
                  disabled={generating}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] disabled:opacity-60 rounded-md transition-colors"
                >
                  {generating ? <><RefreshCw className="w-3 h-3 animate-spin" />Generating…</> : <><Key className="w-3 h-3" />Generate Token</>}
                </button>
              </div>
            )}
          </div>

          {/* Step 2 — Install shortcut */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#9000FF]/10 flex items-center justify-center text-[9px] font-bold text-[#9000FF] shrink-0">2</span>
              <span className="text-xs font-semibold text-[#212833]">Install the FlowForge Shortcut</span>
            </div>
            <div className="ml-7">
              {isIOS ? (
                <>
                  <a
                    href="/shortcuts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#9000FF]/40 text-[#9000FF] rounded-md hover:bg-[#9000FF]/5 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Shortcut Installer
                  </a>
                  <p className="text-[10px] text-[#9E9FAE] mt-1.5">Paste your token when prompted during setup.</p>
                </>
              ) : (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold text-amber-800">iPhone only</p>
                    <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
                      Open this page on your iPhone to install the Shortcut, or scan the QR code in{" "}
                      <a href="/shortcuts" className="underline font-medium">Settings → Chat Channels → iOS Shortcut</a>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 3 — Contacts tagging */}
          <div id="ios-contacts" className="space-y-2 scroll-mt-4">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#9000FF]/10 flex items-center justify-center text-[9px] font-bold text-[#9000FF] shrink-0">3</span>
              <span className="text-xs font-semibold text-[#212833]">Tag supplier contacts</span>
              <a
                href="#ios-contacts"
                className="ml-auto text-[10px] text-[#C0C8D4] hover:text-[#9000FF] transition-colors font-mono select-none"
                title="Link to this step"
                onClick={e => { e.preventDefault(); window.location.hash = "ios-contacts"; document.getElementById("ios-contacts")?.scrollIntoView({ behavior: "smooth" }); }}
              >#</a>
            </div>
            <p className="ml-7 text-[11px] text-[#5E687B] leading-relaxed">
              Add a <strong>FlowForge</strong> note to each supplier's iOS contact card. The shortcut reads this tag to route forwarded chats to the right thread automatically.
            </p>
          </div>

          {/* Step 4 — Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#9000FF]/10 flex items-center justify-center text-[9px] font-bold text-[#9000FF] shrink-0">4</span>
              <span className="text-xs font-semibold text-[#212833]">Connection status</span>
            </div>
            <div className="ml-7 flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                ● {statusBadge.label}
              </span>
              {tokens.length > 0 && (() => {
                const lastUsed = tokens
                  .map(t => t.lastUsedAt ? new Date(t.lastUsedAt) : null)
                  .filter((d): d is Date => d !== null)
                  .sort((a, b) => b.getTime() - a.getTime())[0];
                return lastUsed ? (
                  <span className="text-[10px] text-[#9E9FAE]">Last seen {lastUsed.toLocaleDateString()}</span>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Android PWA */}
      <section className="bg-white border border-[#E5EAF0] rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center gap-2 bg-[#FAFBFC]">
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-bold text-[#212833]">Android — PWA Share</span>
        </div>
        <div className="px-4 py-4 space-y-3">
          <p className="text-[11px] text-[#5E687B] leading-relaxed">
            Install FlowForge as a Progressive Web App on Android and use the system share sheet to forward chat screenshots directly into the inbox.
          </p>

          {androidInstalled ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-[11px] text-emerald-700 font-medium">App installed successfully!</span>
            </div>
          ) : deferredPrompt ? (
            <button
              onClick={() => void handleAndroidInstall()}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
            >
              <Download className="w-3 h-3" />
              Install App
            </button>
          ) : (
            <div className="bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg px-3 py-2.5 text-[11px] text-[#9E9FAE]">
              Open this page in Android Chrome to install the app.
            </div>
          )}

          {/* How it works collapsible */}
          <div className="border border-[#E5EAF0] rounded-lg overflow-hidden">
            <button
              onClick={() => setAndroidHowOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-[#FAFBFC] hover:bg-[#F0F4F8] transition-colors text-left"
            >
              <span className="text-[11px] font-semibold text-[#5E687B]">How it works</span>
              {androidHowOpen
                ? <ChevronDown className="w-3.5 h-3.5 text-[#9E9FAE]" />
                : <ChevronRight className="w-3.5 h-3.5 text-[#9E9FAE]" />}
            </button>
            {androidHowOpen && (
              <div className="px-3 py-3 border-t border-[#E5EAF0] bg-white space-y-1.5">
                {[
                  "Install FlowForge from this page using the button above.",
                  "Open any chat app (WhatsApp, WeChat, Telegram) and select messages.",
                  "Tap Share → FlowForge to open the capture screen.",
                  "AI extracts the supplier and shipment context, then routes it to your inbox.",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-[#5E687B]">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Active Tokens table */}
      <section className="bg-white border border-[#E5EAF0] rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center gap-2 bg-[#FAFBFC]">
          <Key className="w-3.5 h-3.5 text-[#9E9FAE]" />
          <span className="text-xs font-bold text-[#212833]">Active Tokens</span>
          <span className="ml-auto text-[10px] font-bold bg-[#E5EAF0] text-[#5E687B] px-1.5 py-0.5 rounded-full">{tokens.length}</span>
        </div>
        {tokens.length === 0 ? (
          <div className="px-4 py-6 text-center text-[11px] text-[#9E9FAE]">
            No device tokens yet. Generate one above to connect your iOS Shortcut.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#E5EAF0] bg-[#F7F9FA]">
                  <th className="px-4 py-2 text-left font-semibold text-[#9E9FAE]">Label</th>
                  <th className="px-4 py-2 text-left font-semibold text-[#9E9FAE]">Created</th>
                  <th className="px-4 py-2 text-left font-semibold text-[#9E9FAE]">Last Used</th>
                  <th className="px-4 py-2 text-right font-semibold text-[#9E9FAE]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {tokens.map(token => (
                  <tr key={token.id} className="hover:bg-[#FAFBFC] transition-colors">
                    <td className="px-4 py-2.5 font-medium text-[#212833]">{token.label}</td>
                    <td className="px-4 py-2.5 text-[#9E9FAE]">{new Date(token.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-[#9E9FAE]">
                      {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : <span className="italic">Never</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => void handleRevoke(token.id)}
                        disabled={revoking === token.id}
                        className="flex items-center gap-1 ml-auto px-2 py-1 text-[10px] font-semibold text-red-600 border border-red-100 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {revoking === token.id ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Trash2 className="w-2.5 h-2.5" />}
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function Settings() {
  const { t, i18n: i18nHook } = useTranslation();
  const { data: config, isLoading } = useGetPoNumberingConfig();
  const updateMutation = useUpdatePoNumberingConfig();
  const { data: inboundEmailData, refetch: refetchInboundEmail } = useGetInboundEmailAddress();
  const inboundEmail = inboundEmailData?.inboundEmailAddress || "ai@flowforge.com";
  const [emailCopied, setEmailCopied] = useState(false);
  const search = useSearch();
  const [, navigate] = useLocation();
  const activeTab = (new URLSearchParams(search).get("tab") as SettingsTab | null) ?? "general";
  const setActiveTab = (tab: SettingsTab) => navigate(`/settings?tab=${tab}`);

  // Derive the current handle (the part between + and @) from the full address
  const currentHandle = (() => {
    const m = inboundEmail.match(/\+([^@]+)@/);
    return m?.[1] ?? "";
  })();
  const [editingHandle, setEditingHandle] = useState(false);
  const [handleDraft, setHandleDraft] = useState("");
  const [handleError, setHandleError] = useState("");
  const updateHandleMutation = useUpdateInboundEmailHandle();

  const saveHandle = async () => {
    const normalized = handleDraft.toLowerCase().trim();
    if (normalized.length < 3 || normalized.length > 40) {
      setHandleError("Handle must be 3–40 characters");
      return;
    }
    if (!/^[a-z0-9][a-z0-9.\-]*[a-z0-9]$|^[a-z0-9]{3,40}$/.test(normalized)) {
      setHandleError("Lowercase letters, numbers, dots, and hyphens only");
      return;
    }
    try {
      await updateHandleMutation.mutateAsync({ data: { handle: normalized } });
      await refetchInboundEmail();
      setEditingHandle(false);
      setHandleError("");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      setHandleError(msg?.includes("taken") ? "That handle is already taken — try another" : (msg ?? "Failed to save"));
    }
  };

  const { signOut } = useClerk();
  const { user } = useUser();

  const [myRole, setMyRole] = useState<string>("member");
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${basePath}api/team`);
        if (!res.ok) return;
        const data = await res.json() as { members: { clerkUserId: string; role: string }[] };
        const me = data.members.find(m => m.clerkUserId === user?.id);
        if (me) setMyRole(me.role);
      } catch { /* ignore */ }
    })();
  }, [user?.id, basePath]);

  const [prefix, setPrefix] = useState("PO-");
  const [sequenceFormat, setSequenceFormat] = useState("{seq}");
  const [supplierSuffix, setSupplierSuffix] = useState("S");
  const [resetSeq, setResetSeq] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setPrefix(config.prefix);
      setSequenceFormat(config.sequenceFormat);
      setSupplierSuffix(config.supplierSuffix);
    }
  }, [config]);

  const nextSeq = config ? (resetSeq ? Number(resetSeq) : config.nextSeq) : 1;
  const preview = buildPreview(prefix, sequenceFormat, supplierSuffix, nextSeq);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        data: {
          prefix,
          sequenceFormat,
          supplierSuffix,
          ...(resetSeq ? { resetSeq: Number(resetSeq) } : {}),
        },
      });
      setResetSeq("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "general",  label: t("settings.tabs.general"),  icon: <Settings2 className="w-3.5 h-3.5" /> },
    { id: "pipeline", label: t("settings.tabs.pipeline"), icon: <GitBranch className="w-3.5 h-3.5" /> },
    { id: "channels", label: t("settings.tabs.channels"), icon: <MessageCircle className="w-3.5 h-3.5" /> },
    { id: "team",     label: t("settings.tabs.team"),     icon: <Users className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden flex" style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}>
      <NavSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 border-b border-[#E5EAF0] flex items-center px-6 shrink-0 bg-white justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#9000FF]" />
            <h1 className={PAGE_TITLE}>{t("settings.title")}</h1>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#9000FF]/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#9000FF]">
                    {(user.fullName ?? user.firstName ?? "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className={BODY_MUTED}>{user.fullName ?? user.primaryEmailAddress?.emailAddress}</span>
              </div>
              <button
                onClick={() => void signOut()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0] rounded-md transition-colors"
              >
                <LogOut className="w-3 h-3" />
                {t("common.signOut")}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-[#E5EAF0] bg-white px-6 flex gap-1 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? "border-[#9000FF] text-[#9000FF]"
                  : "border-transparent text-[#5E687B] hover:text-[#212833]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl space-y-8">

            {activeTab === "general" && (
              <>
              {/* Language section */}
              <section className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-[#212833] mb-1 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-[#9000FF]" />
                  {t("settings.general.language")}
                </h2>
                <p className="text-xs text-[#5E687B] mb-4 leading-relaxed">{t("settings.general.languageDesc")}</p>
                <div className="flex gap-2 flex-wrap">
                  {(["en", "zh-CN", "zh-TW"] as const).map((lang) => {
                    const active = i18nHook.language === lang;
                    const label = t(`settings.general.lang${lang === "en" ? "En" : lang === "zh-CN" ? "ZhCN" : "ZhTW"}`);
                    return (
                      <button
                        key={lang}
                        onClick={() => void i18n.changeLanguage(lang)}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                          active
                            ? "border-[#9000FF] bg-[#9000FF]/8 text-[#9000FF]"
                            : "border-[#E5EAF0] text-[#5E687B] hover:border-[#9000FF] hover:text-[#9000FF]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </section>
              <DefaultLandingPageSection />
              <MobileAppSection />
              <HelpOnboardingSection />
              <CopilotSettingsSection />
              <section className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-[#212833] mb-1">{t("settings.general.poNumbering")}</h2>
                <p className="text-xs text-[#5E687B] mb-5 leading-relaxed">{t("settings.general.poNumberingDesc")}</p>

                {isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-[#9E9FAE]">
                    <RefreshCw className="w-3 h-3 animate-spin" /> {t("common.loading")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("settings.general.prefix")}</label>
                        <input value={prefix} onChange={e => setPrefix(e.target.value)}
                          placeholder="PO-"
                          className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#5E687B] mb-1">{t("settings.general.supplierSuffix")}</label>
                        <input value={supplierSuffix} onChange={e => setSupplierSuffix(e.target.value)}
                          placeholder="S"
                          className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors font-mono" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#5E687B] mb-1">
                        {t("settings.general.sequenceFormat")}
                        <span className="text-[#9E9FAE] font-normal ml-1">
                          {t("settings.general.seqHint", { placeholder: "{seq}" })}
                        </span>
                      </label>
                      <input value={sequenceFormat} onChange={e => setSequenceFormat(e.target.value)}
                        placeholder="{seq}"
                        className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors font-mono" />
                      <p className="text-[10px] text-[#9E9FAE] mt-1">
                        {t("settings.general.seqExamples")} <code className="font-mono">{"{seq}"}</code> → 0001 &nbsp;·&nbsp;
                        <code className="font-mono">2026-{"{seq}"}</code> → 2026-0001
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#5E687B] mb-1">
                        {t("settings.general.resetCounter")}
                        <span className="text-[#9E9FAE] font-normal ml-1">({t("settings.general.resetCounterHint")})</span>
                      </label>
                      <input type="number" min="1" value={resetSeq} onChange={e => setResetSeq(e.target.value)}
                        placeholder={String(config?.nextSeq ?? 1)}
                        className="w-full border border-[#E5EAF0] rounded-md px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors" />
                    </div>

                    <div className="bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg p-3.5">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Eye className="w-3 h-3 text-[#9000FF]" />
                        <span className={SECTION_LABEL}>{t("settings.general.livePreview")}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider mb-1.5">{t("settings.general.buyerPo")}</div>
                          <code className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {preview.buyerPo}
                          </code>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold text-[#9E9FAE] uppercase tracking-wider mb-1.5">{t("settings.general.supplierPo")}</div>
                          <code className="text-sm font-mono font-bold text-[#9000FF] bg-[#9000FF]/8 px-2 py-0.5 rounded border border-[#9000FF]/20">
                            {preview.supplierPo}
                          </code>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#9E9FAE] mt-2.5">
                        {t("settings.general.counterAt", { seq: config?.nextSeq ?? "—" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button onClick={() => void handleSave()}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] disabled:opacity-60 rounded-md transition-colors">
                        {updateMutation.isPending
                          ? <><RefreshCw className="w-3 h-3 animate-spin" />{t("common.saving")}</>
                          : saved
                            ? <><span className="text-emerald-300">✓</span> {t("common.saved")}</>
                            : <><Save className="w-3 h-3" />{t("settings.general.saveSettings")}</>}
                      </button>
                    </div>
                  </div>
                )}
              </section>
              </>
            )}

            {activeTab === "pipeline" && (
              <div>
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-[#212833] mb-1">{t("settings.pipeline.title")}</h2>
                  <p className="text-xs text-[#5E687B] leading-relaxed">
                    {t("settings.pipeline.desc")}
                    {myRole === "admin" ? t("settings.pipeline.descAdmin") : t("settings.pipeline.descMember")}
                  </p>
                </div>
                <PipelineSection isAdmin={myRole === "admin"} />
              </div>
            )}

            {activeTab === "channels" && (
              <div className="space-y-8">
              <section className="bg-white border border-[#E5EAF0] rounded-xl p-5 shadow-sm">
                <h2 className="text-sm font-bold text-[#212833] mb-1">{t("settings.channels.title")}</h2>
                <p className="text-xs text-[#5E687B] mb-5 leading-relaxed">{t("settings.channels.desc")}</p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  {([
                    { name: "WhatsApp", icon: <MessageCircle className="w-4 h-4 text-emerald-500"/>, desc: t("settings.channels.whatsappDesc") },
                    { name: "WeChat",   icon: <MessageSquare className="w-4 h-4 text-teal-500"/>,   desc: t("settings.channels.wechatDesc") },
                    { name: "iMessage", icon: <MessageCircle className="w-4 h-4 text-blue-400"/>,   desc: t("settings.channels.imessageDesc") },
                    { name: "SMS",      icon: <Smartphone className="w-4 h-4 text-slate-400"/>,     desc: t("settings.channels.smsDesc") },
                  ] as { name: string; icon: React.ReactNode; desc: string }[]).map(ch => (
                    <div key={ch.name} className="flex items-start gap-3 p-3 border border-[#E5EAF0] rounded-lg">
                      <div className="w-7 h-7 rounded-md bg-[#F0F4F8] flex items-center justify-center shrink-0">{ch.icon}</div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-[#212833]">{ch.name}</span>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 rounded-full">{t("common.active")}</span>
                        </div>
                        <p className="text-[10px] text-[#9E9FAE]">{ch.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <BeeperSection />

                {/* iOS Shortcut installer */}
                <div className="bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg p-3.5 mb-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Smartphone className="w-3 h-3 text-[#9000FF]"/>
                    <span className={SECTION_LABEL}>iOS Shortcut</span>
                  </div>
                  <p className="text-[10px] text-[#9E9FAE] mb-2.5 leading-relaxed">
                    Build a one-tap iOS Shortcut to forward supplier messages from WhatsApp, iMessage, or SMS directly into FlowForge.
                  </p>
                  {isIOS ? (
                    <a
                      href="/shortcuts"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-md transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Shortcut Installer
                    </a>
                  ) : (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        <span className="font-semibold text-amber-800">iPhone only —</span>{" "}
                        open this page on your iPhone, or scan the QR code with your iPhone camera to install the Shortcut.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg p-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Mail className="w-3 h-3 text-[#9000FF]"/>
                    <span className={SECTION_LABEL}>{t("settings.channels.inboundAddress")}</span>
                  </div>
                  <p className="text-[10px] text-[#9E9FAE] mb-2.5">{t("settings.channels.inboundDesc")}</p>

                  {/* View mode */}
                  {!editingHandle && (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-sm font-semibold text-[#212833] bg-white border border-[#E5EAF0] rounded-md px-3 py-1.5 truncate">
                        {inboundEmail}
                      </code>
                      <button
                        onClick={() => { setHandleDraft(currentHandle); setHandleError(""); setEditingHandle(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5EAF0] rounded-md text-xs font-medium text-[#5E687B] hover:bg-white hover:text-[#212833] transition-colors shrink-0">
                        <Pencil className="w-3 h-3"/>Edit
                      </button>
                      <button
                        onClick={()=>{void navigator.clipboard.writeText(inboundEmail).then(()=>{setEmailCopied(true);setTimeout(()=>setEmailCopied(false),1800);});}}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5EAF0] rounded-md text-xs font-medium text-[#5E687B] hover:bg-white hover:text-[#212833] transition-colors shrink-0">
                        {emailCopied ? <><Check className="w-3 h-3 text-emerald-500"/>{t("common.copied")}</> : <><Copy className="w-3 h-3"/>{t("common.copy")}</>}
                      </button>
                    </div>
                  )}

                  {/* Edit mode */}
                  {editingHandle && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-0 bg-white border border-[#9000FF]/40 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-[#9000FF]/20">
                        <span className="pl-3 pr-1 font-mono text-sm text-[#9E9FAE] shrink-0 select-none">
                          {(() => { const m = inboundEmail.match(/^([^+@]+)\+?[^@]*@(.+)$/); return m ? `${m[1]}+` : "iq+"; })()}
                        </span>
                        <input
                          type="text"
                          value={handleDraft}
                          onChange={e => { setHandleDraft(e.target.value); setHandleError(""); }}
                          onKeyDown={e => { if (e.key === "Enter") { void saveHandle(); } if (e.key === "Escape") { setEditingHandle(false); } }}
                          className="flex-1 font-mono text-sm font-semibold text-[#212833] bg-transparent py-1.5 outline-none min-w-0"
                          autoFocus
                          placeholder="your.name"
                        />
                        <span className="pr-3 pl-1 font-mono text-sm text-[#9E9FAE] shrink-0 select-none">
                          {(() => { const m = inboundEmail.match(/@(.+)$/); return m ? `@${m[1]}` : "@flowforgeiq.com"; })()}
                        </span>
                      </div>
                      {handleError && <p className="text-[11px] text-red-600 font-medium">{handleError}</p>}
                      <p className="text-[10px] text-[#9E9FAE]">3–40 chars, lowercase letters, numbers, dots, and hyphens only.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { void saveHandle(); }}
                          disabled={updateHandleMutation.isPending || !handleDraft.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9000FF] text-white rounded-md text-xs font-bold hover:bg-[#7A00D9] disabled:opacity-50 transition-colors">
                          {updateHandleMutation.isPending ? "Saving…" : <><Check className="w-3 h-3"/>Save</>}
                        </button>
                        <button
                          onClick={() => { setEditingHandle(false); setHandleError(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5EAF0] text-[#5E687B] rounded-md text-xs font-medium hover:bg-white transition-colors">
                          <X className="w-3 h-3"/>Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Mobile Capture */}
              <div>
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-[#212833] mb-1">Mobile Capture</h2>
                  <p className="text-xs text-[#5E687B] leading-relaxed">
                    Connect iOS Shortcuts or Android PWA share to forward supplier chats directly into FlowForge.
                  </p>
                </div>
                <MobileCaptureSection />
              </div>
              </div>
            )}

            {activeTab === "team" && (
              <div>
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-[#212833] mb-1">{t("settings.team.title")}</h2>
                  <p className="text-xs text-[#5E687B] leading-relaxed">{t("settings.team.desc")}</p>
                </div>
                <TeamSection />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
