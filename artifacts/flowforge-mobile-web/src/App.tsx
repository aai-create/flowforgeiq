import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  ClerkProvider,
  SignIn as ClerkSignIn,
  Show,
  useClerk,
  useAuth,
  useUser,
} from "@clerk/react";
import { useTour } from "@/hooks/useTour";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import HomePage from "@/pages/Home";
import CapturePage from "@/pages/Capture";
import DocumentsPage from "@/pages/Documents";
import DocumentDetailPage from "@/pages/DocumentDetail";
import ShipmentDetailPage from "@/pages/ShipmentDetail";
import SettingsPage from "@/pages/Settings";
import RoutingResultPage from "@/pages/RoutingResult";
import { IOSInstallPrompt } from "@/components/IOSInstallPrompt";
import { AndroidInstallPrompt } from "@/components/AndroidInstallPrompt";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="flex items-center gap-2 mb-8">
        <img
          src={`${basePath}/flowforge-logo.png`}
          alt="FlowForgeIQ"
          className="w-8 h-8 rounded-lg object-contain"
        />
        <span className="font-bold text-lg tracking-tight" style={{ color: "hsl(var(--primary))" }}>
          FlowForgeIQ
        </span>
      </div>
      <div className="w-full max-w-sm">
        <ClerkSignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-in`}
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full rounded-xl border border-border shadow-sm",
              card: "!bg-card !shadow-none !border-0",
              footer: "!bg-card !shadow-none !border-0",
              formButtonPrimary: "!text-white font-semibold",
            },
          }}
        />
      </div>
    </div>
  );
}

function AuthTokenSyncer() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== id) qc.clear();
      prevRef.current = id;
    });
  }, [addListener, qc]);
  return null;
}

function TourAutoLauncher() {
  const { isSignedIn, isLoaded } = useUser();
  const { hasSeenTour, startTour } = useTour();
  const launched = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasSeenTour || launched.current) return;
    launched.current = true;
    const t = setTimeout(() => startTour(), 1800);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn, hasSeenTour, startTour]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <AuthTokenSyncer />
        <TourAutoLauncher />
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
      <Route path="/" component={() => <Redirect to="/home" />} />
      <Route path="/home" component={() => <ProtectedRoute component={HomePage} />} />
      <Route path="/capture" component={() => <ProtectedRoute component={CapturePage} />} />
      <Route path="/documents" component={() => <ProtectedRoute component={DocumentsPage} />} />
      <Route path="/documents/:id" component={() => <ProtectedRoute component={DocumentDetailPage} />} />
      <Route path="/shipment/:id" component={() => <ProtectedRoute component={ShipmentDetailPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route path="/routing-result" component={() => <ProtectedRoute component={RoutingResultPage} />} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route component={() => <Redirect to="/home" />} />
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
      signUpUrl={`${basePath}/sign-in`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Router />
        <IOSInstallPrompt />
        <AndroidInstallPrompt />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
