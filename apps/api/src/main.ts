import { buildApp } from './app.js';

const { app, config, logger, shutdown } = await buildApp();

await app.listen({ port: config.port, host: config.host });
logger.info('api.listening', { port: config.port, host: config.host });

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    logger.info('api.shutdown', { sig });
    void shutdown().then(
      () => process.exit(0),
      (err: unknown) => {
        logger.error('api.shutdown_failed', { error: err instanceof Error ? err.message : String(err) });
        process.exit(1);
      },
    );
  });
}
