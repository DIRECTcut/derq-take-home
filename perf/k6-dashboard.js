import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const baseUrl = (__ENV.TARGET_BASE_URL || '').replace(/\/$/, '');
const countryPath =
  __ENV.COUNTRY_PATH ||
  '/country_traffic_latest?select=country_code,country_name,time_period,observation_value,vehicle_type_name&order=observation_value.desc';
const vehiclePath =
  __ENV.VEHICLE_PATH ||
  '/vehicle_type_distribution_latest?select=vehicle_type_slug,vehicle_type_name,unit,countries_reported,average_observation_value,total_observation_value';
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
      endpoint: path.includes('country_traffic_latest') ? 'country' : 'vehicle',
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
