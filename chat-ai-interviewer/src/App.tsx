import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ApiKeyValidator from "./components/ApiKeyValidator";
import { validateApiKeys } from "./config/api";

const queryClient = new QueryClient();

const App = () => {
  const [showApiValidator, setShowApiValidator] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    // Check API keys on app load
    const validation = validateApiKeys();
    if (!validation.isValid) {
      setShowApiValidator(true);
    } else {
      setIsValidated(true);
    }
  }, []);

  const handleValidationComplete = (isValid: boolean) => {
    setIsValidated(true);
    setShowApiValidator(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        {showApiValidator && (
          <ApiKeyValidator onValidationComplete={handleValidationComplete} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
