import { randBetween, sleep } from "@/lib/server/demo";
import {
  awaitCommandAck,
  getStationTelemetry,
  isMqttConfigured,
  publishCommand,
} from "@/lib/server/mqtt";
import type { PortTelemetry, StationTelemetry } from "@/lib/core/types";

// ---------------------------------------------------------------------------
// Hardware abstraction. The UI and session service only ever speak to this
// interface — swap MockChargingHardware for the MQTT-backed controller
// without touching any other layer. ZUNEX_MQTT_URL selects the MQTT
// implementation; demo scenarios always ride the mock so they stay testable.
// ---------------------------------------------------------------------------

export interface StartCommand {
  sessionId: string;
  stationId: string;
  minutes: number;
}

export type StartResult =
  | { ok: true; startedAt: number; endsAt: number; watts: number }
  | { ok: false; code: "hardware_start_failed" | "hardware_unreachable" };

export interface StopResult {
  ok: boolean;
  stoppedAt: number;
}

export interface ChargingHardware {
  start(cmd: StartCommand, scenario: string): Promise<StartResult>;
  stop(cmd: StartCommand, scenario: string): Promise<StopResult>;
  /** Latest port telemetry from the field, if the station reports it. */
  telemetry(stationId: string): Promise<StationTelemetry | null>;
}

export class MockChargingHardware implements ChargingHardware {
  async start(cmd: StartCommand, scenario: string): Promise<StartResult> {
    // Simulated handshake latency with the physical station.
    await sleep(randBetween(1300, 1900));
    if (scenario === "start_failed") return { ok: false, code: "hardware_start_failed" };
    if (scenario === "station_offline") return { ok: false, code: "hardware_unreachable" };
    const now = Date.now();
    // The charge always runs for the full plan duration. The "Charging
    // completed" demo scenario still drops the network client-side, but it
    // does NOT shorten the charge — use "Fast-forward to completion" in the
    // demo panel to reach the completed screen quickly.
    return {
      ok: true,
      startedAt: now,
      endsAt: now + cmd.minutes * 60_000,
      watts: Math.round(randBetween(27, 33)),
    };
  }

  async stop(_cmd: StartCommand, _scenario: string): Promise<StopResult> {
    await sleep(randBetween(600, 900));
    return { ok: true, stoppedAt: Date.now() };
  }

  async telemetry(): Promise<StationTelemetry | null> {
    return null; // the mock has no field hardware behind it
  }
}

const ACK_TIMEOUT_MS = 8_000;

function newRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Real station controller over MQTT. Publishes commands and waits for the
 * station's ack; telemetry arrives asynchronously and is served from the
 * MQTT link's cache.
 */
export class MqttChargingHardware implements ChargingHardware {
  async start(cmd: StartCommand, scenario: string): Promise<StartResult> {
    // Demo scenarios keep using the mock so they stay deterministic.
    if (scenario !== "default") return mock.start(cmd, scenario);

    const requestId = newRequestId();
    await publishCommand(cmd.stationId, "start", {
      requestId,
      sessionId: cmd.sessionId,
      minutes: cmd.minutes,
    });
    const ack = await awaitCommandAck(cmd.stationId, "start", requestId, ACK_TIMEOUT_MS);
    if (!ack || ack.ok === false) {
      return { ok: false, code: ack?.code === "hardware_start_failed" ? "hardware_start_failed" : "hardware_unreachable" };
    }

    // The station owns the real schedule; the server mirrors it for the UI.
    // The ack may carry actuals; fall back to a plan-length window.
    const startedAt = Date.now();
    const minutes = cmd.minutes;
    return {
      ok: true,
      startedAt,
      endsAt: startedAt + minutes * 60_000,
      watts: 30,
    };
  }

  async stop(cmd: StartCommand, scenario: string): Promise<StopResult> {
    if (scenario !== "default") return mock.stop(cmd, scenario);

    const requestId = newRequestId();
    await publishCommand(cmd.stationId, "stop", { requestId, sessionId: cmd.sessionId });
    const ack = await awaitCommandAck(cmd.stationId, "stop", requestId, ACK_TIMEOUT_MS);
    return { ok: Boolean(ack?.ok ?? true), stoppedAt: Date.now() };
  }

  async telemetry(stationId: string): Promise<StationTelemetry | null> {
    return getStationTelemetry(stationId);
  }
}

export const mock = new MockChargingHardware();

/**
 * Selected hardware backend:
 *  - ZUNEX_MQTT_URL set    → real stations over MQTT (demo scenarios → mock)
 *  - otherwise (default)   → mock, so demo/preview runs with zero infra
 */
export const chargingHardware: ChargingHardware = isMqttConfigured()
  ? new MqttChargingHardware()
  : mock;

export type { PortTelemetry };

