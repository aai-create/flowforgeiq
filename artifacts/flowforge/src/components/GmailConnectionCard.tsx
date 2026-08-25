import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Mail, Wifi, WifiOff } from "lucide-react";
import {
  connectGmail,
  useDisconnectGmail,
  type GmailStatus,
} from "@workspace/api-client-react";
import { BODY_MUTED } from "@/lib/typography";

interface GmailConnectionCardProps {
  status: GmailStatus | undefined;
  isAdmin: boolean;
  onStatusChange?: () => void;
}

export function GmailConnectionCard({
  status,
  isAdmin,
  onStatusChange,
}: GmailConnectionCardProps) {
  const disconnectMutation = useDisconnectGmail();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "gmail-connected") {
        setConnectError(null);
        onStatusChange?.();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onStatusChange]);

  const handleConnect = async () => {
    setConnectError(null);
    try {
      const response = await connectGmail() as { authUrl?: unknown } | null | undefined;
      if (typeof response?.authUrl === "string") {
        // Keep the opener so the OAuth callback can notify this Settings page.
        window.open(response.authUrl, "gmail-oauth", "width=600,height=700");
      } else {
        setConnectError("Could not start Google OAuth. Please try again.");
      }
    } catch {
      setConnectError("Could not start Google OAuth. Please try again.");
    }
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate(undefined, {
      onSuccess: () => {
        setTestResult(null);
        onStatusChange?.();
      },
    });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/integrations/gmail/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        const data = await response.json() as { to?: string };
        setTestResult({ ok: true, msg: `Test email sent to ${data.to ?? "your account"}` });
      } else {
        const data = await response.json() as { error?: string };
        setTestResult({ ok: false, msg: data.error ?? "Send failed" });
      }
    } catch {
      setTestResult({ ok: false, msg: "Network error — please try again." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section
      data-testid="gmail-connection-card"
      className="bg-white border border-[#E5EAF0] rounded-xl p-4 shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <Mail size={16} className="text-red-500" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#212833]">Gmail (Send-as)</div>
            <div className={BODY_MUTED}>Reply to inbound emails via your Gmail account</div>
          </div>
        </div>
        {status === undefined ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#9E9FAE] bg-[#F0F4F8] border border-[#E5EAF0] px-2 py-1 rounded-full">
            Checking…
          </span>
        ) : status.connected ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
            <Wifi size={9} />Connected
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#9E9FAE] bg-[#F0F4F8] border border-[#E5EAF0] px-2 py-1 rounded-full">
            <WifiOff size={9} />Not connected
          </span>
        )}
      </div>

      {status?.connected && status.gmailAddress && (
        <div className="text-xs text-[#5E687B] bg-[#FAFBFC] rounded-md px-2.5 py-1.5 border border-[#E5EAF0] mb-3 font-mono">
          {status.gmailAddress}
        </div>
      )}

      {status && !status.clientConfigured && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mb-3 flex items-start gap-1.5">
          <AlertCircle size={10} className="text-amber-500 mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">Google OAuth setup required.</span>{" "}
            An organization admin must configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before Gmail can be connected.
          </span>
        </div>
      )}

      {testResult && (
        <div className={`text-xs rounded-md px-2.5 py-1.5 mb-3 border flex items-center gap-1.5 ${testResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {testResult.ok ? <CheckCircle2 size={10} className="shrink-0" /> : <AlertCircle size={10} className="shrink-0" />}
          {testResult.msg}
        </div>
      )}

      {connectError && (
        <div className="text-xs rounded-md px-2.5 py-1.5 mb-3 border bg-red-50 border-red-200 text-red-700 flex items-center gap-1.5">
          <AlertCircle size={10} className="shrink-0" />
          {connectError}
        </div>
      )}

      {!isAdmin ? (
        <div className="text-[11px] text-[#5E687B] bg-[#F7F9FA] border border-[#E5EAF0] rounded-md px-2.5 py-2">
          Only organization admins can connect, test, or disconnect Gmail.
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {status?.connected ? (
            <>
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={testing}
                className="text-xs font-semibold px-3 py-1.5 rounded-md border border-[#E5EAF0] hover:bg-[#F0F4F8] transition-colors disabled:opacity-40"
              >
                {testing ? "Sending…" : "Send test email"}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
                className="text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1.5 rounded-md border border-red-100 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                {disconnectMutation.isPending ? "Disconnecting…" : "Disconnect"}
              </button>
            </>
          ) : (
            <button
              type="button"
              data-testid="connect-gmail-button"
              onClick={() => void handleConnect()}
              disabled={!status?.clientConfigured}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md bg-[#9000FF] text-white hover:bg-[#7A00D9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ExternalLink size={10} />Connect Gmail via OAuth
            </button>
          )}
        </div>
      )}
    </section>
  );
}