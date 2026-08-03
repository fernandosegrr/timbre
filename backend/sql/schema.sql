-- Esquema del backend de timbre.
-- Correr una sola vez en el SQL editor de Supabase (Project > SQL Editor).

create table if not exists doorbell_events (
  id bigint generated always as identity primary key,
  device_id text not null,
  occurred_at timestamptz not null default now()
);

create table if not exists notification_numbers (
  id bigint generated always as identity primary key,
  phone_number text not null unique, -- formato E.164 sin '+', ej. 5214631028412
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  id bigint generated always as identity primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- RLS habilitado sin políticas: solo la secret key (que el backend usa del
-- lado del servidor y bypasea RLS) puede leer/escribir estas tablas. La
-- publishable key no se usa en esta app, pero por si acaso queda sin acceso.
alter table doorbell_events enable row level security;
alter table notification_numbers enable row level security;
alter table push_subscriptions enable row level security;

-- ---------------------------------------------------------------
-- Migración: foto del timbrazo (relay Termux + DVR local vía RTSP).
-- Seguro correr esta sección de nuevo, "add column if not exists" no
-- falla si ya se aplicó antes.
-- ---------------------------------------------------------------
alter table doorbell_events
  add column if not exists photo_status text not null default 'pendiente',
  add column if not exists photo_path text;

alter table doorbell_events drop constraint if exists doorbell_events_photo_status_check;
alter table doorbell_events
  add constraint doorbell_events_photo_status_check
  check (photo_status in ('pendiente', 'recibida', 'sin_foto'));

-- Esto NO es SQL: además de correr lo de arriba, crea un bucket de
-- Supabase Storage llamado "timbre-fotos", marcado como PRIVADO (sin
-- "Public bucket"). El backend genera URLs firmadas y temporales para
-- mostrar las fotos en el panel - así nunca quedan expuestas de forma
-- pública y permanente (son fotos de quien esté parado en la puerta).
-- Dashboard de Supabase > Storage > New bucket > "timbre-fotos" > Private.
