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

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildMarkdown(results, missing) {
  const lines = ['## Performance Summary', ''];

  if (missing.length > 0) {
    lines.push('### Missing or invalid artifacts', '');
    for (const entry of missing) {
      lines.push(`- ${entry}`);
    }
    lines.push('');
  }

  lines.push('| VPS size | Phase | Target RPS | p95 ms | Failure rate | Achieved RPS | Dropped iterations | 409s | 504s | 5xx | Phase passed | Teardown |');
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|');

  for (const item of results) {
    for (const phase of item.result.phases) {
      lines.push(
        `| ${item.size} | ${phase.name} | ${phase.targetRps} | ${phase.metrics.p95Ms ?? 'n/a'} | ${phase.metrics.failureRate ?? 'n/a'} | ${phase.metrics.achievedRps ?? 'n/a'} | ${phase.metrics.droppedIterations ?? 'n/a'} | ${phase.metrics.conflictResponses ?? 'n/a'} | ${phase.metrics.gatewayTimeoutResponses ?? 'n/a'} | ${phase.metrics.serverErrorResponses ?? 'n/a'} | ${phase.passed ? 'yes' : 'no'} | ${item.teardown.deleted ? 'ok' : 'failed'} |`,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.inputDir || !args.outputDir || !args.expectedSizes) {
    throw new Error('--inputDir, --outputDir, and --expectedSizes are required');
  }

  const expectedSizes = args.expectedSizes.split(',').map((item) => item.trim()).filter(Boolean);
  const outputDir = args.outputDir;

  const results = [];
  const missing = [];

  for (const size of expectedSizes) {
    const sizeDir = path.join(args.inputDir, size);
    const resultPath = path.join(sizeDir, 'result.json');
    const teardownPath = path.join(sizeDir, 'teardown.json');

    if (!fs.existsSync(resultPath)) {
      missing.push(`${size}: missing result.json`);
      continue;
    }

    if (!fs.existsSync(teardownPath)) {
      missing.push(`${size}: missing teardown.json`);
      continue;
    }

    const result = loadJson(resultPath);
    const teardown = loadJson(teardownPath);

    if (!teardown.deleted) {
      missing.push(`${size}: teardown evidence present but deleted=false`);
    }

    results.push({ size, result, teardown });
  }

  const aggregate = {
    generatedAt: new Date().toISOString(),
    expectedSizes,
    missing,
    results,
    passed: missing.length === 0 && results.every((item) => item.result.overallPassed && item.teardown.deleted),
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'aggregate.json'), `${JSON.stringify(aggregate, null, 2)}\n`);

  const markdown = buildMarkdown(results, missing);
  fs.writeFileSync(path.join(outputDir, 'summary.md'), markdown);
  fs.writeFileSync(path.join(outputDir, 'comment.md'), markdown);

  if (!aggregate.passed) {
    process.exitCode = 1;
  }
}

main();
