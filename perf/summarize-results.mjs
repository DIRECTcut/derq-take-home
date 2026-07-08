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
      },
      health: {
        metricsCaptured: false,
        appReadyCaptured: false,
        postgrestCountryCaptured: false,
        postgrestVehicleCaptured: false,
        metadata: null,
      },
      passed: false,
      summaryMissing: true,
    };
  }

  const summary = readJson(phase.summaryPath);
  const durationMetric = metricValues(summary.metrics?.http_req_duration);
  const failedMetric = metricValues(summary.metrics?.http_req_failed);
  const requestMetric = metricValues(summary.metrics?.http_reqs);
  const checkMetric = metricValues(summary.metrics?.checks);
  const metadata = fs.existsSync(path.join(phase.metricsDir, 'metadata.json'))
    ? readJson(path.join(phase.metricsDir, 'metadata.json'))
    : null;

  const p95 = Number(durationMetric['p(95)'] ?? Number.NaN);
  const avg = Number(durationMetric.avg ?? Number.NaN);
  const failureRate = Number(failedMetric.rate ?? failedMetric.value ?? 0);
  const achievedRps = Number(requestMetric.rate ?? Number.NaN);
  const checksRate = Number(checkMetric.rate ?? checkMetric.value ?? Number.NaN);

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
    },
    health: {
      metricsCaptured: fs.existsSync(path.join(phase.metricsDir, 'metadata.json')),
      appReadyCaptured: fs.existsSync(path.join(phase.metricsDir, 'health-ready.json')),
      postgrestCountryCaptured: fs.existsSync(path.join(phase.metricsDir, 'postgrest-country-head.txt')),
      postgrestVehicleCaptured: fs.existsSync(path.join(phase.metricsDir, 'postgrest-vehicle-head.txt')),
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
    postgrestUrl: manifest.postgrestUrl,
    generatedAt: new Date().toISOString(),
    phases,
    overallPassed: phases.every((phase) => phase.passed),
  };

  fs.mkdirSync(path.dirname(args.output), { recursive: true });
  fs.writeFileSync(args.output, `${JSON.stringify(result, null, 2)}\n`);
}

main();
