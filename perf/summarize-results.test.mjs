import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function makeSummary(overrides = {}) {
  return {
    metrics: {
      http_req_duration: {
        values: {
          avg: 120,
          'p(95)': 320,
        },
      },
      http_req_failed: {
        values: {
          rate: 0,
        },
      },
      http_reqs: {
        values: {
          rate: 49.8,
        },
      },
      checks: {
        values: {
          rate: 1,
        },
      },
    },
    ...overrides,
  };
}

test('summarize-results emits one result per leg with phase pass state', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traffic-summary-'));
  const summaryPath = path.join(tempDir, 'summary.json');
  const metricsDir = path.join(tempDir, 'metrics');
  const manifestPath = path.join(tempDir, 'manifest.json');
  const outputPath = path.join(tempDir, 'result.json');

  fs.mkdirSync(metricsDir, { recursive: true });
  fs.writeFileSync(summaryPath, JSON.stringify(makeSummary()));
  fs.writeFileSync(path.join(metricsDir, 'metadata.json'), JSON.stringify({ ok: true }));
  fs.writeFileSync(path.join(metricsDir, 'health-ready.json'), '{"status":"ok"}');
  fs.writeFileSync(path.join(metricsDir, 'postgrest-country-head.txt'), '[]');
  fs.writeFileSync(path.join(metricsDir, 'postgrest-vehicle-head.txt'), '[]');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      size: 's-1vcpu-2gb',
      dropletId: '123',
      dropletIp: '203.0.113.10',
      appUrl: 'http://203.0.113.10:3000',
      postgrestUrl: 'http://203.0.113.10:3001',
      phases: [
        {
          name: 'rps-50',
          targetRps: 50,
          duration: '30s',
          summaryPath,
          metricsDir,
          maxP95Ms: 1000,
          maxFailureRate: 0.01,
        },
      ],
    }),
  );

  const result = spawnSync('node', ['perf/summarize-results.mjs', '--manifest', manifestPath, '--output', outputPath], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);

  const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(output.size, 's-1vcpu-2gb');
  assert.equal(output.overallPassed, true);
  assert.equal(output.phases[0].metrics.p95Ms, 320);
});

test('summarize-results marks a phase failed when latency breaches the threshold', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traffic-summary-fail-'));
  const summaryPath = path.join(tempDir, 'summary.json');
  const metricsDir = path.join(tempDir, 'metrics');
  const manifestPath = path.join(tempDir, 'manifest.json');
  const outputPath = path.join(tempDir, 'result.json');

  fs.mkdirSync(metricsDir, { recursive: true });
  fs.writeFileSync(summaryPath, JSON.stringify(makeSummary({
    metrics: {
      http_req_duration: { values: { avg: 200, 'p(95)': 2400 } },
      http_req_failed: { values: { rate: 0 } },
      http_reqs: { values: { rate: 470 } },
      checks: { values: { rate: 1 } },
    },
  })));
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      size: 's-2vcpu-4gb',
      dropletId: '456',
      dropletIp: '203.0.113.20',
      appUrl: 'http://203.0.113.20:3000',
      postgrestUrl: 'http://203.0.113.20:3001',
      phases: [
        {
          name: 'rps-500',
          targetRps: 500,
          duration: '45s',
          summaryPath,
          metricsDir,
          maxP95Ms: 2000,
          maxFailureRate: 0.01,
        },
      ],
    }),
  );

  const result = spawnSync('node', ['perf/summarize-results.mjs', '--manifest', manifestPath, '--output', outputPath], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);

  const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(output.overallPassed, false);
  assert.equal(output.phases[0].passed, false);
});

test('summarize-results supports flat k6 metric objects without nested values', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traffic-summary-flat-'));
  const summaryPath = path.join(tempDir, 'summary.json');
  const metricsDir = path.join(tempDir, 'metrics');
  const manifestPath = path.join(tempDir, 'manifest.json');
  const outputPath = path.join(tempDir, 'result.json');

  fs.mkdirSync(metricsDir, { recursive: true });
  fs.writeFileSync(
    summaryPath,
    JSON.stringify({
      metrics: {
        http_req_duration: { avg: 12, 'p(95)': 18 },
        http_req_failed: { value: 0.02 },
        http_reqs: { rate: 48.6 },
        checks: { value: 0.98 },
      },
    }),
  );
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      size: 'local',
      dropletId: 'local',
      dropletIp: '127.0.0.1',
      appUrl: 'http://127.0.0.1:3000',
      postgrestUrl: 'http://127.0.0.1:3001',
      phases: [
        {
          name: 'flat-k6',
          targetRps: 50,
          duration: '30s',
          summaryPath,
          metricsDir,
          maxP95Ms: 100,
          maxFailureRate: 0.01,
        },
      ],
    }),
  );

  const result = spawnSync('node', ['perf/summarize-results.mjs', '--manifest', manifestPath, '--output', outputPath], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);

  const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(output.phases[0].metrics.p95Ms, 18);
  assert.equal(output.phases[0].metrics.failureRate, 0.02);
  assert.equal(output.phases[0].metrics.achievedRps, 48.6);
  assert.equal(output.phases[0].metrics.checksRate, 0.98);
});
