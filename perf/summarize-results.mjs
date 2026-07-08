import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      continue;
    }

    const [key, inlineValue] = token.slice(2).split('=');
    args[key] = inlineValue ?? argv[index + 1];

    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function round(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(2));
}

function metricValues(metric) {
  if (!metric || typeof metric !== 'object') {
    return {};
  }

  return metric.values ?? metric;
}

function metricNumber(summary, metricName, key, fallback = Number.NaN) {
  const metric = metricValues(summary.metrics?.[metricName]);
  return Number(metric[key] ?? fallback);
}

function parsePhase(phase) {
  if (!fs.existsSync(phase.summaryPath)) {
    return {
      name: phase.name,
      targetRps: phase.targetRps,
      duration: phase.duration,
      thresholds: {
        maxP95Ms: phase.maxP95Ms,
        maxFailureRate: phase.maxFailureRate,
      },
      metrics: {
        avgMs: null,
        p95Ms: null,
        failureRate: null,
        achievedRps: null,
        checksRate: null,
        droppedIterations: null,
        successfulResponses: null,
        conflictResponses: null,
        gatewayTimeoutResponses: null,
        serverErrorResponses: null,
        unexpectedStatusResponses: null,
      },
      health: {
        metricsCaptured: false,
        appReadyCaptured: false,
        apiCountryCaptured: false,
        apiVehicleCaptured: false,
        metadata: null,
      },
      passed: false,
      summaryMissing: true,
    };
  }

  const summary = readJson(phase.summaryPath);
  const metadata = fs.existsSync(path.join(phase.metricsDir, 'metadata.json'))
    ? readJson(path.join(phase.metricsDir, 'metadata.json'))
    : null;

  const p95 = metricNumber(summary, 'http_req_duration', 'p(95)');
  const avg = metricNumber(summary, 'http_req_duration', 'avg');
  const failureRate = metricNumber(summary, 'http_req_failed', 'rate', metricNumber(summary, 'http_req_failed', 'value', 0));
  const achievedRps = metricNumber(summary, 'http_reqs', 'rate');
  const checksRate = metricNumber(summary, 'checks', 'rate', metricNumber(summary, 'checks', 'value'));
  const droppedIterations = metricNumber(summary, 'dropped_iterations', 'count', 0);
  const successfulResponses = metricNumber(summary, 'successful_responses', 'count', 0);
  const conflictResponses = metricNumber(summary, 'conflict_responses', 'count', 0);
  const gatewayTimeoutResponses = metricNumber(summary, 'gateway_timeout_responses', 'count', 0);
  const serverErrorResponses = metricNumber(summary, 'server_error_responses', 'count', 0);
  const unexpectedStatusResponses = metricNumber(summary, 'unexpected_status_responses', 'count', 0);

  return {
    name: phase.name,
    targetRps: phase.targetRps,
    duration: phase.duration,
    thresholds: {
      maxP95Ms: phase.maxP95Ms,
      maxFailureRate: phase.maxFailureRate,
    },
    metrics: {
      avgMs: round(avg),
      p95Ms: round(p95),
      failureRate: round(failureRate),
      achievedRps: round(achievedRps),
      checksRate: round(checksRate),
      droppedIterations: round(droppedIterations),
      successfulResponses: round(successfulResponses),
      conflictResponses: round(conflictResponses),
      gatewayTimeoutResponses: round(gatewayTimeoutResponses),
      serverErrorResponses: round(serverErrorResponses),
      unexpectedStatusResponses: round(unexpectedStatusResponses),
    },
    health: {
      metricsCaptured: fs.existsSync(path.join(phase.metricsDir, 'metadata.json')),
      appReadyCaptured: fs.existsSync(path.join(phase.metricsDir, 'health-ready.json')),
      apiCountryCaptured: fs.existsSync(path.join(phase.metricsDir, 'api-country-head.txt')),
      apiVehicleCaptured: fs.existsSync(path.join(phase.metricsDir, 'api-vehicle-head.txt')),
      metadata,
    },
    passed:
      Number.isFinite(p95) &&
      Number.isFinite(achievedRps) &&
      p95 <= phase.maxP95Ms &&
      failureRate <= phase.maxFailureRate,
  };
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.manifest || !args.output) {
    throw new Error('--manifest and --output are required');
  }

  const manifest = readJson(args.manifest);
  const phases = manifest.phases.map(parsePhase);

  const result = {
    size: manifest.size,
    dropletId: manifest.dropletId,
    dropletIp: manifest.dropletIp,
    appUrl: manifest.appUrl,
    apiUrl: manifest.apiUrl,
    generatedAt: new Date().toISOString(),
    phases,
    overallPassed: phases.every((phase) => phase.passed),
  };

  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, `${JSON.stringify(result, null, 2)}\n`);
}

main();
