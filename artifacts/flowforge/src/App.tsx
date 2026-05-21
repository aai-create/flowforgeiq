import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CopilotProvider } from "@/lib/CopilotContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { Atelier } from "@/pages/Atelier";
import { RiskRadar } from "@/pages/RiskRadar";
import { Reports } from "@/pages/Reports";
import { Suppliers } from "@/pages/Suppliers";
import { Help } from "@/pages/Help";

const queryClient = new QueryClient();

function RiskRadarPage() {
  const [, navigate] = useLocation();
  return <RiskRadar onNavigateToShipment={id => navigate(`/inbox?shipment=${id}`)} />;
}

function ReportsPage() {
  return <Reports />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Atelier} />
      <Route path="/inbox" component={Home} />
      <Route path="/command" component={Atelier} />
      <Route path="/risk-radar" component={RiskRadarPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/help" component={Help} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CopilotProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </CopilotProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
