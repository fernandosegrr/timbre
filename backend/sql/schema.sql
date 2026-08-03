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
