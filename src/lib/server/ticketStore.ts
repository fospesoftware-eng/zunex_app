// ---------------------------------------------------------------------------
// Support ticket store — JSON file-backed with graceful in-memory fallback.
// File lives at ./data/tickets.json relative to CWD.
// ---------------------------------------------------------------------------

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  requesterName: string;
  requesterEmail: string;
  stationId: string | null;
  assignee: string | null;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
}

const DATA_DIR = join(process.cwd(), "data");
const FILE = join(DATA_DIR, "tickets.json");

let memoryOnlyFallback = false;

function ensureDataDir(): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(join(DATA_DIR, ".write_test"), "ok");
  } catch {
    memoryOnlyFallback = true;
  }
}

function now(): number {
  return Date.now();
}

function newId(): string {
  return `tk_${now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

function seed(): Ticket[] {
  const t = now();
  return [
    {
      id: "tk_seed_a",
      subject: "ZNX-A1 charging port not detecting device",
      description: "Station at Prestige Tech Park Level 2 stopped accepting devices after the overnight firmware push.",
      priority: "critical",
      status: "open",
      requesterName: "Priya Menon",
      requesterEmail: "priya@prestigetp.example",
      stationId: "ZNX-A1",
      assignee: null,
      createdAt: t - 2 * 3600_000,
      updatedAt: t - 2 * 3600_000,
      closedAt: null,
    },
    {
      id: "tk_seed_b",
      subject: "Billing discrepancy — double charged",
      description: "Customer was billed twice for the same 25-minute session on ZNX-B2.",
      priority: "high",
      status: "open",
      requesterName: "Karthik Iyer",
      requesterEmail: "karthik.iyer@example.com",
      stationId: "ZNX-B2",
      assignee: null,
      createdAt: t - 5 * 3600_000,
      updatedAt: t - 4 * 3600_000,
      closedAt: null,
    },
    {
      id: "tk_seed_c",
      subject: "MQTT broker flapping — ZNX-L1 offline intermittently",
      description: "Telemetry shows L1 going offline every ~30 minutes for the past hour. Broker logs suggest a keepalive race.",
      priority: "medium",
      status: "in_progress",
      requesterName: "Ops Team",
      requesterEmail: "ops@zunexglobal.com",
      stationId: "ZNX-L1",
      assignee: "admin@zunexglobal.com",
      createdAt: t - 9 * 3600_000,
      updatedAt: t - 1 * 3600_000,
      closedAt: null,
    },
    {
      id: "tk_seed_d",
      subject: "Welcome screen typo on Chinese locale",
      description: "Minor text fix — already merged, waiting release.",
      priority: "low",
      status: "resolved",
      requesterName: "Lin Wei",
      requesterEmail: "lin.wei@example.com",
      stationId: null,
      assignee: "admin@zunexglobal.com",
      createdAt: t - 48 * 3600_000,
      updatedAt: t - 24 * 3600_000,
      closedAt: null,
    },
  ];
}

let cached: Ticket[] | null = null;

function load(): Ticket[] {
  ensureDataDir();
  if (memoryOnlyFallback) return seed();
  try {
    if (existsSync(FILE)) {
      const raw = readFileSync(FILE, "utf-8");
      return JSON.parse(raw) as Ticket[];
    }
  } catch {
    // fall through
  }
  const fresh = seed();
  write(fresh);
  return fresh;
}

function write(items: Ticket[]): void {
  if (memoryOnlyFallback) return;
  try {
    ensureDataDir();
    writeFileSync(FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch {
    memoryOnlyFallback = true;
  }
}

function all(): Ticket[] {
  if (!cached) cached = load();
  return cached;
}

function persist(): void {
  write(all());
}

export interface TicketFilter {
  status?: TicketStatus;
  priority?: TicketPriority;
  stationId?: string;
  search?: string;
}

export function listTickets(filter?: TicketFilter): Ticket[] {
  const items = all();
  if (!filter) return items.map((t) => ({ ...t }));
  return items
    .filter((t) => {
      if (filter.status && t.status !== filter.status) return false;
      if (filter.priority && t.priority !== filter.priority) return false;
      if (filter.stationId && t.stationId !== filter.stationId) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const haystack =
          `${t.subject} ${t.description} ${t.requesterName} ${t.requesterEmail} ${t.id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .map((t) => ({ ...t }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getTicket(id: string): Ticket | null {
  const t = all().find((x) => x.id === id);
  return t ? { ...t } : null;
}

export function createTicket(
  data: Omit<Ticket, "id" | "createdAt" | "updatedAt" | "closedAt" | "status"> & { status?: TicketStatus },
): Ticket {
  const t = now();
  const ticket: Ticket = {
    ...data,
    id: newId(),
    status: data.status ?? "open",
    createdAt: t,
    updatedAt: t,
    closedAt: data.status === "closed" ? t : null,
  };
  all().push(ticket);
  persist();
  return { ...ticket };
}

export function updateTicket(
  id: string,
  patch: Partial<Omit<Ticket, "id" | "createdAt">>,
): Ticket | null {
  const list = all();
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  const existing = list[idx];
  const updated: Ticket = { ...existing, ...patch, updatedAt: now() };
  // closedAt management
  if (patch.status === "closed" && existing.status !== "closed" && !existing.closedAt) {
    updated.closedAt = now();
  } else if (patch.status && patch.status !== "closed" && existing.status === "closed") {
    updated.closedAt = null;
  }
  list[idx] = updated;
  persist();
  return { ...updated };
}

export function deleteTicket(id: string): boolean {
  const list = all();
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  persist();
  return true;
}
