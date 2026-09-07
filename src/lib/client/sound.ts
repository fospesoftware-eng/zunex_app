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
 * Tap sound — a warm, positive C-major chirp: C5 → E5 → G5 played as a
 * tight three-note arpeggio (~60ms apart). It's a friendly "spark" — like
 * a doorbell welcoming you or energy igniting. Sine fundamentals with
 * subtle triangle harmonics give it warmth; a quick sparkle overtone adds
 * the premium snap. ~300ms total. Throttled to once per 150ms.
 */
export function playTap(): void {
  const c = getCtx();
  if (!c) return;
  const now = Date.now();
  if (now - lastTapAt < 150) return;
  lastTapAt = now;

  ensureRunning(c);
  const t = c.currentTime;

  // Three-note C-major chirp, tight timing so it feels like one warm chord
  // with a melodic tail — not a slow arpeggio.
  const notes: { freq: number; start: number; peak: number; dur: number; harm: number }[] = [
    { freq: 523.25, start: t + 0.0, peak: 0.5, dur: 0.28, harm: 0.18 },  // C5
    { freq: 659.25, start: t + 0.035, peak: 0.42, dur: 0.25, harm: 0.15 }, // E5
    { freq: 783.99, start: t + 0.07, peak: 0.35, dur: 0.22, harm: 0.12 },  // G5
  ];

  for (const n of notes) {
    playTone({
      freq: n.freq,
      startAt: n.start,
      duration: n.dur,
      type: "sine",
      peak: n.peak,
      attack: 0.005,
      release: n.dur * 0.65,
      harmonic: { ratio: 2, level: n.harm },
    });
  }

  // A quick sparkle overtone — rises fast, vanishes fast — gives that
  // premium "snap" feeling at the very beginning, like a tiny ignition.
  const spark = c.createOscillator();
  spark.type = "triangle";
  spark.frequency.setValueAtTime(1568, t);     // G6
  spark.frequency.exponentialRampToValueAtTime(2093, t + 0.05); // C7
  const sg = c.createGain();
  sg.gain.setValueAtTime(0.0001, t);
  sg.gain.exponentialRampToValueAtTime(0.18, t + 0.008);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  spark.connect(sg);
  sg.connect(masterGain!);
  spark.start(t);
  spark.stop(t + 0.12);
}

/**
 * Start sound — the instant charging engages. A quick rising "power-up"
 * chirp (D5 → A5, perfect fifth) that locks into a steady low hum for
 * ~400ms. Evokes the inverter engaging — energy flowing through the
 * cable. Distinct from tap (playful) and complete (celebratory); this is
 * industrial-premium, confirming power is active.
 */
export function playStart(): void {
  const c = getCtx();
  if (!c) return;
  ensureRunning(c);
  const t = c.currentTime;

  // Quick rising fifth — the "power engages" click/chirp.
  playTone({
    freq: 587.33, // D5
    startAt: t + 0.0,
    duration: 0.12,
    type: "triangle",
    peak: 0.5,
    attack: 0.003,
    release: 0.08,
    harmonic: { ratio: 2, level: 0.2 },
  });
  playTone({
    freq: 880.0, // A5 — perfect fifth up
    startAt: t + 0.04,
    duration: 0.14,
    type: "triangle",
    peak: 0.45,
    attack: 0.003,
    release: 0.1,
    harmonic: { ratio: 2, level: 0.18 },
  });

  // Settling low hum — confirms power is steady, not transient.
  playTone({
    freq: 146.83, // D3 — an octave below D5, grounded
    startAt: t + 0.1,
    duration: 0.35,
    type: "sine",
    peak: 0.28,
    attack: 0.02,
    release: 0.3,
    harmonic: { ratio: 3, level: 0.08 }, // subtle 3rd harmonic for warmth
  });

  // A tiny voltage "tick" — imperceptible alone, adds realism in context.
  const tick = c.createOscillator();
  tick.type = "square";
  tick.frequency.setValueAtTime(1200, t + 0.015);
  const tg = c.createGain();
  tg.gain.setValueAtTime(0.08, t + 0.015);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  tick.connect(tg);
  tg.connect(masterGain!);
  tick.start(t + 0.015);
  tick.stop(t + 0.04);
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
