import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import LoadingSkeleton from "@/components/dashboard/LoadingSkeleton";
import ErrorBoundary from "@/components/dashboard/ErrorBoundary";

const CockpitOperacional = lazy(() => import("@/pages/CockpitOperacional"));
const PlanejadoRealizado = lazy(() => import("@/pages/PlanejadoRealizado"));
const CustosEficiencia = lazy(() => import("@/pages/CustosEficiencia"));
const FrotaCapacidade = lazy(() => import("@/pages/FrotaCapacidade"));
const TempoSla = lazy(() => import("@/pages/TempoSla"));
const AderenciaAtendimento = lazy(() => import("@/pages/AderenciaAtendimento"));
const Transportadores = lazy(() => import("@/pages/Transportadores"));
const MotoristasJornada = lazy(() => import("@/pages/MotoristasJornada"));
const InvestigacaoOperacional = lazy(() => import("@/pages/InvestigacaoOperacional"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const PageFallback = () => <LoadingSkeleton rows={6} />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<DashboardLayout><CockpitOperacional /></DashboardLayout>} />
              <Route path="/cockpit-operacional" element={<DashboardLayout><CockpitOperacional /></DashboardLayout>} />
              <Route path="/planejado-realizado" element={<DashboardLayout><PlanejadoRealizado /></DashboardLayout>} />
              <Route path="/custos" element={<DashboardLayout><CustosEficiencia /></DashboardLayout>} />
              <Route path="/frota" element={<DashboardLayout><FrotaCapacidade /></DashboardLayout>} />
              <Route path="/tempo-sla" element={<DashboardLayout><TempoSla /></DashboardLayout>} />
              <Route path="/aderencia" element={<DashboardLayout><AderenciaAtendimento /></DashboardLayout>} />
              <Route path="/transportadores" element={<DashboardLayout><Transportadores /></DashboardLayout>} />
              <Route path="/motoristas" element={<DashboardLayout><MotoristasJornada /></DashboardLayout>} />
              <Route path="/alertas" element={<DashboardLayout><InvestigacaoOperacional /></DashboardLayout>} />
              <Route path="*" element={<DashboardLayout><NotFound /></DashboardLayout>} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
