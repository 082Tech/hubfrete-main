import { useCallback, useEffect, useState } from "react";

export function useUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateFn, setUpdateFn] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function register() {
      try {
        // @ts-ignore – virtual module provided by vite-plugin-pwa in "prompt" mode
        const { registerSW } = await import("virtual:pwa-register");

        if (cancelled) return;

        const update = registerSW({
          onNeedRefresh() {
            if (!cancelled) setNeedRefresh(true);
          },
          onOfflineReady() {
            // silently ready
          },
        });

        if (!cancelled) setUpdateFn(() => update);
      } catch {
        // SW not available (e.g. dev mode without SW)
      }
    }

    register();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateApp = useCallback(() => {
    if (updateFn) {
      localStorage.setItem("hubfrete-just-updated", "true");
      updateFn(true);
    }
  }, [updateFn]);

  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false);
  }, []);

  return { needRefresh, updateApp, dismissUpdate };
}
