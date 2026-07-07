import { buildConfig } from './config/env.js';
import { buildApp } from './app.js';

async function start(): Promise<void> {
  const config = buildConfig();
  const app = await buildApp(config);

  try {
    await app.listen({
      host: '0.0.0.0',
      port: config.port,
    });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

void start();
