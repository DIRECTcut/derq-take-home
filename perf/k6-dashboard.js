import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const baseUrl = (__ENV.TARGET_BASE_URL || '').replace(/\/$/, '');
const countryPath =
  __ENV.COUNTRY_PATH ||
  '/api/dashboard/country-traffic';
const vehiclePath =
  __ENV.VEHICLE_PATH ||
  '/api/dashboard/vehicle-distribution';
const phaseName = __ENV.PHASE_NAME || 'unspecified';
const targetRps = Number(__ENV.TARGET_RPS || '5');
const duration = __ENV.DURATION || '30s';
const maxP95Ms = Number(__ENV.MAX_P95_MS || '1000');
const maxFailureRate = Number(__ENV.MAX_FAILURE_RATE || '0.01');
const thinkTimeSeconds = Number(__ENV.THINK_TIME_SECONDS || '0.1');

const successfulResponses = new Counter('successful_responses');
const gatewayTimeoutResponses = new Counter('gateway_timeout_responses');
const serverErrorResponses = new Counter('server_error_responses');
const unexpectedStatusResponses = new Counter('unexpected_status_responses');

if (!baseUrl) {
  throw new Error('TARGET_BASE_URL is required');
}

export const options = {
  discardResponseBodies: true,
  scenarios: {
    dashboard_reads: {
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
  const path = __ITER % 2 === 0 ? countryPath : vehiclePath;
  const response = http.get(`${baseUrl}${path}`, {
    tags: {
      endpoint: path.includes('country-traffic') ? 'country' : 'vehicle',
      phase: phaseName,
    },
  });

  check(response, {
    'status is 200': (item) => item.status === 200,
  });

  if (response.status === 200) {
    successfulResponses.add(1);
  } else if (response.status === 504) {
    gatewayTimeoutResponses.add(1);
  } else if (response.status >= 500) {
    serverErrorResponses.add(1);
  } else {
    unexpectedStatusResponses.add(1);
  }

  if (thinkTimeSeconds > 0) {
    sleep(thinkTimeSeconds);
  }
}
