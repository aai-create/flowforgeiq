import React, { useState, useEffect, useRef } from "react";
import { Settings2, Save, Eye, RefreshCw, MessageCircle, MessageSquare, Mail, Copy, Check, Smartphone, ChevronDown, ChevronRight, ExternalLink, Zap, Users, Trash2, Plus, UserPlus, LogOut, Crown, GitBranch, GripVertical, Pencil, X, Globe } from "lucide-react";
import { useGetPoNumberingConfig, useUpdatePoNumberingConfig, useGetInboundEmailAddress, useListStages, useCreateStage, useUpdateStage, useDeleteStage, useReorderStages } from "@workspace/api-client-react";
import { NavSidebar } from "@/components/NavSidebar";
import { useUser, useClerk } from "@clerk/react";
import { useUserPref } from "@/lib/useUserPref";
import type { Stage } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

type SettingsTab = "general" | "pipeline" | "channels" | "team";

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
  const [inviteResult, setInviteResult] = useState<{ url: string } | null>(null);
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
      const data = await res.json() as { inviteUrl: string };
      setInviteResult({ url: data.inviteUrl });
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

  const copyInviteLink = (url: string) => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
            {pendingInvitations.map(inv => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#212833] truncate">{inv.email}</div>
                  <div className="text-[10px] text-[#9E9FAE]">
                    {t("settings.team.invitedAs")} <span className="font-medium">{inv.role}</span>
                    {" · "}
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyInviteLink(window.location.origin + inv.token)}
                    className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium border border-[#E5EAF0] rounded-md text-[#5E687B] hover:bg-[#F0F4F8] transition-colors"
                  >
                    <Copy className="w-2.5 h-2.5" />
                    {t("settings.team.copyLink")}
                  </button>
                  {myRole === "admin" && (
                    <button
                      onClick={() => void handleCancelInvitation(inv.id)}
                      className="p-1 text-[#9E9FAE] hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </li>
            ))}
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
            <div className="mt-4 bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg p-3.5">
              <div className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider mb-2">{t("settings.team.inviteLink")}</div>
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

export function Settings() {
  const { t, i18n: i18nHook } = useTranslation();
  const { data: config, isLoading } = useGetPoNumberingConfig();
  const updateMutation = useUpdatePoNumberingConfig();
  const { data: inboundEmailData } = useGetInboundEmailAddress();
  const inboundEmail = inboundEmailData?.inboundEmailAddress || "ai@flowforge.com";
  const [emailCopied, setEmailCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

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
            <h1 className="text-sm font-bold text-[#212833]">{t("settings.title")}</h1>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#9000FF]/10 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#9000FF]">
                    {(user.fullName ?? user.firstName ?? "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-[#5E687B]">{user.fullName ?? user.primaryEmailAddress?.emailAddress}</span>
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
                        <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">{t("settings.general.livePreview")}</span>
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

                <div className="bg-[#F7F9FA] border border-[#E5EAF0] rounded-lg p-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Mail className="w-3 h-3 text-[#9000FF]"/>
                    <span className="text-[10px] font-bold text-[#5E687B] uppercase tracking-wider">{t("settings.channels.inboundAddress")}</span>
                  </div>
                  <p className="text-[10px] text-[#9E9FAE] mb-2.5">{t("settings.channels.inboundDesc")}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-sm font-semibold text-[#212833] bg-white border border-[#E5EAF0] rounded-md px-3 py-1.5 truncate">
                      {inboundEmail}
                    </code>
                    <button
                      onClick={()=>{void navigator.clipboard.writeText(inboundEmail).then(()=>{setEmailCopied(true);setTimeout(()=>setEmailCopied(false),1800);});}}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5EAF0] rounded-md text-xs font-medium text-[#5E687B] hover:bg-white hover:text-[#212833] transition-colors shrink-0">
                      {emailCopied ? <><Check className="w-3 h-3 text-emerald-500"/>{t("common.copied")}</> : <><Copy className="w-3 h-3"/>{t("common.copy")}</>}
                    </button>
                  </div>
                </div>
              </section>
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
