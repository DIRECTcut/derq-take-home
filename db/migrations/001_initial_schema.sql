create schema if not exists api;

create table if not exists api.countries (
  id integer generated always as identity primary key,
  code text not null unique,
  name text not null
);

create table if not exists api.vehicle_types (
  id integer generated always as identity primary key,
  slug text not null unique,
  name text not null,
  unit text not null
);

create table if not exists api.traffic_metrics (
  id integer generated always as identity primary key,
  country_id integer not null references api.countries (id) on delete cascade,
  vehicle_type_id integer not null references api.vehicle_types (id) on delete cascade,
  time_period integer not null check (time_period >= 1900),
  observation_value numeric(12, 2) not null,
  observation_flag text,
  confidentiality_status text,
  unique (country_id, vehicle_type_id, time_period)
);

revoke all on schema api from public;
revoke all on all tables in schema api from public;
revoke all on all sequences in schema api from public;
