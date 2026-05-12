import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SupabaseAuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Setup from "./pages/Setup";
import PatientProfile from "./pages/PatientProfile";
import DailyCheckIn from "./pages/DailyCheckIn";
import Trends from "./pages/Trends";
import DoctorSummary from "./pages/DoctorSummary";
import FamilyView from "./pages/FamilyView";
import AskAssistant from "./pages/AskAssistant";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/setup" component={Setup} />
      <Route path="/patient-profile" component={PatientProfile} />
      <Route path="/check-in" component={DailyCheckIn} />
      <Route path="/trends" component={Trends} />
      <Route path="/doctor-summary" component={DoctorSummary} />
      <Route path="/family" component={FamilyView} />
      <Route path="/ask" component={AskAssistant} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <SupabaseAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </SupabaseAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
