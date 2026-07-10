import { useUser } from "@clerk/react";
import { useEffect, useRef, useState } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function useProvisionUser() {
  const { user, isLoaded, isSignedIn } = useUser();
  const provisionedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || provisionedRef.current) return;
    provisionedRef.current = true;

    const primaryEmail = user.primaryEmailAddress?.emailAddress ?? "";
    const name = user.fullName ?? user.firstName ?? primaryEmail.split("@")[0] ?? "Team Member";

    fetch(`${basePath}api/team/provision-self`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: primaryEmail }),
    }).catch(() => {});
  }, [isLoaded, isSignedIn, user]);
}

/** Fetches the current user's team_users role ("member" | "manager" | "admin"). Defaults to "member" while loading or on error. */
export function useMyRole(): { role: string; isManager: boolean; loaded: boolean } {
  const { user, isLoaded, isSignedIn } = useUser();
  const [role, setRole] = useState("member");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    fetch(`${basePath}api/team`)
      .then(res => (res.ok ? res.json() : null))
      .then((data: { members?: { clerkUserId: string; role: string }[] } | null) => {
        if (cancelled || !data?.members) return;
        const me = data.members.find(m => m.clerkUserId === user.id);
        if (me) setRole(me.role);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, user]);

  return { role, isManager: role === "manager" || role === "admin", loaded };
}
