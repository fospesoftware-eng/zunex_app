// ---------------------------------------------------------------------------
// ZUNEX core domain types — shared between server services and the UI layer.
// ---------------------------------------------------------------------------

/** Lifecycle of a charging session. The server is the single source of truth. */
export type SessionState =
  | "payment_pending" // duration selected, awaiting UPI payment
  | "payment_successful" // payment verified server-side
  | "starting" // start command issued to hardware, awaiting confirmation
  | "charging_active" // station confirmed energy flow
  | "stopping" // stop command issued, awaiting station confirmation
  | "charging_completed" // station confirmed stop, session settled
  | "cancelled" // user cancelled or session expired
  | "error"; // terminal failure (payment/start)

export type StationStatus = "available" | "busy" | "offline" | "maintenance";

export type DemoScenario =
  | "default"
  | "station_offline"
  | "payment_failed"
  | "start_failed"
  | "network"
  | "network_complete";

export interface ChargingPlan {
  id: string;
  minutes: number;
  pricePaise: number;
  label: string;
  tagline: string;
}

export interface Station {
  id: string;
  name: string;
  location: string;
  status: StationStatus;
  powerWatts: number;
  connector: string;
  plans: ChargingPlan[];
}

export interface PaymentIntentDTO {
  intentId: string;
  amountPaise: number;
  upiUri: string;
  apps: UpiAppTarget[];
}

export interface UpiAppTarget {
  id: "phonepe" | "gpay" | "upi" | "card";
  name: string;
  uri: string;
}

export interface ChargingRuntimeDTO {
  status: "starting" | "active" | "stopping" | "stopped";
  startedAt: number;
  endsAt: number;
  watts: number;
}

export interface FriendlyError {
  code: string;
  title: string;
  message: string;
}

/** Full snapshot of a session pushed to clients (source of truth). */
export interface SessionSnapshot {
  sessionId: string;
  stationId: string;
  state: SessionState;
  plan: ChargingPlan | null;
  amountPaise: number;
  payment: { intentId: string; verifiedAt: number } | null;
  charging: ChargingRuntimeDTO | null;
  errorCode: string | null;
  error: FriendlyError | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  serverTime: number;
}

export interface StationPayload {
  station: Station;
  serverTime: number;
}

// ---------------------------------------------------------------------------
// Hardware telemetry (MQTT) — reported by the station controller.
// All fields beyond `connected`/`charging` are best-effort: they depend on
// what the phone/station electronics can actually report, so every optional
// field must be treated as "unknown" by consumers.
// ---------------------------------------------------------------------------

/** What we can learn about the plugged-in phone (when the hardware reports it). */
export interface DeviceInfo {
  manufacturer?: string;
  model?: string;
  os?: string; // "Android" | "iOS" | ...
  osVersion?: string;
  batteryTechnology?: string; // "Li-ion", "Li-poly", ...
  usbType?: "usb-c" | "micro-usb" | "lightning" | "unknown";
  fastChargeSupported?: boolean;
}

/** Live state of one charging port, as reported by the station hardware. */
export interface PortTelemetry {
  stationId: string;
  portId: string;
  /** A device is physically plugged into this port (cable detected). */
  connected: boolean;
  /** Power is actively flowing (device is drawing charge). */
  charging: boolean;
  /** Best-effort: battery percentage is only available if the device reports it. */
  batteryLevelPct?: number | null;
  powerWatts?: number | null;
  voltage?: number | null;
  currentAmps?: number | null;
  temperatureC?: number | null;
  device?: DeviceInfo | null;
  /** Hardware clock when the reading was taken. */
  reportedAt: number;
  /** Server clock when MQTT delivered it. */
  receivedAt: number;
}

/** Aggregate view of one station as last reported over MQTT. */
export interface StationTelemetry {
  stationId: string;
  /** Station controller reachable on the broker (presence / last-will). */
  online: boolean;
  lastSeenAt: number;
  ports: Record<string, PortTelemetry>;
}

// ---------------------------------------------------------------------------
// API envelope
// ---------------------------------------------------------------------------

export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; friendly?: FriendlyError };

// ---------------------------------------------------------------------------
// Error code → customer friendly copy mapping (server provides, client renders)
// ---------------------------------------------------------------------------

export const FRIENDLY_ERRORS: Record<string, FriendlyError> = {
  station_offline: {
    code: "station_offline",
    title: "This station is resting",
    message:
      "It will be back shortly. In the meantime, a nearby ZUNEX station would love to help.",
  },
  station_maintenance: {
    code: "station_maintenance",
    title: "Scheduled care in progress",
    message:
      "This station is getting a little attention right now. Please try another one nearby.",
  },
  station_busy: {
    code: "station_busy",
    title: "Station is in use",
    message: "Someone is charging here at the moment. It will free up shortly.",
  },
  station_not_found: {
    code: "station_not_found",
    title: "Station not recognised",
    message:
      "We could not identify this charging station. Please scan the QR code printed on it.",
  },
  session_not_found: {
    code: "session_not_found",
    title: "Session not found",
    message: "This charging session is no longer active. Let us start a fresh one.",
  },
  session_expired: {
    code: "session_expired",
    title: "Session expired",
    message: "This request timed out before payment. Nothing was charged.",
  },
  payment_failed: {
    code: "payment_failed",
    title: "Payment did not go through",
    message:
      "Your bank declined the request or it timed out. You can retry safely — nothing was charged twice.",
  },
  charging_start_failed: {
    code: "charging_start_failed",
    title: "Power could not start",
    message:
      "Your payment is safe. The station could not begin charging — retry, or end the session for an instant refund.",
  },
  hardware_unreachable: {
    code: "hardware_unreachable",
    title: "Station is not responding",
    message: "We lost contact with the hardware. Give it a moment and try again.",
  },
  network: {
    code: "network",
    title: "Connection interrupted",
    message: "We could not reach the ZUNEX cloud. Check your signal and try again.",
  },
  invalid_request: {
    code: "invalid_request",
    title: "Something went wrong",
    message: "That request looked unusual. Please try again.",
  },
};

export function friendlyError(code: string | null | undefined): FriendlyError | null {
  if (!code) return null;
  return FRIENDLY_ERRORS[code] ?? FRIENDLY_ERRORS.invalid_request;
}
