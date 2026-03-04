import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";
import { useUpdatePrompt } from "@/hooks/useUpdatePrompt";
import { supabase } from "@/integrations/supabase/client";

export function UpdateToast() {
  const { needRefresh, updateApp, dismissUpdate } = useUpdatePrompt();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 right-6 z-[100] max-w-sm w-full"
        >
          <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            {/* Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/60" />

            <div className="p-4 pt-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5 rounded-lg bg-primary/10 p-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Nova atualização disponível 🚀
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uma nova versão do HubFrete está pronta para ser instalada.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={updateApp}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Atualizar agora
                    </button>
                    <button
                      onClick={dismissUpdate}
                      className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      Dispensar
                    </button>
                  </div>
                </div>
                <button
                  onClick={dismissUpdate}
                  className="flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
