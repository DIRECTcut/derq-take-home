import type {
  CountryTrafficDatum,
  DashboardData,
  VehicleDistributionDatum,
} from '../types/traffic';

const DEFAULT_POSTGREST_BASE_URL = 'http://localhost:3001';

type EnvSource = {
  VITE_POSTGREST_BASE_URL?: string;
};

type CountryTrafficRow = {
  country_code: string;
  country_name: string;
  time_period: number;
  observation_value: number;
  vehicle_type_name: string;
};

type VehicleDistributionRow = {
  vehicle_type_slug: string;
  vehicle_type_name: string;
  unit: string;
  countries_reported: number;
  average_observation_value: number;
  total_observation_value: number;
};

export class TrafficApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TrafficApiError';
  }
}

export function resolvePostgrestBaseUrl(env: EnvSource = import.meta.env as EnvSource): string {
  const candidate =
    window.__TRAFFIC_DATA_CONFIG__?.postgrestBaseUrl ??
    env.VITE_POSTGREST_BASE_URL ??
    DEFAULT_POSTGREST_BASE_URL;

  try {
    return new URL(candidate).toString().replace(/\/$/, '');
  } catch {
    throw new TrafficApiError(`Invalid VITE_POSTGREST_BASE_URL value: ${candidate}`);
  }
}

function toCountryTrafficDatum(row: CountryTrafficRow): CountryTrafficDatum {
  if (
    typeof row.country_code !== 'string' ||
    typeof row.country_name !== 'string' ||
    typeof row.time_period !== 'number' ||
    typeof row.observation_value !== 'number' ||
    typeof row.vehicle_type_name !== 'string'
  ) {
    throw new TrafficApiError('Received malformed country traffic data');
  }

  return {
    countryCode: row.country_code,
    countryName: row.country_name,
    timePeriod: row.time_period,
    observationValue: row.observation_value,
    vehicleTypeName: row.vehicle_type_name,
  };
}

function toVehicleDistributionDatum(row: VehicleDistributionRow): VehicleDistributionDatum {
  if (
    typeof row.vehicle_type_slug !== 'string' ||
    typeof row.vehicle_type_name !== 'string' ||
    typeof row.unit !== 'string' ||
    typeof row.countries_reported !== 'number' ||
    typeof row.average_observation_value !== 'number' ||
    typeof row.total_observation_value !== 'number'
  ) {
    throw new TrafficApiError('Received malformed vehicle distribution data');
  }

  return {
    vehicleTypeSlug: row.vehicle_type_slug,
    vehicleTypeName: row.vehicle_type_name,
    unit: row.unit,
    countriesReported: row.countries_reported,
    averageObservationValue: row.average_observation_value,
    totalObservationValue: row.total_observation_value,
  };
}

async function fetchRows<T>(baseUrl: string, path: string): Promise<T[]> {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new TrafficApiError(`Traffic data request failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    throw new TrafficApiError('Traffic data response must be an array');
  }

  return payload as T[];
}

export function createTrafficApi(baseUrl = resolvePostgrestBaseUrl()) {
  return {
    async fetchDashboardData(): Promise<DashboardData> {
      const [countryRows, vehicleRows] = await Promise.all([
        fetchRows<CountryTrafficRow>(
          baseUrl,
          '/country_traffic_latest?select=country_code,country_name,time_period,observation_value,vehicle_type_name&order=observation_value.desc',
        ),
        fetchRows<VehicleDistributionRow>(
          baseUrl,
          '/vehicle_type_distribution_latest?select=vehicle_type_slug,vehicle_type_name,unit,countries_reported,average_observation_value,total_observation_value',
        ),
      ]);

      return {
        countryTraffic: countryRows.map(toCountryTrafficDatum),
        vehicleDistribution: vehicleRows.map(toVehicleDistributionDatum),
      };
    },
  };
}
