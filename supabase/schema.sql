-- =========================================================================
-- ZUNEX Supabase Schema — LiveDB
-- Run in Supabase SQL Editor. Fully idempotent — safe to re-run any time.
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
  install_type    text default 'mall',                  -- 'car'|'mall'|...
  base_status     text default 'available',             -- 'available'|'maintenance'|'offline'
  force_status    text,                                 -- admin override
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_stations_city on public.stations(city);

-- -------------------------------------------------------------------------
-- hardware — physical hardware devices bound to stations
-- -------------------------------------------------------------------------
create table if not exists public.hardware (
  id                    text primary key,               -- hw_ZNX-A1
  station_id            text not null references public.stations(id),
  device_id             text unique,                    -- ZXN-DVC-ZNX-A1-001
  device_type           text not null default 'zunex_one'
                        check (device_type in ('zunex_one','zunex_plus')),
  broker_url            text,
  mqtt_topic            text,
  mqtt_port             integer default 1883,
  client_id             text,
  use_tls               boolean default false,
  username              text,
  password              text,
  firmware_version      text,
  heartbeat_interval_ms integer default 30000,
  last_seen_at          bigint,                         -- unix epoch ms
  connection_status     text default 'offline',         -- 'online'|'offline'|'disconnected'
  telemetry_enabled     boolean default true,
  updated_at            bigint,
  created_at            timestamptz default now()
);

-- Columns added after initial release — idempotent ALTERs run BEFORE
-- indexes/seeds (CREATE TABLE is a no-op on existing DBs).
alter table public.hardware add column if not exists device_type text not null default 'zunex_one';
alter table public.hardware add column if not exists client_id text;
alter table public.hardware add column if not exists use_tls boolean default false;
alter table public.hardware drop constraint if exists hardware_device_type_check;
alter table public.hardware add constraint hardware_device_type_check
  check (device_type in ('zunex_one','zunex_plus'));

create index if not exists idx_hw_station on public.hardware(station_id);
create index if not exists idx_hw_status  on public.hardware(connection_status);
create index if not exists idx_hw_devtype on public.hardware(device_type);

-- -------------------------------------------------------------------------
-- sessions — charging sessions (authoritative, not just cache)
-- -------------------------------------------------------------------------
create table if not exists public.sessions (
  id                text primary key,                   -- zs_...
  station_id        text not null references public.stations(id),
  device_id         text,                               -- hardware device used (hw_...)
  plan_id           text not null,
  amount_paise      integer,                            -- charged amount (0 = ad-sponsored)
  payment_intent_id text,                               -- PSP intent reference (pi_...)
  started_at        timestamptz default now(),
  ends_at           timestamptz,
  stopped_at        timestamptz,
  paid_at           timestamptz,
  state             text default 'starting',            -- see SessionState union
  power_kw          double precision,
  delivered_kwh     double precision default 0,
  client_did        text,
  created_at        timestamptz default now()
);

-- Columns added after initial release — idempotent ALTERs for existing DBs.
alter table public.sessions add column if not exists device_id text;
alter table public.sessions add column if not exists amount_paise integer;
alter table public.sessions add column if not exists payment_intent_id text;
alter table public.sessions add column if not exists paid_at timestamptz;

create index if not exists idx_sessions_station on public.sessions(station_id);
create index if not exists idx_sessions_device  on public.sessions(device_id);
create index if not exists idx_sessions_state   on public.sessions(state);
create index if not exists idx_sessions_ends    on public.sessions(ends_at);

