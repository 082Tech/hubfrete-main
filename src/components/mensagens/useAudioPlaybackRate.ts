import { useSyncExternalStore } from 'react';

const RATES = [1, 1.5, 2] as const;
let globalRate = 1;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return globalRate;
}

export function useAudioPlaybackRate() {
  const rate = useSyncExternalStore(subscribe, getSnapshot);

  const cycleRate = () => {
    const idx = RATES.indexOf(globalRate as (typeof RATES)[number]);
    globalRate = RATES[(idx + 1) % RATES.length];
    listeners.forEach(cb => cb());
  };

  return { rate, cycleRate };
}

// --- Global single-audio playback manager ---
let currentAudio: HTMLAudioElement | null = null;

export function claimPlayback(audio: HTMLAudioElement) {
  if (currentAudio && currentAudio !== audio) {
    currentAudio.pause();
  }
  currentAudio = audio;
}

export function releasePlayback(audio: HTMLAudioElement) {
  if (currentAudio === audio) {
    currentAudio = null;
  }
}
