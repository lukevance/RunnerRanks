import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Leaderboard from "@/pages/leaderboard";
import RaceSeries from "@/pages/race-series";
import RunnerProfile from "@/pages/runner-profile";
import RaceDetails from "@/pages/race-details";
import RaceResults from "@/pages/race-results";
import Admin from "@/pages/admin";
import RunnerReview from "@/pages/runner-review";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/race-series" component={RaceSeries} />
      <Route path="/runner/:id" component={RunnerProfile} />
      <Route path="/race/:id" component={RaceDetails} />
      <Route path="/race/:id/results" component={RaceResults} />
      <Route path="/admin" component={Admin} />
      <Route path="/runner-review" component={RunnerReview} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
