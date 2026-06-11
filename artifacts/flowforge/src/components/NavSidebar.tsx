import React from "react";
import { useLocation } from "wouter";
import { Inbox, LayoutGrid, Calendar, ShieldAlert, BarChart3, Building2, BookOpen, Settings2, LogOut, FileQuestion } from "lucide-react";
import { useUser, useClerk } from "@clerk/react";

interface NavSidebarProps {
  showBrand?: boolean;
  onCalendarClick?: () => void;
  onInboxClick?: () => void;
  isCalendarActive?: boolean;
  counts?: {
    myOrders?: number | null;
    inbox?: number | null;
    riskRadar?: number | null;
  };
  children?: React.ReactNode;
}

export function NavSidebar({
  showBrand = true,
  onCalendarClick,
  onInboxClick,
  isCalendarActive = false,
  counts = {},
  children,
}: NavSidebarProps) {
  const [location, navigate] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const navItems = [
    { icon: Inbox,        label: "Inbox",       to: "/inbox",       count: counts.inbox     ?? null },
    { icon: LayoutGrid,   label: "My Orders",   to: "/orders",      count: counts.myOrders  ?? null },
    { icon: Calendar,     label: "Calendar",    to: "/inbox",       count: null              },
    { icon: FileQuestion, label: "RFQs",        to: "/rfqs",        count: null              },
    { icon: ShieldAlert,  label: "Risk Radar",  to: "/risk-radar",  count: counts.riskRadar ?? null },
    { icon: BarChart3,    label: "Reports",     to: "/reports",     count: null              },
    { icon: Building2,    label: "Suppliers",   to: "/suppliers",   count: null              },
    { icon: BookOpen,     label: "Help",        to: "/help",        count: null              },
    { icon: Settings2,    label: "Settings",    to: "/settings",    count: null              },
  ];

  function isActive(label: string, to: string) {
    if (label === "Calendar") return isCalendarActive;
    if (label === "Inbox" && isCalendarActive) return false;
    if (label === "Inbox") return location === to || location === "/";
    if (label === "My Orders") return location === to || location === "/command";
    return location === to;
  }

  function handleClick(label: string, to: string) {
    if (label === "Calendar" && onCalendarClick) {
      onCalendarClick();
    } else if (label === "Inbox" && onInboxClick) {
      onInboxClick();
      navigate(to);
    } else {
      navigate(to);
    }
  }

  const displayName = user?.fullName ?? user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const initials = displayName.charAt(0).toUpperCase() || "?";

  return (
    <div className="w-[240px] bg-[#F7F9FA] border-r border-[#E5EAF0] flex flex-col shrink-0">
      {showBrand && (
        <div className="px-3 py-3 border-b border-[#E5EAF0] flex items-center gap-2 shrink-0">
          <div className="w-5 h-5 rounded-[4px] overflow-hidden shrink-0">
            <img src="/flowforge-logo.png" alt="FlowForge" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[#9000FF]">flowforge</span>
        </div>
      )}
      <div className={`p-2 flex flex-col gap-0.5 shrink-0 ${!showBrand ? "mt-1" : ""}`}>
        {navItems.map(({ icon: Icon, label, to, count }) => {
          const active = isActive(label, to);
          return (
            <button key={label} onClick={() => handleClick(label, to)}
              className={`w-full flex items-center justify-between px-2 h-8 rounded-md text-sm transition-colors ${
                active
                  ? "bg-[#E5EAF0] text-[#212833] font-semibold"
                  : "text-[#5E687B] hover:text-[#212833] hover:bg-[#E5EAF0]"
              }`}>
              <span className="flex items-center gap-2">
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#9000FF]" : label === "Risk Radar" ? "text-[#9000FF]" : ""}`} />
                {label}
              </span>
              {count != null && (
                <span className={`text-[10px] px-1.5 rounded-full font-bold ${
                  active ? "bg-[#9000FF] text-white" : "bg-[#E5EAF0] text-[#5E687B]"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {children && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {children}
        </div>
      )}
      {/* User profile footer */}
      {isLoaded && user && (
        <div className="mt-auto border-t border-[#E5EAF0] p-2 shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <div className="w-6 h-6 rounded-full bg-[#9000FF]/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[#9000FF]">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-[#212833] truncate">{displayName}</div>
              <div className="text-[9px] text-[#9E9FAE] truncate">{user.primaryEmailAddress?.emailAddress}</div>
            </div>
            <button
              onClick={() => void signOut()}
              title="Sign out"
              className="p-1 text-[#9E9FAE] hover:text-[#212833] hover:bg-[#E5EAF0] rounded transition-colors shrink-0"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