-- -------------------------------------------------------------------------
-- station_heartbeats — live telemetry (append-only)
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
-- admin_config — key-value store
-- -------------------------------------------------------------------------
create table if not exists public.admin_config (
  key   text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- admins — admin accounts linked to Supabase Auth users
-- -------------------------------------------------------------------------
create table if not exists public.admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text,
  role        text not null default 'operator'
              check (role in ('super_admin','admin','operator','support')),
  avatar_url  text,
  last_login  timestamptz,
  active      boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_admins_role   on public.admins(role);
create index if not exists idx_admins_active on public.admins(active);

-- -------------------------------------------------------------------------
-- Trigger: bootstrap an admins row when an auth user is created
-- -------------------------------------------------------------------------
create or replace function public.handle_new_admin()
returns trigger as $$
begin
  insert into public.admins (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 'operator')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_admin();

-- -------------------------------------------------------------------------
-- media_assets — video ads served to Zunex Plus inbuilt players
-- -------------------------------------------------------------------------
create table if not exists public.media_assets (
  id            text primary key,                     -- ma_...
  name          text not null,
  description   text,
  video_url     text not null,                        -- absolute or media-server relative path
  poster_url    text,
  duration_sec  integer default 15,
  size_bytes    bigint,
  mime          text default 'video/mp4',
  active        boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- -------------------------------------------------------------------------
-- playlists — ordered ad rotations assigned to Zunex Plus devices
-- -------------------------------------------------------------------------
create table if not exists public.playlists (
  id            text primary key,                     -- pl_...
  name          text not null,
  description   text,
  active        boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.playlist_items (
  playlist_id   text not null references public.playlists(id) on delete cascade,
  media_id      text not null references public.media_assets(id) on delete cascade,
  position      integer not null default 0,
  primary key (playlist_id, media_id)
);

create index if not exists idx_pl_items on public.playlist_items(playlist_id, position);

-- One active playlist per Zunex Plus device
create table if not exists public.device_playlists (
  device_id     text primary key references public.hardware(id) on delete cascade,
  playlist_id   text not null references public.playlists(id) on delete cascade,
  assigned_at   timestamptz default now()
);

-- Proof-of-play events reported by devices
create table if not exists public.playback_logs (
  id            bigserial primary key,
  device_id     text not null,
  playlist_id   text,
  media_id      text,
  event         text not null default 'start',        -- 'start'|'complete'|'error'
  played_at     timestamptz default now()
);

create index if not exists idx_playback_device on public.playback_logs(device_id, played_at desc);
create index if not exists idx_playback_ts     on public.playback_logs(played_at desc);

-- -------------------------------------------------------------------------
-- tickets — support tickets
-- -------------------------------------------------------------------------
create table if not exists public.tickets (
  id              text primary key,                   -- tk_...
  subject         text not null,
  description     text,
  priority        text default 'medium'
                  check (priority in ('low','medium','high','critical')),
  status          text default 'open'
                  check (status in ('open','in_progress','resolved','closed')),
  requester_name  text,
  requester_email text,
  station_id      text,
  assignee        text,
  created_at      bigint,
  updated_at      bigint,
  closed_at       bigint
);

create index if not exists idx_tickets_status on public.tickets(status);

-- -------------------------------------------------------------------------
-- api_keys — programmatic access keys (hash stored, full key shown once)
-- -------------------------------------------------------------------------
create table if not exists public.api_keys (
  id            text primary key,                     -- key_...
  name          text not null,
  key_prefix    text not null,                        -- znx_live_ab12cd34
  key_hash      text not null,                        -- sha256 hex of full key
  permissions   jsonb default '["read"]',
  last_used_at  bigint,
  revoked       boolean default false,
  created_at    bigint
);

-- -------------------------------------------------------------------------
-- notifications — admin notification feed
-- -------------------------------------------------------------------------
create table if not exists public.notifications (
  id            text primary key,                     -- nt_...
  category      text not null default 'System'
                check (category in ('Hardware','Payment','Station','System')),
  title         text not null,
  description   text,
  source        text,
  read          boolean default false,
  created_at    bigint
);

create index if not exists idx_notifications_ts on public.notifications(created_at desc);

-- -------------------------------------------------------------------------
-- audit_log — admin action trail
-- -------------------------------------------------------------------------
create table if not exists public.audit_log (
  id            bigserial primary key,
  actor         text,
  action        text not null,                        -- 'login'|'config-change'|...
  description   text,
  target        text,
  created_at    timestamptz default now()
);

create index if not exists idx_audit_ts on public.audit_log(created_at desc);

-- =========================================================================
-- ROW-LEVEL SECURITY — locked-down model
--
-- Server access uses the service-role key, which bypasses RLS entirely.
-- The browser publishable key may ONLY:
--   • read public.stations              (public station directory)
--   • read its own row in public.admins (login role check)
-- Every other table has RLS enabled with NO permissive policy, so anon and
-- authenticated clients get zero access. This section drops the permissive
-- policies shipped by earlier schema versions before re-applying the locks.
-- =========================================================================

-- Enable RLS everywhere (idempotent)
alter table public.stations           enable row level security;
alter table public.hardware           enable row level security;
alter table public.sessions           enable row level security;
alter table public.station_heartbeats enable row level security;
alter table public.admin_config       enable row level security;
alter table public.admins             enable row level security;
alter table public.media_assets       enable row level security;
alter table public.playlists          enable row level security;
alter table public.playlist_items     enable row level security;
alter table public.device_playlists   enable row level security;
alter table public.playback_logs      enable row level security;
alter table public.tickets            enable row level security;
alter table public.api_keys           enable row level security;
alter table public.notifications      enable row level security;
alter table public.audit_log          enable row level security;

-- Drop every legacy policy from earlier schema versions (permissive SELECT
-- policies on hardware/sessions/config/media/tickets/notifications, plus the
-- old "write blocked" catch-alls). Names must match exactly.
drop policy if exists "stations select"           on public.stations;
drop policy if exists "stations write blocked"    on public.stations;
drop policy if exists "hardware select"           on public.hardware;
drop policy if exists "hardware write blocked"    on public.hardware;
drop policy if exists "sessions select"           on public.sessions;
drop policy if exists "sessions write blocked"    on public.sessions;
drop policy if exists "heartbeats select"         on public.station_heartbeats;
drop policy if exists "heartbeats write blocked"  on public.station_heartbeats;
drop policy if exists "config select"             on public.admin_config;
drop policy if exists "config write blocked"      on public.admin_config;
drop policy if exists "media select"              on public.media_assets;
drop policy if exists "media write blocked"       on public.media_assets;
drop policy if exists "playlists select"          on public.playlists;
drop policy if exists "playlists write blocked"   on public.playlists;
drop policy if exists "playlist items select"     on public.playlist_items;
drop policy if exists "playlist items write blocked" on public.playlist_items;
drop policy if exists "device playlists select"   on public.device_playlists;
drop policy if exists "device playlists write blocked" on public.device_playlists;
drop policy if exists "playback select"           on public.playback_logs;
drop policy if exists "playback write blocked"    on public.playback_logs;
drop policy if exists "tickets select"            on public.tickets;
drop policy if exists "tickets write blocked"     on public.tickets;
drop policy if exists "notifications select"      on public.notifications;
drop policy if exists "notifications write blocked" on public.notifications;
drop policy if exists "api_keys no access"        on public.api_keys;
drop policy if exists "audit no access"           on public.audit_log;
drop policy if exists "admins select own"         on public.admins;

-- The only public read in the system: the station directory.
drop policy if exists "stations public read" on public.stations;
create policy "stations public read" on public.stations
  for select to anon, authenticated
  using (true);

-- Admins may read ONLY their own row (client-side role check at login).
create policy "admins select own" on public.admins
  for select to authenticated
  using (auth.uid() = id);

-- =========================================================================
-- Seed: 15 demo stations
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

-- =========================================================================
-- Seed: 15 demo hardware devices (one per station)
-- =========================================================================
insert into public.hardware (id, station_id, device_id, device_type, broker_url, mqtt_topic, mqtt_port, username, password, firmware_version, heartbeat_interval_ms, last_seen_at, connection_status, telemetry_enabled, updated_at) values
  ('hw_ZNX-A1','ZNX-A1','ZXN-DVC-ZNX-A1-001','zunex_plus','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-A1',1883,'zunex_device','dev_znx-a1','v2.4.1',30000,1789549850792,'offline',true,1789549865793),
  ('hw_ZNX-A2','ZNX-A2','ZXN-DVC-ZNX-A2-001','zunex_plus','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-A2',1883,'zunex_device','dev_znx-a2','v2.4.1',30000,1789549865793,'online',true,1789549865793),
  ('hw_ZNX-B2','ZNX-B2','ZXN-DVC-ZNX-B2-001','zunex_one','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-B2',1883,'zunex_device','dev_znx-b2','v2.3.0',30000,1789549820789,'online',true,1789549865793),
  ('hw_ZNX-B3','ZNX-B3','ZXN-DVC-ZNX-B3-001','zunex_plus','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-B3',1883,'zunex_device','dev_znx-b3','v2.4.1',30000,1789549865793,'online',true,1789549865793),
  ('hw_ZNX-L1','ZNX-L1','ZXN-DVC-ZNX-L1-001','zunex_plus','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-L1',1883,'zunex_device','dev_znx-l1','v2.4.1',30000,1789549865793,'online',true,1789549865793),
  ('hw_ZNX-D2','ZNX-D2','ZXN-DVC-ZNX-D2-001','zunex_one','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-D2',1883,'zunex_device','dev_znx-d2','v2.3.0',30000,1789549850792,'offline',true,1789549865793),
  ('hw_ZNX-K3','ZNX-K3','ZXN-DVC-ZNX-K3-001','zunex_one','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-K3',1883,'zunex_device','dev_znx-k3','v2.3.0',30000,1789549865793,'online',true,1789549865793),
  ('hw_ZNX-K4','ZNX-K4','ZXN-DVC-ZNX-K4-001','zunex_plus','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-K4',1883,'zunex_device','dev_znx-k4','v2.4.0',30000,1789549850792,'online',false,1789549865793),
  ('hw_ZNX-M1','ZNX-M1','ZXN-DVC-ZNX-M1-001','zunex_plus','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-M1',1883,'zunex_device','dev_znx-m1','v2.4.1',30000,1789549805788,'offline',true,1789549865793),
  ('hw_ZNX-H2','ZNX-H2','ZXN-DVC-ZNX-H2-001','zunex_one','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-H2',1883,'zunex_device','dev_znx-h2','v2.3.0',30000,1789549865793,'online',true,1789549865793),
  ('hw_ZNX-C1','ZNX-C1','ZXN-DVC-ZNX-C1-001','zunex_one','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-C1',1883,'zunex_device','dev_znx-c1','v2.3.0',30000,1789549865793,'online',true,1789549865793),
  ('hw_ZNX-C2','ZNX-C2','ZXN-DVC-ZNX-C2-001','zunex_plus','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-C2',1883,'zunex_device','dev_znx-c2','v2.4.1',30000,1789549865793,'online',true,1789549865793),
  ('hw_ZNX-P1','ZNX-P1','ZXN-DVC-ZNX-P1-001','zunex_plus','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-P1',1883,'zunex_device','dev_znx-p1','v2.4.1',30000,1789549850792,'offline',true,1789549865793),
  ('hw_ZNX-P2','ZNX-P2','ZXN-DVC-ZNX-P2-001','zunex_one','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-P2',1883,'zunex_device','dev_znx-p2','v2.3.0',30000,1789549865793,'online',true,1789549865793),
  ('hw_ZNX-J1','ZNX-J1','ZXN-DVC-ZNX-J1-001','zunex_one','mqtt://broker.zunexglobal.com','zunex/stations/ZNX-J1',1883,'zunex_device','dev_znx-j1','v2.3.0',30000,1789549865793,'online',true,1789549865793)
on conflict (id) do nothing;

-- =========================================================================
-- Post-seed sync (idempotent — safe to re-run)
-- =========================================================================

-- Sync device_type from the owning station's device_model (core→one, plus→plus)
update public.hardware h
set device_type = case when s.device_model = 'plus' then 'zunex_plus' else 'zunex_one' end
from public.stations s
where h.station_id = s.id;

-- Media server connection settings (Zunex Plus inbuilt player base URL)
insert into public.admin_config (key, value) values
  ('media_server', '{"baseUrl":"https://media.zunexglobal.com/ads","apiKey":""}'::jsonb)
on conflict (key) do nothing;
