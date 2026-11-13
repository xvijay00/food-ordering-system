/**
 * Bakers Nation Custom Order Alert Bell Audio System
 * Plays the user's custom bell audio (/bell.mp3) with instant Web Audio API
 * decoded buffer playback, HTML5 Audio element fallback, and 3-second device vibration.
 */

let sharedAudioCtx: AudioContext | null = null;
let cachedAudioBuffer: AudioBuffer | null = null;
let cachedAudioElement: HTMLAudioElement | null = null;
let isPreloading = false;

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
 * Pre-fetches and decodes /bell.mp3 into an in-memory AudioBuffer
 * for zero-latency, stutter-free playback.
 */
async function preloadBellBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
  if (cachedAudioBuffer) return cachedAudioBuffer;
  if (isPreloading) return null;

  isPreloading = true;
  try {
    const response = await fetch("/bell.mp3");
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    cachedAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return cachedAudioBuffer;
  } catch {
    return null;
  } finally {
    isPreloading = false;
  }
}

/**
 * Plays the user's custom bell audio file (/bell.mp3) and vibrates device.
 */
export function playOrderAlertBell(): void {
  if (typeof window === "undefined") return;

  // 1. Device vibration for ~3 seconds on mobile phones
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([400, 150, 400, 150, 400, 150, 600]);
    } catch {
      // Ignore vibration error
    }
  }

  // 2. Try zero-latency Web Audio API with pre-decoded buffer
  const ctx = getAudioContext();
  if (ctx && ctx.state !== "suspended") {
    if (cachedAudioBuffer) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = cachedAudioBuffer;
        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        return;
      } catch {
        // Fall through to HTML5 Audio
      }
    } else {
      // Kick off background decode for next time
      void preloadBellBuffer(ctx);
    }
  }

  // 3. HTML5 Audio Element playback of /bell.mp3
  try {
    if (!cachedAudioElement) {
      cachedAudioElement = new Audio("/bell.mp3");
      cachedAudioElement.preload = "auto";
    }
    cachedAudioElement.currentTime = 0;
    cachedAudioElement.volume = 1.0;
    const playPromise = cachedAudioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy fallback
      });
    }
  } catch {
    // Audio playback blocked
  }
}

/**
 * Call on first user click/touch or page load to unlock audio permissions
 * and pre-warm both Web Audio and HTML5 audio element.
 */
export function unlockAudioSystem(): void {
  if (typeof window === "undefined") return;

  const ctx = getAudioContext();
  if (ctx) {
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    void preloadBellBuffer(ctx);
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
