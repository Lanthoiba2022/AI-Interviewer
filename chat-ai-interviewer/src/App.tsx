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

// Clear all stored data and sign out from Puter on app start
const clearAllData = async () => {
  // Sign out from Puter first
  try {
    if (window.puter && window.puter.auth && typeof window.puter.auth.signOut === 'function') {
      await window.puter.auth.signOut();
      console.log('Puter sign out completed');
    }
  } catch (error) {
    console.log('Puter sign out failed or not available:', error);
  }
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear IndexedDB if it exists
  if ('indexedDB' in window) {
    indexedDB.databases?.().then(databases => {
      databases.forEach(db => {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      });
    }).catch(console.error);
  }
  
  // Clear any other storage
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    }).catch(console.error);
  }
  
  console.log('All stored data cleared and Puter signed out on app start');
};

const queryClient = new QueryClient();

const App = () => {
  const [showApiValidator, setShowApiValidator] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    // Clear all data and sign out from Puter on app start
    const initializeApp = async () => {
      await clearAllData();
      
      // Check API keys on app load
      const validation = validateApiKeys();
      if (!validation.isValid) {
        setShowApiValidator(true);
      } else {
        setIsValidated(true);
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
        </BrowserRouter>
        {showApiValidator && (
          <ApiKeyValidator onValidationComplete={handleValidationComplete} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
