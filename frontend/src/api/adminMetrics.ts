import type { AdminReferenceOption, TrafficMetricInput } from '../types/admin';
import { resolveApiBaseUrl } from './traffic';

type CountryRow = {
  code: string;
  id: number;
  name: string;
};

type VehicleTypeRow = {
  id: number;
  name: string;
  unit: string;
};

export class AdminMetricsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminMetricsError';
  }
}

async function fetchRows<T>(baseUrl: string, path: string, token: string): Promise<T[]> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new AdminMetricsError(`Admin data request failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    throw new AdminMetricsError('Admin data response must be an array');
  }

  return payload as T[];
}

function toCountryOption(row: CountryRow): AdminReferenceOption {
  if (typeof row.id !== 'number' || typeof row.code !== 'string' || typeof row.name !== 'string') {
    throw new AdminMetricsError('Received malformed country options');
  }

  return {
    id: row.id,
    label: `${row.name} (${row.code})`,
  };
}

function toVehicleTypeOption(row: VehicleTypeRow): AdminReferenceOption {
  if (typeof row.id !== 'number' || typeof row.name !== 'string' || typeof row.unit !== 'string') {
    throw new AdminMetricsError('Received malformed vehicle type options');
  }

  return {
    id: row.id,
    label: `${row.name} (${row.unit})`,
  };
}

export function createAdminMetricsApi(baseUrl = resolveApiBaseUrl()) {
  return {
    async fetchFormOptions(token: string): Promise<{
      countries: AdminReferenceOption[];
      vehicleTypes: AdminReferenceOption[];
    }> {
      const [countries, vehicleTypes] = await Promise.all([
        fetchRows<CountryRow>(baseUrl, '/api/admin/countries', token),
        fetchRows<VehicleTypeRow>(baseUrl, '/api/admin/vehicle-types', token),
      ]);

      return {
        countries: countries.map(toCountryOption),
        vehicleTypes: vehicleTypes.map(toVehicleTypeOption),
      };
    },

    async createTrafficMetric(token: string, payload: TrafficMetricInput): Promise<void> {
      const response = await fetch(`${baseUrl}/api/admin/traffic-metrics`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countryId: payload.countryId,
          vehicleTypeId: payload.vehicleTypeId,
          timePeriod: payload.timePeriod,
          observationValue: payload.observationValue,
          observationFlag: payload.observationFlag || null,
          confidentialityStatus: payload.confidentialityStatus || null,
        }),
      });

      if (response.status === 201) {
        return;
      }

      if (response.status === 409) {
        throw new AdminMetricsError('A metric already exists for that country, vehicle type, and year.');
      }

      throw new AdminMetricsError(`Metric write failed with status ${response.status}`);
    },
  };
}
