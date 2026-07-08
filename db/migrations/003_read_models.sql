create or replace view api.country_traffic_latest as
with ranked_metrics as (
  select
    c.code as country_code,
    c.name as country_name,
    vt.slug as vehicle_type_slug,
    vt.name as vehicle_type_name,
    tm.time_period,
    tm.observation_value,
    row_number() over (
      partition by c.id, vt.id
      order by tm.time_period desc
    ) as row_number
  from api.traffic_metrics tm
  join api.countries c on c.id = tm.country_id
  join api.vehicle_types vt on vt.id = tm.vehicle_type_id
)
select
  country_code,
  country_name,
  vehicle_type_slug,
  vehicle_type_name,
  time_period,
  observation_value
from ranked_metrics
where row_number = 1;

create or replace view api.vehicle_type_distribution_latest as
with latest_metric_per_country as (
  select
    tm.country_id,
    vt.id as vehicle_type_id,
    vt.slug as vehicle_type_slug,
    vt.name as vehicle_type_name,
    vt.unit,
    tm.observation_value,
    row_number() over (
      partition by tm.country_id, vt.id
      order by tm.time_period desc
    ) as row_number
  from api.traffic_metrics tm
  join api.vehicle_types vt on vt.id = tm.vehicle_type_id
)
select
  vehicle_type_slug,
  vehicle_type_name,
  unit,
  count(*)::integer as countries_reported,
  round(avg(observation_value), 2) as average_observation_value,
  round(sum(observation_value), 2) as total_observation_value
from latest_metric_per_country
where row_number = 1
group by vehicle_type_slug, vehicle_type_name, unit;
