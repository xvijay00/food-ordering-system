/**
 * 3-Second Sharp Doorbell Alert Audio System
 * Uses Web Audio API with a crisp, penetrating two-tone "Ding-Dong!" doorbell
 * sequence (Ding at 1175Hz, Dong at 880Hz, played twice across 3 seconds)
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
 * Synthesizes a sharp, cutting doorbell chime with high-frequency metallic transient
 */
function playDoorbellChime(
  ctx: AudioContext,
  startTime: number,
  baseFreq: number,
  duration = 0.85,
  isHigh = false
) {
  try {
    const now = ctx.currentTime;
    const actualStart = Math.max(startTime, now);

    // 1. Fundamental tone (Clear bell strike)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(baseFreq, actualStart);

    // 2. Bright harmonic overtone (Octave higher for piercing clarity)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(baseFreq * 2, actualStart);

    // 3. Metallic ring overtone (Adds that sharp brass chime rod sound)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "triangle";
    osc3.frequency.setValueAtTime(baseFreq * 2.76, actualStart);

    // Very fast attack (4ms) for maximum sharpness, then exponential chime decay
    const peak1 = isHigh ? 0.75 : 0.65;
    gain1.gain.setValueAtTime(0.0001, actualStart);
    gain1.gain.exponentialRampToValueAtTime(peak1, actualStart + 0.004);
    gain1.gain.exponentialRampToValueAtTime(0.0001, actualStart + duration);

    gain2.gain.setValueAtTime(0.0001, actualStart);
    gain2.gain.exponentialRampToValueAtTime(0.35, actualStart + 0.004);
    gain2.gain.exponentialRampToValueAtTime(0.0001, actualStart + duration * 0.7);

    // Metallic overtone dies out quickly to leave a clear bell resonance
    gain3.gain.setValueAtTime(0.0001, actualStart);
    gain3.gain.exponentialRampToValueAtTime(0.2, actualStart + 0.003);
    gain3.gain.exponentialRampToValueAtTime(0.0001, actualStart + 0.25);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);

    gain1.connect(ctx.destination);
    gain2.connect(ctx.destination);
    gain3.connect(ctx.destination);

    osc1.start(actualStart);
    osc2.start(actualStart);
    osc3.start(actualStart);

    osc1.stop(actualStart + duration);
    osc2.stop(actualStart + duration);
    osc3.stop(actualStart + 0.3);
  } catch {
    // Ignore audio graph errors
  }
}

/**
 * Rings the sharp "Ding-Dong!" doorbell for exactly 3 seconds.
 * Pattern:
 * 1. "Ding!" at 0.0s (1175 Hz - High pitch, sharp cutting strike)
 * 2. "Dong!" at 0.55s (880 Hz - Warm resonant tone)
 * 3. "Ding!" at 1.5s (1175 Hz - Repeat sharp strike)
 * 4. "Dong!" at 2.05s (880 Hz - Resonant chime sustaining to 3.0s)
 */
export function playOrderAlertBell(): void {
  if (typeof window === "undefined") return;

  // 1. Device vibration for 3 seconds
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([400, 150, 400, 150, 400, 150, 600]);
    } catch {
      // Ignore vibration errors
    }
  }

  // 2. Web Audio API (Instantaneous, sharp, zero network latency)
  const ctx = getAudioContext();
  if (ctx && ctx.state !== "suspended") {
    try {
      const now = ctx.currentTime;
      const DING_FREQ = 1174.66; // High D6 (Sharp Ding)
      const DONG_FREQ = 880.0;   // A5 (Resonant Dong)

      // First Ding-Dong (0.0s - 1.5s)
      playDoorbellChime(ctx, now + 0.0, DING_FREQ, 0.55, true);
      playDoorbellChime(ctx, now + 0.55, DONG_FREQ, 0.95, false);

      // Second Ding-Dong (1.5s - 3.0s)
      playDoorbellChime(ctx, now + 1.5, DING_FREQ, 0.55, true);
      playDoorbellChime(ctx, now + 2.05, DONG_FREQ, 0.95, false);
      return;
    } catch {
      // Fall through to HTML5 Audio
    }
  }

  // 3. Fallback to HTML5 Audio Element (/bell.mp3 is 3.0s sharp doorbell)
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

