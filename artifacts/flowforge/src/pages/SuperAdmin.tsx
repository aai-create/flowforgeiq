import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { Redirect, useLocation } from "wouter";
import { Building2, Plus, UserPlus, RefreshCw, Check, Copy, X, ChevronRight } from "lucide-react";
import { NavSidebar } from "@/components/NavSidebar";
import { GlobalHeader } from "@/components/GlobalHeader";

interface Org {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL as string | undefined;

function slugifyOrgName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 50) || "org";
}

function NewOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const derivedSlug = slugEdited ? slug : slugifyOrgName(name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/superadmin/orgs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: derivedSlug }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to create organization");
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl border border-[#E5EAF0] shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#9000FF]" />
            <h2 className="text-sm font-bold text-[#212833]">New Organization</h2>
          </div>
          <button onClick={onClose} className="p-1 text-[#9E9FAE] hover:text-[#212833] rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">Organization Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Acme Corp"
              className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm text-[#212833] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">Slug</label>
            <input
              type="text"
              value={derivedSlug}
              onChange={e => { setSlugEdited(true); setSlug(e.target.value); }}
              placeholder="acme-corp"
              className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm text-[#212833] font-mono outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
            />
            <p className="text-[10px] text-[#9E9FAE] mt-1">Auto-derived from name. Must be unique.</p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5E687B] border border-[#E5EAF0] rounded-lg hover:bg-[#F7F9FA] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#9000FF] text-white text-xs font-bold rounded-lg hover:bg-[#7A00D9] disabled:opacity-50 transition-colors"
            >
              {submitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              {submitting ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteAdminModal({ org, onClose, onInvited }: { org: Org; onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inviteUrl: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) { setError("Valid email required"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/superadmin/orgs/${org.id}/invite-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to send invite");
      }
      const data = await res.json() as { inviteUrl: string; emailSent: boolean };
      setResult(data);
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.inviteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl border border-[#E5EAF0] shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#9000FF]" />
            <div>
              <h2 className="text-sm font-bold text-[#212833]">Invite Admin</h2>
              <p className="text-[10px] text-[#9E9FAE]">{org.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#9E9FAE] hover:text-[#212833] rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {result ? (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2.5 ${result.emailSent ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              <Check className="w-3.5 h-3.5 shrink-0" />
              {result.emailSent ? `Invitation sent to ${email}` : "Invitation created — email not sent (POSTMARK_SERVER_TOKEN not configured)"}
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={result.inviteUrl}
                className="flex-1 border border-[#E5EAF0] rounded-lg px-3 py-2 text-xs font-mono text-[#5E687B] bg-[#FAFBFC] outline-none"
              />
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[#E5EAF0] rounded-lg text-[#5E687B] hover:bg-[#F0F4F8] transition-colors shrink-0"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#5E687B] border border-[#E5EAF0] rounded-lg hover:bg-[#F7F9FA] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5E687B] mb-1">Email address</label>
              <input
                autoFocus
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm text-[#212833] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
              />
              <p className="text-[10px] text-[#9E9FAE] mt-1">They will receive an invite as org admin.</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#5E687B] border border-[#E5EAF0] rounded-lg hover:bg-[#F7F9FA] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#9000FF] text-white text-xs font-bold rounded-lg hover:bg-[#7A00D9] disabled:opacity-50 transition-colors"
              >
                {submitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                {submitting ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function SuperAdmin() {
  const { user, isLoaded } = useUser();
  const [, navigate] = useLocation();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [inviteOrg, setInviteOrg] = useState<Org | null>(null);

  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isSuperAdmin = SUPER_ADMIN_EMAIL && userEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  const loadOrgs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/api/superadmin/orgs`);
      if (res.status === 403) {
        setError("Access denied");
        return;
      }
      if (!res.ok) throw new Error("Failed to load organizations");
      const data = await res.json() as { orgs: Org[] };
      setOrgs(data.orgs);
    } catch {
      setError("Could not load organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSuperAdmin) {
      void loadOrgs();
    }
  }, [isLoaded, isSuperAdmin]);

  if (!isLoaded) return null;

  if (!isSuperAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFBFC]">
      <NavSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <GlobalHeader breadcrumb="Platform Admin" />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-lg font-bold text-[#212833]">Platform Admin</h1>
                <p className="text-xs text-[#9E9FAE] mt-0.5">Manage all organizations on this FlowForge deployment.</p>
              </div>
              <button
                onClick={() => setShowNewOrg(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#9000FF] text-white text-xs font-bold rounded-lg hover:bg-[#7A00D9] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Organization
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-xs px-3 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <div className="bg-white border border-[#E5EAF0] rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center gap-2 bg-[#FAFBFC]">
                <Building2 className="w-3.5 h-3.5 text-[#9000FF]" />
                <span className="text-xs font-bold text-[#212833]">Organizations</span>
                <span className="ml-auto text-[10px] font-bold bg-[#E5EAF0] text-[#5E687B] px-1.5 py-0.5 rounded-full">{orgs.length}</span>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 px-4 py-8 text-xs text-[#9E9FAE]">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading…
                </div>
              ) : orgs.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-[#9E9FAE]">
                  No organizations yet. Create the first one.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5EAF0] bg-[#FAFBFC]">
                      <th className="text-left text-[10px] font-bold text-[#9E9FAE] uppercase tracking-wider px-4 py-2.5">Organization</th>
                      <th className="text-left text-[10px] font-bold text-[#9E9FAE] uppercase tracking-wider px-4 py-2.5">Slug</th>
                      <th className="text-left text-[10px] font-bold text-[#9E9FAE] uppercase tracking-wider px-4 py-2.5">Members</th>
                      <th className="text-left text-[10px] font-bold text-[#9E9FAE] uppercase tracking-wider px-4 py-2.5">Created</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAF0]">
                    {orgs.map(org => (
                      <tr key={org.id} className="hover:bg-[#FAFBFC] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-[#9000FF]/10 flex items-center justify-center shrink-0">
                              <span className="text-[11px] font-bold text-[#9000FF]">{org.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-xs font-semibold text-[#212833]">{org.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-[#5E687B] bg-[#F0F4F8] px-1.5 py-0.5 rounded">{org.slug}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-[#212833]">{org.memberCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[#9E9FAE]">{new Date(org.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setInviteOrg(org)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold border border-[#9000FF]/30 text-[#9000FF] rounded-md hover:bg-[#9000FF]/5 transition-colors ml-auto"
                          >
                            <UserPlus className="w-3 h-3" />
                            Invite Admin
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNewOrg && (
        <NewOrgModal
          onClose={() => setShowNewOrg(false)}
          onCreated={() => void loadOrgs()}
        />
      )}

      {inviteOrg && (
        <InviteAdminModal
          org={inviteOrg}
          onClose={() => setInviteOrg(null)}
          onInvited={() => void loadOrgs()}
        />
      )}
    </div>
  );
}
