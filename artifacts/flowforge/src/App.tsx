import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn as ClerkSignIn, SignUp as ClerkSignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CopilotProvider } from "@/lib/CopilotContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { Atelier } from "@/pages/Atelier";
import { RFQs } from "@/pages/RFQs";
import { RiskRadar } from "@/pages/RiskRadar";
import { Reports } from "@/pages/Reports";
import { Suppliers } from "@/pages/Suppliers";
import { Help } from "@/pages/Help";
import { Settings } from "@/pages/Settings";
import { useProvisionUser } from "@/lib/useCurrentUser";
import { useUserPref } from "@/lib/useUserPref";
import { AcceptInvite } from "@/pages/AcceptInvite";
import { LandingPage } from "@/pages/Landing";

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
            <img src={`${basePath}/flowforge-logo.png`} alt="FlowForge" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[#9000FF]">flowforge</span>
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
            <img src={`${basePath}/flowforge-logo.png`} alt="FlowForge" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[#9000FF]">flowforge</span>
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

function AppLayout() {
  useProvisionUser();
  return (
    <TooltipProvider>
      <CopilotProvider>
        <Router />
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
  return <RiskRadar onNavigateToShipment={id => navigate(`/inbox?shipment=${id}&from=risk-radar`)} />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => (
        <>
          <Show when="signed-in"><DefaultLandingRedirect /></Show>
          <Show when="signed-out"><LandingPage /></Show>
        </>
      )} />
      <Route path="/inbox" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/orders" component={() => <ProtectedRoute component={Atelier} />} />
      <Route path="/command" component={() => <ProtectedRoute component={Atelier} />} />
      <Route path="/rfqs" component={() => <ProtectedRoute component={RFQs} />} />
      <Route path="/risk-radar" component={() => <ProtectedRoute component={RiskRadarPage} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
      <Route path="/suppliers" component={() => <ProtectedRoute component={Suppliers} />} />
      <Route path="/help" component={() => <ProtectedRoute component={Help} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/accept-invite" component={AcceptInvite} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AppLayout />
      </QueryClientProvider>
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
