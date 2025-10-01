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
import { Analytics } from '@vercel/analytics/react';

// Do not clear persistent storage on app start. Keep IndexedDB/localStorage for persistence.
const clearAllData = async () => {
  console.log('Persistence enabled: skipping storage clear on app start');
};

// Always sign out from Puter on app start (without touching local storage)
const signOutPuter = async () => {
  try {
    const anyWindow: any = window as unknown as any;
    if (anyWindow.puter && anyWindow.puter.auth && typeof anyWindow.puter.auth.signOut === 'function') {
      await anyWindow.puter.auth.signOut();
      console.log('Puter sign out completed');
    } else {
      console.log('Puter auth not available to sign out');
    }
  } catch (error) {
    console.log('Puter sign out failed or not available:', error);
  }
};

const queryClient = new QueryClient();

const App = () => {
  const [showApiValidator, setShowApiValidator] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    // Keep data persistent across reloads; do not clear
    const initializeApp = async () => {
      await clearAllData();
      await signOutPuter();
      
      // Check API keys on app load
      const validation = validateApiKeys();
      if (!validation.isValid) {
        setShowApiValidator(true);
      } else {
        setIsValidated(true);
      }

      // Request persistent storage so IndexedDB is not evicted on reload
      try {
        if ('storage' in navigator && 'persist' in navigator.storage) {
          const already = await navigator.storage.persisted();
          if (!already) {
            // Improve grant odds: use a durable client hint and service worker registration where possible
            try { await navigator.storage.estimate(); } catch {}
            const granted = await navigator.storage.persist();
            console.log('Persistent storage', granted ? 'granted' : 'not granted');
          } else {
            console.log('Persistent storage already granted');
          }
        }
      } catch (err) {
        console.warn('Persistent storage request failed:', err);
      }
    };
    
    initializeApp();
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
          <Analytics />
        </BrowserRouter>
        {showApiValidator && (
          <ApiKeyValidator onValidationComplete={handleValidationComplete} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
