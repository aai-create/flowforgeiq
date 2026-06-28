import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type InviteStatus = "loading" | "success" | "expired" | "already_accepted" | "error";

export function AcceptInvite() {
  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<InviteStatus>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No invitation token found in the URL.");
      return;
    }
    if (!user) {
      const returnTo = encodeURIComponent(`/accept-invite?token=${token}`);
      navigate(`/sign-in?redirect_url=${returnTo}`);
      return;
    }

    fetch(`${basePath}/api/team/accept-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async res => {
        if (res.ok) {
          setStatus("success");
          setTimeout(() => navigate("/"), 2000);
        } else {
          const data = await res.json() as { error?: string };
          const code = data.error ?? "";
          if (res.status === 410 || code === "EXPIRED") {
            setStatus("expired");
          } else if (res.status === 409 || code === "ALREADY_ACCEPTED") {
            setStatus("already_accepted");
          } else {
            setStatus("error");
            setMessage(code || "Failed to accept invitation.");
          }
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please try again.");
      });
  }, [isLoaded, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-sm px-4 text-center">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-7 h-7 rounded-[5px] overflow-hidden shrink-0">
            <img src={`${basePath}/flowforge-logo.png`} alt="FlowForgeIQ" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[#9000FF]">FlowForgeIQ</span>
        </div>

        <div className="bg-white border border-[#E5EAF0] rounded-xl p-8 shadow-sm">
          {status === "loading" && (
            <>
              <RefreshCw className="w-8 h-8 text-[#9000FF] animate-spin mx-auto mb-4" />
              <h2 className="text-sm font-bold text-[#212833] mb-2">Accepting invitation…</h2>
              <p className="text-xs text-[#5E687B]">Please wait while we set up your access.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-sm font-bold text-[#212833] mb-2">Welcome to the team!</h2>
              <p className="text-xs text-[#5E687B]">You've joined the team! Redirecting to FlowForgeIQ…</p>
            </>
          )}

          {status === "expired" && (
            <>
              <Clock className="w-8 h-8 text-amber-500 mx-auto mb-4" />
              <h2 className="text-sm font-bold text-[#212833] mb-2">This invite has expired</h2>
              <p className="text-xs text-[#5E687B] mb-4">
                Invite links are valid for 7 days. Ask your team admin to send a new invitation.
              </p>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-md transition-colors"
              >
                Go to FlowForgeIQ
              </button>
            </>
          )}

          {status === "already_accepted" && (
            <>
              <CheckCircle2 className="w-8 h-8 text-[#9000FF] mx-auto mb-4" />
              <h2 className="text-sm font-bold text-[#212833] mb-2">This invite has already been accepted</h2>
              <p className="text-xs text-[#5E687B] mb-4">
                This invitation link has already been used. If you need access, contact your team admin.
              </p>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-md transition-colors"
              >
                Go to FlowForgeIQ
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <h2 className="text-sm font-bold text-[#212833] mb-2">Invitation error</h2>
              <p className="text-xs text-[#5E687B] mb-4">{message}</p>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-md transition-colors"
              >
                Go to FlowForgeIQ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
