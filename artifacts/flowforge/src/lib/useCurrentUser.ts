import { useUser } from "@clerk/react";
import { useEffect, useRef } from "react";

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
