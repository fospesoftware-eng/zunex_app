export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees % 1 === 0 ? rupees.toFixed(0) : rupees.toFixed(2)}`;
}

/** mm:ss, or h:mm:ss when an hour or more remains. */
export function formatCountdown(ms: number): string {
  const clamped = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/**
 * Format a plan's minute value for the duration picker. Sub-minute plans
 * (e.g. 0.5 = 30s) render as "30 SEC"; whole minutes render as "15".
 */
export function formatPlanMinutes(minutes: number): { value: string; unit: string } {
  const totalSec = Math.round(minutes * 60);
  if (totalSec < 60) return { value: String(totalSec), unit: "SEC" };
  return { value: String(Math.round(minutes)), unit: "MIN" };
}
