import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Options = {
  /** Espaço extra a subtrair do cálculo (ex: padding inferior/rodapé fixo). */
  bottomOffset?: number;
  /** Altura mínima para evitar valores muito pequenos em telas pequenas. */
  minHeight?: number;
};

/**
 * Calcula dinamicamente a altura restante do viewport a partir do topo do elemento.
 * Útil quando o layout pai não tem `height` bem definido e `flex-1` não resolve.
 */
export function useRemainingViewportHeight<T extends HTMLElement = HTMLDivElement>(
  options: Options = {}
) {
  const { bottomOffset = 0, minHeight = 240 } = options;
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState<number>(minHeight);

  // Evita warning no SSR; aqui é Vite SPA, mas mantemos seguro.
  const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsoLayoutEffect(() => {
    if (!ref.current) return;

    let raf = 0;
    const compute = () => {
      if (!ref.current) return;
      const top = ref.current.getBoundingClientRect().top;
      const next = Math.max(minHeight, Math.floor(window.innerHeight - top - bottomOffset));
      setHeight(next);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };

    // Primeira medição
    schedule();

    // Atualiza em resize/zoom e em scroll (caso o container pai ainda role)
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });

    // Se o layout acima mudar de tamanho (ex: filtros abrindo/fechando), remede
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      ro.disconnect();
    };
  }, [bottomOffset, minHeight]);

  return { ref, height } as const;
}
