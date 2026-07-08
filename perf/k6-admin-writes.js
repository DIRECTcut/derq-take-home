import http from 'k6/http';
import { check, sleep } from 'k6';

const postgrestUrl = (__ENV.POSTGREST_URL || '').replace(/\/$/, '');
const adminToken = __ENV.ADMIN_TOKEN || '';
const countryId = Number(__ENV.COUNTRY_ID || '0');
const vehicleTypeId = Number(__ENV.VEHICLE_TYPE_ID || '0');
const phaseName = __ENV.PHASE_NAME || 'unspecified';
const targetRps = Number(__ENV.TARGET_RPS || '5');
const duration = __ENV.DURATION || '30s';
const maxP95Ms = Number(__ENV.MAX_P95_MS || '1000');
const maxFailureRate = Number(__ENV.MAX_FAILURE_RATE || '0.01');
const baseTimePeriod = Number(__ENV.BASE_TIME_PERIOD || '300000');

if (!postgrestUrl) {
  throw new Error('POSTGREST_URL is required');
}

if (!adminToken) {
  throw new Error('ADMIN_TOKEN is required');
}

if (!Number.isInteger(countryId) || countryId <= 0) {
  throw new Error('COUNTRY_ID must be a positive integer');
}

if (!Number.isInteger(vehicleTypeId) || vehicleTypeId <= 0) {
  throw new Error('VEHICLE_TYPE_ID must be a positive integer');
}

export const options = {
  discardResponseBodies: true,
  scenarios: {
    admin_writes: {
      executor: 'constant-arrival-rate',
      rate: targetRps,
      timeUnit: '1s',
      duration,
      preAllocatedVUs: Math.max(5, Math.ceil(targetRps / 5)),
      maxVUs: Math.max(50, targetRps * 2),
    },
  },
  thresholds: {
    http_req_failed: [`rate<=${maxFailureRate}`],
    http_req_duration: [`p(95)<=${maxP95Ms}`],
    checks: ['rate>0.99'],
  },
  tags: {
    phase: phaseName,
  },
};

export default function () {
  const timePeriod = baseTimePeriod + (__VU * 100000) + __ITER;
  const response = http.post(
    `${postgrestUrl}/traffic_metrics`,
    JSON.stringify([
      {
        country_id: countryId,
        vehicle_type_id: vehicleTypeId,
        time_period: timePeriod,
        observation_value: 100 + (__ITER % 50),
        observation_flag: null,
        confidentiality_status: 'public',
      },
    ]),
    {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      tags: {
        endpoint: 'traffic-metrics-write',
        phase: phaseName,
      },
    },
  );

  check(response, {
    'status is 201': (item) => item.status === 201,
  });

  sleep(0.1);
}
