"use client";

// ---------------------------------------------------------------------------
// sound.ts — a tiny, single-instance Web Audio engine. Lazily creates the
// AudioContext on first user gesture (tap sound) so SSR never touches
// window, and Chrome's autoplay policy is satisfied by the gesture.
//
// Design goals:
//  • Tap — a soft crystalline ping, like a finger tapping a frozen raindrop.
//    Sine sweep up + subtle shimmer harmonic, ~180ms, barely above a whisper.
//  • Complete — a warm major arpeggio (C5 → E5 → G5 → C6), bell-like decay,
//    ~1.5s total. Each note is sine + triangle harmonic with gentle ADSR.
//
// Both are deliberately quiet (max gain 0.15) so they feel premium, not
// game-like. No assets, no network — pure synthesis.
// ---------------------------------------------------------------------------

type AudioCtxCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let lastTapAt = 0;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor: AudioCtxCtor | undefined =
    (window as unknown as { AudioContext?: AudioCtxCtor }).AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.15;
  masterGain.connect(ctx.destination);
  return ctx;
}

function ensureRunning(ctx: AudioContext): void {
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

/**
 * Play a single synthesized tone with ADSR envelope. Used as the building
 * block for both sound effects.
 */
function playTone(opts: {
  freq: number;
  startAt: number;
  duration: number;
  type?: OscillatorType;
  peak?: number;
  attack?: number;
  release?: number;
  harmonic?: { ratio: number; level: number };
}): void {
  const c = getCtx();
  if (!c || !masterGain) return;
  ensureRunning(c);

  const osc = c.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, opts.startAt);

  const gain = c.createGain();
  const peak = opts.peak ?? 0.6;
  const attack = opts.attack ?? 0.008;
  const release = opts.release ?? Math.min(opts.duration * 0.6, 0.3);

  gain.gain.setValueAtTime(0.0001, opts.startAt);
  gain.gain.exponentialRampToValueAtTime(peak, opts.startAt + attack);
  gain.gain.setValueAtTime(peak, opts.startAt + opts.duration - release);
  gain.gain.exponentialRampToValueAtTime(0.0001, opts.startAt + opts.duration);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(opts.startAt);
  osc.stop(opts.startAt + opts.duration + 0.02);

  // Optional soft harmonic for richness.
  if (opts.harmonic) {
    const h = c.createOscillator();
    h.type = "sine";
    h.frequency.setValueAtTime(opts.freq * opts.harmonic.ratio, opts.startAt);
    const hg = c.createGain();
    hg.gain.setValueAtTime(0.0001, opts.startAt);
    hg.gain.exponentialRampToValueAtTime(peak * opts.harmonic.level, opts.startAt + attack);
    hg.gain.setValueAtTime(peak * opts.harmonic.level, opts.startAt + opts.duration - release);
    hg.gain.exponentialRampToValueAtTime(0.0001, opts.startAt + opts.duration);
    h.connect(hg);
    hg.connect(masterGain);
    h.start(opts.startAt);
    h.stop(opts.startAt + opts.duration + 0.02);
  }
}

/**
 * Tap sound — a crystalline ping with a gentle upward frequency sweep
 * and a barely-audible shimmer. ~180ms total. Throttled to max once per 120ms
 * so rapid taps don't stack.
 */
export function playTap(): void {
  const c = getCtx();
  if (!c) return;
  const now = Date.now();
  if (now - lastTapAt < 120) return;
  lastTapAt = now;

  ensureRunning(c);
  const t = c.currentTime;

  // Soft upward sweep from ~880Hz to ~1320Hz — a perfect fifth glide.
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(1318.51, t + 0.12);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.55, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);

  osc.connect(gain);
  gain.connect(masterGain!);
  osc.start(t);
  osc.stop(t + 0.2);

  // Shimmer harmonic at the octave, very quiet, for that frozen-raindrop feel.
  const shimmer = c.createOscillator();
  shimmer.type = "sine";
  shimmer.frequency.setValueAtTime(1760, t);
  shimmer.frequency.exponentialRampToValueAtTime(2637, t + 0.12);
  const sg = c.createGain();
  sg.gain.setValueAtTime(0.0001, t);
  sg.gain.exponentialRampToValueAtTime(0.15, t + 0.012);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  shimmer.connect(sg);
  sg.connect(masterGain!);
  shimmer.start(t);
  shimmer.stop(t + 0.18);
}

/**
 * Complete sound — a warm C-major arpeggio (C5 → E5 → G5 → C6) with bell-like
 * decay. Each note overlaps slightly with the next for a lush, resonant tail.
 * ~1.5s total.
 */
export function playComplete(): void {
  const c = getCtx();
  if (!c) return;
  ensureRunning(c);
  const t = c.currentTime;

  // C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.50
  const notes: { freq: number; start: number; dur: number }[] = [
    { freq: 523.25, start: t + 0.0, dur: 1.2 },
    { freq: 659.25, start: t + 0.14, dur: 1.1 },
    { freq: 783.99, start: t + 0.28, dur: 1.0 },
    { freq: 1046.5, start: t + 0.42, dur: 1.2 },
  ];

  for (const n of notes) {
    playTone({
      freq: n.freq,
      startAt: n.start,
      duration: n.dur,
      type: "sine",
      peak: 0.45,
      attack: 0.01,
      release: n.dur * 0.55,
      harmonic: { ratio: 2, level: 0.12 },
    });
  }
}
