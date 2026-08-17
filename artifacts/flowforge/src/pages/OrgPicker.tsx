import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Building2, ChevronRight } from "lucide-react";
import { useMyOrgs, selectOrg, MY_ORGS_QUERY_KEY } from "@/lib/useMyOrgs";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function OrgPicker() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useMyOrgs();
  const [pendingOrgId, setPendingOrgId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const autoSelectedRef = useRef(false);

  const pick = async (orgId: number) => {
    setPendingOrgId(orgId);
    setError("");
    try {
      await selectOrg(orgId);
      // Everything cached so far belongs to the previous org.
      qc.clear();
      navigate("/", { replace: true });
    } catch {
      setPendingOrgId(null);
      setError("Could not switch workspace. Please try again.");
    }
  };

  // Zero-friction path: exactly one org → select silently and continue.
  useEffect(() => {
    if (!data || autoSelectedRef.current) return;
    if (data.orgs.length === 1) {
      autoSelectedRef.current = true;
      void pick(data.orgs[0].orgId);
    } else if (data.orgs.length === 0) {
      // Unprovisioned user — let the normal provisioning flow handle it.
      autoSelectedRef.current = true;
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const showList = data && data.orgs.length > 1;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-sm px-4">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-7 h-7 rounded-[5px] overflow-hidden shrink-0">
            <img src={`${basePath}/flowforge-logo.png`} alt="FlowForgeIQ" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[#9000FF]">FlowForgeIQ</span>
        </div>

        <div className="bg-white border border-[#E5EAF0] rounded-xl p-6 shadow-sm">
          {(isLoading || (data && !showList)) && (
            <div className="text-center py-6">
              <RefreshCw className="w-6 h-6 text-[#9000FF] animate-spin mx-auto mb-3" />
              <p className="text-xs text-[#5E687B]">Loading your workspaces…</p>
            </div>
          )}

          {isError && (
            <div className="text-center py-6">
              <p className="text-xs text-[#5E687B] mb-4">Could not load your workspaces.</p>
              <button
                onClick={() => void qc.invalidateQueries({ queryKey: MY_ORGS_QUERY_KEY })}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {showList && (
            <>
              <h2 className="text-sm font-bold text-[#212833] mb-1">Choose a workspace</h2>
              <p className="text-xs text-[#5E687B] mb-4">You belong to more than one workspace. Pick the one you'd like to enter.</p>
              <div className="space-y-2">
                {data.orgs.map(org => {
                  const busy = pendingOrgId === org.orgId;
                  return (
                    <button
                      key={org.orgId}
                      disabled={pendingOrgId !== null}
                      onClick={() => void pick(org.orgId)}
                      className="w-full flex items-center gap-3 px-4 py-3 border border-[#E5EAF0] rounded-lg hover:border-[#9000FF] hover:bg-[#9000FF]/5 transition-colors text-left disabled:opacity-60"
                    >
                      <div className="w-8 h-8 rounded-md bg-[#9000FF]/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-[#9000FF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#212833] truncate">{org.orgName}</div>
                        <div className="text-[10px] text-[#5E687B] capitalize">{org.role}</div>
                      </div>
                      {busy
                        ? <RefreshCw className="w-4 h-4 text-[#9000FF] animate-spin shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-[#9E9FAE] shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
