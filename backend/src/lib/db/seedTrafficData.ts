import path from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { parseRoadEqsCarhab } from '../import/roadEqsCarhabParser.js';
import { mapTrafficSeedPayload } from '../import/trafficSeedMapper.js';
import { repoRoot } from '../paths.js';

async function seedCountries(client: PoolClient, countries: { code: string; name: string }[]): Promise<void> {
  for (const country of countries) {
    await client.query(
      `
        insert into api.countries (code, name)
        values ($1, $2)
        on conflict (code)
        do update set name = excluded.name
      `,
      [country.code, country.name],
    );
  }
}

async function seedVehicleTypes(
  client: PoolClient,
  vehicleTypes: { slug: string; name: string; unit: string }[],
): Promise<void> {
  for (const vehicleType of vehicleTypes) {
    await client.query(
      `
        insert into api.vehicle_types (slug, name, unit)
        values ($1, $2, $3)
        on conflict (slug)
        do update set
          name = excluded.name,
          unit = excluded.unit
      `,
      [vehicleType.slug, vehicleType.name, vehicleType.unit],
    );
  }
}

async function seedMetrics(
  client: PoolClient,
  metrics: {
    countryCode: string;
    vehicleTypeSlug: string;
    timePeriod: number;
    observationValue: number;
    observationFlag: string | null;
    confidentialityStatus: string | null;
  }[],
): Promise<void> {
  for (const metric of metrics) {
    await client.query(
      `
        insert into api.traffic_metrics (
          country_id,
          vehicle_type_id,
          time_period,
          observation_value,
          observation_flag,
          confidentiality_status
        )
        values (
          (select id from api.countries where code = $1),
          (select id from api.vehicle_types where slug = $2),
          $3,
          $4,
          $5,
          $6
        )
        on conflict (country_id, vehicle_type_id, time_period)
        do update set
          observation_value = excluded.observation_value,
          observation_flag = excluded.observation_flag,
          confidentiality_status = excluded.confidentiality_status
      `,
      [
        metric.countryCode,
        metric.vehicleTypeSlug,
        metric.timePeriod,
        metric.observationValue,
        metric.observationFlag,
        metric.confidentialityStatus,
      ],
    );
  }
}

export function defaultTrafficCsvPath(): string {
  return path.join(repoRoot(), 'db', 'seed-data', 'road_eqs_carhab.csv');
}

export async function seedTrafficData(pool: Pool, csvPath: string = defaultTrafficCsvPath()): Promise<void> {
  const rows = await parseRoadEqsCarhab(csvPath);
  const payload = mapTrafficSeedPayload(rows);

  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('truncate table api.traffic_metrics, api.vehicle_types, api.countries restart identity cascade');
    await seedCountries(client, payload.countries);
    await seedVehicleTypes(client, payload.vehicleTypes);
    await seedMetrics(client, payload.metrics);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
