import { useCallback, useEffect, useState } from "react";

// The virtual module is provided by vite-plugin-pwa in "prompt" mode
// We use a dynamic import to avoid build errors if the module isn't available
let registerSWModule: any = null;

try {
  // @ts-ignore – virtual module from vite-plugin-pwa
  registerSWModule = await import("virtual:pwa-register");
} catch {
  // not available (e.g. dev without SW)
}

export function useUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!registerSWModule) return;

    const { registerSW } = registerSWModule;

    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        // silently ready
      },
    });

    setUpdateSW(() => update);
  }, []);

  const updateApp = useCallback(() => {
    if (updateSW) {
      // Mark that we just updated so PatchNotesModal shows after reload
      localStorage.setItem("hubfrete-just-updated", "true");
      updateSW(true);
    }
  }, [updateSW]);

  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false);
  }, []);

  return { needRefresh, updateApp, dismissUpdate };
}
