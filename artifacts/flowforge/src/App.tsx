import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn as ClerkSignIn, SignUp as ClerkSignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CopilotProvider } from "@/lib/CopilotContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { CalendarPage } from "@/pages/CalendarPage";
import { Atelier } from "@/pages/Atelier";
import { RFQs } from "@/pages/RFQs";
import { RiskRadar } from "@/pages/RiskRadar";
import { Reports } from "@/pages/Reports";
import { Pipeline } from "@/pages/Pipeline";
import { Suppliers } from "@/pages/Suppliers";
import { Buyers } from "@/pages/Buyers";
import { Help } from "@/pages/Help";
import { Settings } from "@/pages/Settings";
import { useProvisionUser } from "@/lib/useCurrentUser";
import { useUserPref } from "@/lib/useUserPref";
import { AcceptInvite } from "@/pages/AcceptInvite";
import { LandingPage } from "@/pages/Landing";
import { ShortcutsGuide } from "@/pages/ShortcutsGuide";
import { ShortcutsRedirect } from "@/pages/ShortcutsRedirect";
import { SuperAdmin } from "@/pages/SuperAdmin";
import { OrgPicker } from "@/pages/OrgPicker";
import { useMyOrgs } from "@/lib/useMyOrgs";
import { ImpersonationCtx, useImpersonationProvider, useImpersonation } from "@/lib/useImpersonation";
import { LogOut } from "lucide-react";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-sm px-4">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-7 h-7 rounded-[5px] overflow-hidden shrink-0">
            <img src={`${basePath}/flowforge-logo.png`} alt="FlowForgeIQ" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[#9000FF]">FlowForgeIQ</span>
        </div>
        <ClerkSignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          appearance={{
            cssLayerName: "clerk",
            elements: {
              rootBox: "w-full",
              cardBox: "w-full rounded-xl border border-[#E5EAF0] shadow-sm",
              card: "!bg-white !shadow-none !border-0 !rounded-xl",
              footer: "!bg-white !shadow-none !border-0 !rounded-b-xl",
              headerTitle: "text-[#212833] font-bold",
              headerSubtitle: "text-[#5E687B]",
              formButtonPrimary: "bg-[#9000FF] hover:bg-[#7A00D9] !text-white font-semibold",
              formFieldLabel: "text-[#5E687B] font-medium",
              footerActionLink: "text-[#9000FF] hover:text-[#7A00D9]",
              identityPreviewEditButton: "text-[#9000FF]",
              socialButtonsBlockButtonText: "text-[#212833]",
              formFieldSuccessText: "text-emerald-600",
              alertText: "text-[#212833]",
              footerActionText: "text-[#5E687B]",
              dividerText: "text-[#5E687B]",
            },
          }}
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-sm px-4">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-7 h-7 rounded-[5px] overflow-hidden shrink-0">
            <img src={`${basePath}/flowforge-logo.png`} alt="FlowForgeIQ" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[#9000FF]">FlowForgeIQ</span>
        </div>
        <ClerkSignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          appearance={{
            cssLayerName: "clerk",
            elements: {
              rootBox: "w-full",
              cardBox: "w-full rounded-xl border border-[#E5EAF0] shadow-sm",
              card: "!bg-white !shadow-none !border-0 !rounded-xl",
              footer: "!bg-white !shadow-none !border-0 !rounded-b-xl",
              headerTitle: "text-[#212833] font-bold",
              headerSubtitle: "text-[#5E687B]",
              formButtonPrimary: "bg-[#9000FF] hover:bg-[#7A00D9] !text-white font-semibold",
              formFieldLabel: "text-[#5E687B] font-medium",
              footerActionLink: "text-[#9000FF] hover:text-[#7A00D9]",
              socialButtonsBlockButtonText: "text-[#212833]",
              footerActionText: "text-[#5E687B]",
              dividerText: "text-[#5E687B]",
            },
          }}
        />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function ImpersonationBanner() {
  const { active, orgName, exit } = useImpersonation();
  const [, navigate] = useLocation();

  if (!active) return null;

  const handleExit = () => {
    exit();
    navigate("/superadmin");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-2 bg-amber-500 text-white text-xs font-semibold shadow-md">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
        <span>Viewing as <strong>{orgName}</strong> — Platform Admin session</span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md transition-colors font-bold text-white"
      >
        <LogOut className="w-3 h-3" />
        Exit
      </button>
    </div>
  );
}

function AppLayout() {
  useProvisionUser();
  const { active } = useImpersonation();
  return (
    <TooltipProvider>
      <CopilotProvider>
        <ImpersonationBanner />
        <div className={active ? "pt-9" : undefined}>
          <Router />
        </div>
        <Toaster />
      </CopilotProvider>
    </TooltipProvider>
  );
}

type LandingPagePref = "inbox" | "orders" | "risk-radar";

const LANDING_PAGE_ROUTES: Record<LandingPagePref, string> = {
  inbox: "/inbox",
  orders: "/orders",
  "risk-radar": "/risk-radar",
};

function DefaultLandingRedirect() {
  const { isLoaded } = useUser();
  const [pref] = useUserPref<LandingPagePref>("defaultLandingPage", "inbox");
  if (!isLoaded) return null;
  return <Redirect to={LANDING_PAGE_ROUTES[pref] ?? "/inbox"} />;
}

function RiskRadarPage() {
  const [, navigate] = useLocation();
  return <RiskRadar onNavigateToShipment={id => navigate(`/orders?shipment=${id}&from=risk-radar`)} />;
}

// After Clerk sign-in, multi-org users must pick a workspace before the app
// loads. Single-org (and unprovisioned) users pass straight through.
function OrgGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useMyOrgs();
  if (isLoading) return null;
  if (data && data.orgs.length > 1 && data.selectedOrgId === null) {
    return <Redirect to="/select-org" />;
  }
  return <>{children}</>;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <OrgGate>
          <Component />
        </OrgGate>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function SelectOrgPage() {
  return (
    <>
      <Show when="signed-in">
        <OrgPicker />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function RootPage() {
  return (
    <>
      <Show when="signed-in"><DefaultLandingRedirect /></Show>
      <Show when="signed-out"><LandingPage /></Show>
    </>
  );
}

const InboxPage = () => <ProtectedRoute component={Home} />;
const CalendarRoutePage = () => <ProtectedRoute component={CalendarPage} />;
const OrdersPage = () => <ProtectedRoute component={Atelier} />;
const RFQsPage = () => <ProtectedRoute component={RFQs} />;
const RiskRadarRoutePage = () => <ProtectedRoute component={RiskRadarPage} />;
const ReportsPage = () => <ProtectedRoute component={Reports} />;
const PipelinePage = () => <ProtectedRoute component={Pipeline} />;
const SuppliersPage = () => <ProtectedRoute component={Suppliers} />;
const BuyersPage = () => <ProtectedRoute component={Buyers} />;
const HelpPage = () => <ProtectedRoute component={Help} />;
const SettingsPage = () => <ProtectedRoute component={Settings} />;

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootPage} />
      <Route path="/inbox" component={InboxPage} />
      <Route path="/calendar" component={CalendarRoutePage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/command" component={OrdersPage} />
      <Route path="/rfqs" component={RFQsPage} />
      <Route path="/risk-radar" component={RiskRadarRoutePage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/pipeline" component={PipelinePage} />
      <Route path="/suppliers" component={SuppliersPage} />
      <Route path="/buyers" component={BuyersPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/shortcuts" component={ShortcutsGuide} />
      <Route path="/shortcuts-redirect" component={ShortcutsRedirect} />
      <Route path="/select-org" component={SelectOrgPage} />
      <Route path="/accept-invite" component={AcceptInvite} />
      <Route path="/superadmin" component={SuperAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const impersonation = useImpersonationProvider();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ImpersonationCtx.Provider value={impersonation}>
        <QueryClientProvider client={queryClient}>
          <ClerkQueryClientCacheInvalidator />
          <AppLayout />
        </QueryClientProvider>
      </ImpersonationCtx.Provider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
