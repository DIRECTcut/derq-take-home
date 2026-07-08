import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config/env.js';
import { verifyAdminSessionToken } from '../lib/auth/adminSession.js';

type ApiRouteOptions = {
  config: AppConfig;
};

type CountryTrafficRow = {
  country_code: string;
  country_name: string;
  observation_value: number;
  time_period: number;
  vehicle_type_name: string;
};

type VehicleDistributionRow = {
  average_observation_value: number;
  countries_reported: number;
  total_observation_value: number;
  unit: string;
  vehicle_type_name: string;
  vehicle_type_slug: string;
};

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

type TrafficMetricBody = {
  confidentialityStatus?: string | null;
  countryId?: number;
  observationFlag?: string | null;
  observationValue?: number;
  timePeriod?: number;
  vehicleTypeId?: number;
};

function extractBearerToken(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

async function requireAdminSession(
  request: FastifyRequest,
  reply: FastifyReply,
  config: AppConfig,
): Promise<boolean> {
  const token = extractBearerToken(request);

  if (!token) {
    await reply.code(401).send({
      error: 'admin authorization is required',
    });

    return false;
  }

  try {
    verifyAdminSessionToken(token, config);
    return true;
  } catch {
    await reply.code(401).send({
      error: 'invalid admin session',
    });

    return false;
  }
}

export async function registerApiRoutes(
  app: FastifyInstance,
  options: ApiRouteOptions,
): Promise<void> {
  app.get('/api/dashboard/country-traffic', async (_request, reply) => {
    const result = await app.db.query<CountryTrafficRow>(`
      select
        country_code,
        country_name,
        time_period,
        observation_value::double precision as observation_value,
        vehicle_type_name
      from api.country_traffic_latest
      order by observation_value desc, country_code asc
    `);

    return reply.code(200).send(result.rows);
  });

  app.get('/api/dashboard/vehicle-distribution', async (_request, reply) => {
    const result = await app.db.query<VehicleDistributionRow>(`
      select
        vehicle_type_slug,
        vehicle_type_name,
        unit,
        countries_reported,
        average_observation_value::double precision as average_observation_value,
        total_observation_value::double precision as total_observation_value
      from api.vehicle_type_distribution_latest
      order by vehicle_type_slug asc
    `);

    return reply.code(200).send(result.rows);
  });

  app.get('/api/admin/countries', async (request, reply) => {
    if (!(await requireAdminSession(request, reply, options.config))) {
      return reply;
    }

    const result = await app.db.query<CountryRow>(`
      select id, code, name
      from api.countries
      order by name asc
    `);

    return reply.code(200).send(result.rows);
  });

  app.get('/api/admin/vehicle-types', async (request, reply) => {
    if (!(await requireAdminSession(request, reply, options.config))) {
      return reply;
    }

    const result = await app.db.query<VehicleTypeRow>(`
      select id, name, unit
      from api.vehicle_types
      order by name asc
    `);

    return reply.code(200).send(result.rows);
  });

  app.post<{ Body: TrafficMetricBody }>('/api/admin/traffic-metrics', async (request, reply) => {
    if (!(await requireAdminSession(request, reply, options.config))) {
      return reply;
    }

    const body = request.body ?? {};

    if (
      !Number.isInteger(body.countryId) ||
      !Number.isInteger(body.vehicleTypeId) ||
      !Number.isInteger(body.timePeriod) ||
      typeof body.observationValue !== 'number'
    ) {
      return reply.code(400).send({
        error: 'countryId, vehicleTypeId, timePeriod, and observationValue are required',
      });
    }

    try {
      await app.db.query(
        `
          insert into api.traffic_metrics (
            country_id,
            vehicle_type_id,
            time_period,
            observation_value,
            observation_flag,
            confidentiality_status
          )
          values ($1, $2, $3, $4, $5, $6)
        `,
        [
          body.countryId,
          body.vehicleTypeId,
          body.timePeriod,
          body.observationValue,
          body.observationFlag ?? null,
          body.confidentialityStatus ?? null,
        ],
      );
    } catch (error) {
      const maybePgError = error as { code?: string };

      if (maybePgError.code === '23505') {
        return reply.code(409).send({
          error: 'duplicate traffic metric',
        });
      }

      throw error;
    }

    return reply.code(201).send({
      status: 'created',
    });
  });
}
