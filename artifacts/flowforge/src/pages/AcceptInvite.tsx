import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AcceptInvite() {
  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
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
      navigate(`/sign-in`);
      return;
    }

    fetch(`${basePath}api/team/accept-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async res => {
        if (res.ok) {
          setStatus("success");
          setMessage("You've joined the team! Redirecting to FlowForgeIQ…");
          setTimeout(() => navigate("/"), 2000);
        } else {
          const data = await res.json() as { error?: string };
          setStatus("error");
          setMessage(data.error ?? "Failed to accept invitation.");
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
              <p className="text-xs text-[#5E687B]">{message}</p>
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
