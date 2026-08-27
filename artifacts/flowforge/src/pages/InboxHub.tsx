import React from "react";
import {
  getListSignalInboxQueryKey,
  useListSignalInbox,
} from "@workspace/api-client-react";
import { GlobalHeader } from "@/components/GlobalHeader";
import { NavSidebar } from "@/components/NavSidebar";
import { SignalInbox } from "./SignalInbox";

/**
 * Public Inbox shell.
 *
 * Signal Inbox remains the internal workflow/component name, but Inbox is the
 * single public communication destination.
 */
export function isActionableInboxStatus(status: string | null | undefined): boolean {
  return ["new", "draft_ready", "approved", "send_failed"].includes(status ?? "new");
}

export function InboxHub() {
  const { data: signalItems = [] } = useListSignalInbox(undefined, {
    query: {
      queryKey: getListSignalInboxQueryKey(),
      refetchInterval: 15000,
    },
  });

  const actionableCount = signalItems.filter(item => {
    const status = item.message.signalStatus ?? "new";
    return isActionableInboxStatus(status);
  }).length;

  return (
    <div
      className="flex flex-col h-screen w-full bg-[#FAFBFC] text-[#212833] overflow-hidden"
      style={{ fontFamily: "Inter, sans-serif", fontSize: 13 }}
    >
      <GlobalHeader breadcrumb="Inbox" />
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <NavSidebar showBrand={false} counts={{ inbox: actionableCount > 0 ? actionableCount : null }}>
          <div className="flex-1" />
        </NavSidebar>
        <SignalInbox />
      </div>
    </div>
  );
}