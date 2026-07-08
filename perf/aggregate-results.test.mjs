import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function writeSizeArtifact(rootDir, size, { overallPassed = true, deleted = true } = {}) {
  const sizeDir = path.join(rootDir, size);
  fs.mkdirSync(sizeDir, { recursive: true });
  fs.writeFileSync(
    path.join(sizeDir, 'result.json'),
    JSON.stringify({
      size,
      overallPassed,
      phases: [
        {
          name: 'rps-50',
          targetRps: 50,
          passed: overallPassed,
          metrics: {
            p95Ms: 300,
            failureRate: 0,
            achievedRps: 49.5,
            droppedIterations: 0,
            conflictResponses: 0,
            gatewayTimeoutResponses: 0,
            serverErrorResponses: 0,
          },
        },
      ],
    }),
  );
  fs.writeFileSync(
    path.join(sizeDir, 'teardown.json'),
    JSON.stringify({
      size,
      deleted,
    }),
  );
}

test('aggregate-results succeeds when all expected artifacts exist and teardown passed', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traffic-aggregate-'));
  const inputDir = path.join(tempDir, 'input');
  const outputDir = path.join(tempDir, 'output');

  writeSizeArtifact(inputDir, 's-1vcpu-1gb');
  writeSizeArtifact(inputDir, 's-1vcpu-2gb');

  const result = spawnSync(
    'node',
    [
      'perf/aggregate-results.mjs',
      '--inputDir',
      inputDir,
      '--outputDir',
      outputDir,
      '--expectedSizes',
      's-1vcpu-1gb,s-1vcpu-2gb',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const aggregate = JSON.parse(fs.readFileSync(path.join(outputDir, 'aggregate.json'), 'utf8'));
  assert.equal(aggregate.passed, true);
  assert.match(fs.readFileSync(path.join(outputDir, 'summary.md'), 'utf8'), /Performance Summary/);
});

test('aggregate-results fails when a teardown artifact is missing or unsuccessful', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traffic-aggregate-fail-'));
  const inputDir = path.join(tempDir, 'input');
  const outputDir = path.join(tempDir, 'output');

  writeSizeArtifact(inputDir, 's-1vcpu-1gb', { deleted: false });

  const result = spawnSync(
    'node',
    [
      'perf/aggregate-results.mjs',
      '--inputDir',
      inputDir,
      '--outputDir',
      outputDir,
      '--expectedSizes',
      's-1vcpu-1gb,s-2vcpu-4gb',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
    },
  );

  assert.equal(result.status, 1);
  const aggregate = JSON.parse(fs.readFileSync(path.join(outputDir, 'aggregate.json'), 'utf8'));
  assert.equal(aggregate.passed, false);
  assert.ok(aggregate.missing.some((entry) => entry.includes('missing result.json')));
  assert.ok(aggregate.missing.some((entry) => entry.includes('deleted=false')));
});
