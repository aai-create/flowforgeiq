import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface MyOrg {
  orgId: number;
  orgName: string;
  role: string;
}

export interface MyOrgsResponse {
  orgs: MyOrg[];
  selectedOrgId: number | null;
}

export const MY_ORGS_QUERY_KEY = ["team", "my-orgs"] as const;

export async function fetchMyOrgs(): Promise<MyOrgsResponse> {
  const res = await fetch(`${basePath}/api/team/my-orgs`);
  if (!res.ok) throw new Error("Failed to load organizations");
  return res.json() as Promise<MyOrgsResponse>;
}

export async function selectOrg(orgId: number): Promise<void> {
  const res = await fetch(`${basePath}/api/team/select-org`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId }),
  });
  if (!res.ok) throw new Error("Failed to select organization");
}

/** Lists the orgs the signed-in user belongs to, plus which one the ff-org-id cookie currently selects. */
export function useMyOrgs() {
  const { isLoaded, isSignedIn } = useUser();
  return useQuery({
    queryKey: MY_ORGS_QUERY_KEY,
    queryFn: fetchMyOrgs,
    enabled: isLoaded && !!isSignedIn,
    staleTime: 60_000,
  });
}
