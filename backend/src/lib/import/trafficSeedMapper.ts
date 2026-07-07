import type { TrafficCsvRow } from './roadEqsCarhabParser.js';

export type CountrySeed = {
  code: string;
  name: string;
};

export type VehicleTypeSeed = {
  slug: string;
  name: string;
  unit: string;
};

export type TrafficMetricSeed = {
  countryCode: string;
  vehicleTypeSlug: string;
  timePeriod: number;
  observationValue: number;
  observationFlag: string | null;
  confidentialityStatus: string | null;
};

export type TrafficSeedPayload = {
  countries: CountrySeed[];
  vehicleTypes: VehicleTypeSeed[];
  metrics: TrafficMetricSeed[];
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function mapTrafficSeedPayload(rows: TrafficCsvRow[]): TrafficSeedPayload {
  const countries = new Map<string, CountrySeed>();
  const vehicleTypes = new Map<string, VehicleTypeSeed>();
  const metrics: TrafficMetricSeed[] = [];

  for (const row of rows) {
    countries.set(row.geoCode, {
      code: row.geoCode,
      name: row.geoName,
    });

    const vehicleTypeSlug = slugify(row.structureName);
    vehicleTypes.set(vehicleTypeSlug, {
      slug: vehicleTypeSlug,
      name: row.structureName,
      unit: row.unit,
    });

    metrics.push({
      countryCode: row.geoCode,
      vehicleTypeSlug,
      timePeriod: row.timePeriod,
      observationValue: row.observationValue,
      observationFlag: row.observationFlag,
      confidentialityStatus: row.confidentialityStatus,
    });
  }

  return {
    countries: [...countries.values()].sort((left, right) => left.code.localeCompare(right.code)),
    vehicleTypes: [...vehicleTypes.values()].sort((left, right) => left.slug.localeCompare(right.slug)),
    metrics,
  };
}
