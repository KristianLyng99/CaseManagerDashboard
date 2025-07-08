import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import EnhancedData from "@/pages/enhanced-data";
import NotFound from "@/pages/not-found";

function Navigation() {
  const [location] = useLocation();
  
  return (
    <nav className="bg-slate-100 border-b border-slate-200 p-4">
      <div className="container mx-auto flex items-center space-x-6">
        <h1 className="text-lg font-semibold text-slate-800">
          Saksbehandler Verktøy
        </h1>
        <div className="flex space-x-4">
          <Link href="/">
            <button className={`px-4 py-2 text-sm rounded-md transition-colors ${
              location === '/' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}>
              Rådata Kalkulator
            </button>
          </Link>
          <Link href="/enhanced-data">
            <button className={`px-4 py-2 text-sm rounded-md transition-colors ${
              location === '/enhanced-data' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}>
              Forbedret Data
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/enhanced-data" component={EnhancedData} />
        <Route component={NotFound} />
      </Switch>
    </div>
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
