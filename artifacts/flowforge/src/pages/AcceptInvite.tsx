import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { CheckCircle2, XCircle, Clock, RefreshCw, UserX } from "lucide-react";
import { useTranslation } from "react-i18next";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type InviteStatus = "loading" | "success" | "expired" | "already_accepted" | "wrong_account" | "error";

export function AcceptInvite() {
  const [, navigate] = useLocation();
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const { t } = useTranslation();
  const [status, setStatus] = useState<InviteStatus>("loading");
  const [message, setMessage] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const tok = params.get("token");
    if (!tok) {
      setStatus("error");
      setMessage(t("acceptInvite.noToken"));
      return;
    }
    setToken(tok);
    if (!user) {
      const returnTo = encodeURIComponent(`/accept-invite?token=${tok}`);
      navigate(`/sign-in?redirect_url=${returnTo}`);
      return;
    }

    fetch(`${basePath}/api/team/invite-peek?token=${encodeURIComponent(tok)}`)
      .then(async r => {
        if (r.ok) {
          const data = await r.json() as { maskedEmail?: string };
          setMaskedEmail(data.maskedEmail ?? "");
        }
      })
      .catch(() => {});

    fetch(`${basePath}/api/team/accept-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tok }),
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
          } else if (res.status === 403) {
            setStatus("wrong_account");
          } else {
            setStatus("error");
            setMessage(code || t("acceptInvite.failedToAccept"));
          }
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage(t("acceptInvite.networkError"));
      });
  }, [isLoaded, user]);

  function handleSwitchAccount() {
    const returnUrl = `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`;
    clerk.signOut({ redirectUrl: returnUrl });
  }

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
              <h2 className="text-sm font-bold text-[#212833] mb-2">{t("acceptInvite.accepting")}</h2>
              <p className="text-xs text-[#5E687B]">{t("acceptInvite.acceptingDesc")}</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-sm font-bold text-[#212833] mb-2">{t("acceptInvite.welcome")}</h2>
              <p className="text-xs text-[#5E687B]">{t("acceptInvite.welcomeDesc")}</p>
            </>
          )}

          {status === "expired" && (
            <>
              <Clock className="w-8 h-8 text-amber-500 mx-auto mb-4" />
              <h2 className="text-sm font-bold text-[#212833] mb-2">{t("acceptInvite.expired")}</h2>
              <p className="text-xs text-[#5E687B] mb-4">{t("acceptInvite.expiredDesc")}</p>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-md transition-colors"
              >
                {t("acceptInvite.goCta")}
              </button>
            </>
          )}

          {status === "already_accepted" && (
            <>
              <CheckCircle2 className="w-8 h-8 text-[#9000FF] mx-auto mb-4" />
              <h2 className="text-sm font-bold text-[#212833] mb-2">{t("acceptInvite.alreadyAccepted")}</h2>
              <p className="text-xs text-[#5E687B] mb-4">{t("acceptInvite.alreadyAcceptedDesc")}</p>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-md transition-colors"
              >
                {t("acceptInvite.goCta")}
              </button>
            </>
          )}

          {status === "wrong_account" && (
            <>
              <UserX className="w-8 h-8 text-amber-500 mx-auto mb-4" />
              <h2 className="text-sm font-bold text-[#212833] mb-2">{t("acceptInvite.wrongAccount")}</h2>
              <p className="text-xs text-[#5E687B] mb-4">
                {maskedEmail ? (
                  <>{t("acceptInvite.wrongAccountDescWithEmail")} <span className="font-semibold text-[#212833]">{maskedEmail}</span>.</>
                ) : t("acceptInvite.wrongAccountDesc")}
              </p>
              <button
                onClick={handleSwitchAccount}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-md transition-colors"
              >
                {t("acceptInvite.switchAccount")}
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <h2 className="text-sm font-bold text-[#212833] mb-2">{t("acceptInvite.error")}</h2>
              <p className="text-xs text-[#5E687B] mb-4">{message}</p>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9000FF] hover:bg-[#7A00D9] rounded-md transition-colors"
              >
                {t("acceptInvite.goCta")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
