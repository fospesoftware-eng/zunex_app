import { randBetween, sleep } from "@/lib/server/demo";

// ---------------------------------------------------------------------------
// Hardware abstraction. The UI and session service only ever speak to this
// interface — swap MockChargingHardware for a real station controller
// (MQTT/Modbus/HTTP) without touching any other layer.
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
}

export class MockChargingHardware implements ChargingHardware {
  async start(cmd: StartCommand, scenario: string): Promise<StartResult> {
    // Simulated handshake latency with the physical station.
    await sleep(randBetween(1300, 1900));
    if (scenario === "start_failed") return { ok: false, code: "hardware_start_failed" };
    if (scenario === "station_offline") return { ok: false, code: "hardware_unreachable" };
    const now = Date.now();
    return {
      ok: true,
      startedAt: now,
      endsAt: now + cmd.minutes * 60_000,
      watts: Math.round(randBetween(27, 33)),
    };
  }

  async stop(cmd: StartCommand, _scenario: string): Promise<StopResult> {
    await sleep(randBetween(600, 900));
    return { ok: true, stoppedAt: Date.now() };
  }
}

export const chargingHardware: ChargingHardware = new MockChargingHardware();
