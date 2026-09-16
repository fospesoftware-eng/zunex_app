-- =========================================================================
-- ZUNEX Supabase Schema — LiveDB
-- Run in Supabase SQL Editor to initialize the database.
-- =========================================================================

-- -------------------------------------------------------------------------
-- stations — physical charging stations
-- -------------------------------------------------------------------------
create table if not exists public.stations (
  id              text primary key,                     -- ZNX-A1, ZNX-B2, ...
  name            text not null,
  location        text,
  city            text,
  state           text,
  lat             double precision,
  lng             double precision,
  power_watts     integer default 45,
  connector       text default 'USB-C',
  device_model    text default 'plus',                  -- 'core' | 'plus'
  install_type    text default 'mall',                 -- 'car'|'mall'|...
  base_status     text default 'available',             -- 'available'|'maintenance'|'offline'
  force_status    text,                                 -- admin override
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_stations_city on public.stations(city);

-- -------------------------------------------------------------------------
-- sessions — charging sessions (authoritative, not just cache)
-- -------------------------------------------------------------------------
create table if not exists public.sessions (
  id              text primary key,                     -- zs_...
  station_id      text not null references public.stations(id),
  plan_id         text not null,
  started_at      timestamptz default now(),
  ends_at         timestamptz,
  stopped_at      timestamptz,
  state           text default 'starting',              -- see SessionState union
  power_kw        double precision,
  delivered_kwh   double precision default 0,
  client_did      text,
  created_at      timestamptz default now()
);

create index if not exists idx_sessions_station on public.sessions(station_id);
create index if not exists idx_sessions_state  on public.sessions(state);
create index if not exists idx_sessions_ends   on public.sessions(ends_at);

-- -------------------------------------------------------------------------
-- station_heartbeats — live telemetry (append-only, purged by date)
-- -------------------------------------------------------------------------
create table if not exists public.station_heartbeats (
  station_id      text not null references public.stations(id) on delete cascade,
  ts              timestamptz default now(),
  power_kw        double precision,
  voltage         double precision,
  connector_state text,
  firmware        text,
  primary key (station_id, ts)
) with (fillfactor = 100);

create index if not exists idx_hb_ts on public.station_heartbeats(ts desc);

-- -------------------------------------------------------------------------
-- admin_config — key-value store (replaces data/admin-config.json)
-- -------------------------------------------------------------------------
create table if not exists public.admin_config (
  key   text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- =========================================================================
-- RLS: open for now (ZUNEX publishable key is public)
-- =========================================================================
alter table public.stations           enable row level security;
alter table public.sessions           enable row level security;
alter table public.station_heartbeats enable row level security;
alter table public.admin_config       enable row level security;

-- Allow SELECT on stations (anyone can see where to charge)
drop policy if exists "stations select" on public.stations;
create policy "stations select" on public.stations for select using (true);

-- Allow SELECT on sessions (anyone can read session status)
drop policy if exists "sessions select" on public.sessions;
create policy "sessions select" on public.sessions for select using (true);

-- Allow SELECT on heartbeats
drop policy if exists "heartbeats select" on public.station_heartbeats;
create policy "heartbeats select" on public.station_heartbeats for select using (true);

-- Allow SELECT on admin_config (read-only from client)
drop policy if exists "config select" on public.admin_config;
create policy "config select" on public.admin_config for select using (true);

-- INSERT/UPDATE/DELETE require service_role or custom admin auth — run
-- these separately from a secured backend, not the client.
-- For now, block writes from the publishable key:
drop policy if exists "stations write" on public.stations;
create policy "stations write blocked" on public.stations
  for all using (false) with check (false);

drop policy if exists "sessions write blocked" on public.sessions;
create policy "sessions write blocked" on public.sessions
  for all using (false) with check (false);

drop policy if exists "heartbeats write blocked" on public.station_heartbeats;
create policy "heartbeats write blocked" on public.station_heartbeats
  for all using (false) with check (false);

drop policy if exists "config write blocked" on public.admin_config;
create policy "config write blocked" on public.admin_config
  for all using (false) with check (false);

-- =========================================================================
-- Seed: insert the 15 demo stations from STATION_CONFIGS
-- =========================================================================
insert into public.stations (id, name, location, power_watts, connector, base_status, device_model, install_type, city, state, lat, lng) values
  ('ZNX-A1','Zunex Gateway','Gateway Mall — Level 2',45,'USB-C','available','plus','mall','Mumbai','Maharashtra',19.0760,72.8777),
  ('ZNX-A2','Zunex BKC Hub','Bandra Kurla Complex',45,'USB-C','available','plus','office','Mumbai','Maharashtra',19.0596,72.8425),
  ('ZNX-B2','ZUNEX B2','MG Road Store — Ground Floor',30,'USB-C','available','core','retail','Bangalore','Karnataka',12.9716,77.5946),
  ('ZNX-B3','Zunex Whitefield','Phoenix MarketCity Mall',45,'USB-C','maintenance','plus','mall','Bangalore','Karnataka',12.9873,77.6409),
  ('ZNX-L1','ZUNEX L1','NH8 Rest Stop — Highway',45,'USB-C','available','plus','highway','Delhi','Delhi',28.6139,77.2090),
  ('ZNX-D2','Zunex Connaught','Connaught Place Charging Hub',30,'USB-C','available','core','outdoor','Delhi','Delhi',28.6328,77.2182),
  ('ZNX-K3','ZUNEX K3','Chennai Tech Park — Office Bay',30,'USB-C','available','core','office','Chennai','Tamil Nadu',13.0827,80.2707),
  ('ZNX-K4','Zunex OMR','Sholinganallur — IT Corridor',45,'USB-C','offline','plus','highway','Chennai','Tamil Nadu',12.8844,80.2257),
  ('ZNX-M1','ZUNEX M1','Hyundai Service Centre',45,'USB-C','available','plus','car','Hyderabad','Telangana',17.3850,78.4867),
  ('ZNX-H2','Zunex Gachibowli','Financial District Towers',30,'USB-C','available','core','office','Hyderabad','Telangana',17.4432,78.3520),
  ('ZNX-C1','ZUNEX C1','Park Street Charging Hub',30,'USB-C','available','core','outdoor','Kolkata','West Bengal',22.5726,88.3639),
  ('ZNX-C2','Zunex Salt Lake','Techno City Sector V',45,'USB-C','available','plus','office','Kolkata','West Bengal',22.5958,88.4549),
  ('ZNX-P1','ZUNEX P1','SG Highway Mall',45,'USB-C','available','plus','mall','Ahmedabad','Gujarat',23.0225,72.5714),
  ('ZNX-P2','Zunex Sindhu Bhavan','SG Highway Service Road',30,'USB-C','available','core','car','Ahmedabad','Gujarat',23.0316,72.5550),
  ('ZNX-J1','ZUNEX J1','Cuffe Parade Outpost',30,'USB-C','available','core','outdoor','Jaipur','Rajasthan',26.9124,75.7873)
on conflict (id) do nothing;
