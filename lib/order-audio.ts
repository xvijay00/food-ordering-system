/**
 * 3-Second Kitchen Order Alert Audio System
 * Uses Web Audio API with 3 sequential harmonic bell chimes (at 0s, 1s, 2s)
 * with graceful fallback to /bell.mp3 and native device vibration.
 */

let sharedAudioCtx: AudioContext | null = null;
let cachedAudioElement: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioCtxClass) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtxClass();
    }

    if (sharedAudioCtx.state === "suspended") {
      void sharedAudioCtx.resume().catch(() => {});
    }

    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Synthesizes a resonant bell strike using dual-oscillator harmonics
 */
function playBellStrike(
  ctx: AudioContext,
  startTime: number,
  baseFreq: number,
  duration = 0.95
) {
  try {
    const now = ctx.currentTime;
    const actualStart = Math.max(startTime, now);

    // Fundamental tone (Sine wave)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(baseFreq, actualStart);

    // 2nd Harmonic chime overtone (Triangle wave for brass resonance)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(baseFreq * 2, actualStart);

    // Envelope 1: Quick attack, exponential decay
    gain1.gain.setValueAtTime(0.0001, actualStart);
    gain1.gain.exponentialRampToValueAtTime(0.65, actualStart + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, actualStart + duration);

    // Envelope 2: Overtone decay
    gain2.gain.setValueAtTime(0.0001, actualStart);
    gain2.gain.exponentialRampToValueAtTime(0.3, actualStart + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.0001, actualStart + duration);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc1.start(actualStart);
    osc2.start(actualStart);
    osc1.stop(actualStart + duration);
    osc2.stop(actualStart + duration);
  } catch {
    // Ignore audio graph errors
  }
}

/**
 * Rings the kitchen order alert bell for exactly 3 seconds.
 * Pattern: 3 resonant chimes (t=0s at 880Hz, t=1s at 1046.5Hz, t=2s at 1318.5Hz).
 */
export function playOrderAlertBell(): void {
  if (typeof window === "undefined") return;

  // 1. Device vibration for 3 seconds (500ms vibrate, 250ms pause, 500ms vibrate, 250ms pause, 800ms vibrate)
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([500, 250, 500, 250, 800]);
    } catch {
      // Ignore vibration errors
    }
  }

  // 2. Web Audio API (Sub-millisecond latency & zero network lag)
  const ctx = getAudioContext();
  if (ctx && ctx.state !== "suspended") {
    try {
      const now = ctx.currentTime;
      // Chime 1 at 0.0s (880 Hz - High A)
      playBellStrike(ctx, now, 880, 0.95);
      // Chime 2 at 1.0s (1046.5 Hz - High C)
      playBellStrike(ctx, now + 1.0, 1046.5, 0.95);
      // Chime 3 at 2.0s (1318.5 Hz - High E, rings out to 3.0s)
      playBellStrike(ctx, now + 2.0, 1318.5, 0.98);
      return;
    } catch {
      // Fall through to HTML5 Audio
    }
  }

  // 3. Fallback to HTML5 Audio Element (/bell.mp3 is 3.0s duration)
  try {
    if (!cachedAudioElement) {
      cachedAudioElement = new Audio("/bell.mp3");
      cachedAudioElement.preload = "auto";
    }
    cachedAudioElement.currentTime = 0;
    void cachedAudioElement.play().catch(() => {});
  } catch {
    // Audio playback blocked by browser permissions
  }
}

/**
 * Call on user interaction (click/touch) to resume audio context
 * and bypass browser autoplay restrictions.
 */
export function unlockAudioSystem(): void {
  if (typeof window === "undefined") return;

  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }

  try {
    if (!cachedAudioElement) {
      cachedAudioElement = new Audio("/bell.mp3");
      cachedAudioElement.preload = "auto";
    }
    cachedAudioElement.muted = true;
    void cachedAudioElement
      .play()
      .then(() => {
        cachedAudioElement?.pause();
        if (cachedAudioElement) {
          cachedAudioElement.currentTime = 0;
          cachedAudioElement.muted = false;
        }
      })
      .catch(() => {
        if (cachedAudioElement) {
          cachedAudioElement.muted = false;
        }
      });
  } catch {
    // Ignore unlock errors
  }
}
