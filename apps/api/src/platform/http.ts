import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { Logger } from '@era/shared';

export function createHttpServer(logger: Logger): FastifyInstance {
  // find-my-way's default maxParamLength (100) truncates the single route
  // param tRPC's fastify adapter captures the whole comma-joined batch path
  // into — five-plus procedures batched together in one request (routine once
  // a page fires that many independent queries at once) exceeds 100 chars and
  // 404s. Raised well past any realistic batch size.
  //
  // bodyLimit is raised from Fastify's 1MB default because image uploads
  // travel as a base64 data URL inside a tRPC JSON body (see platform/
  // uploads.ts) — base64 inflates the ~5MB the client-side cropper targets
  // by ~33%, so 1MB would reject every real photo.
  const app = Fastify({ logger: false, maxParamLength: 2000, bodyLimit: 10 * 1024 * 1024 });

  app.get('/health', async () => ({ status: 'ok' }));

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      reply.status(400).send({ error: 'validation_error', issues: err.issues });
      return;
    }
    logger.error('http.error', { method: req.method, url: req.url, error: err.message });
    reply.status(err.statusCode ?? 500).send({ error: err.message });
  });

  return app;
}
