import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../lib/app-error.js';

/** Maps every thrown error to the `{error:{code,message}}` envelope (ARCHITECTURE.md §8). */
export const errorHandlerPlugin = fp(
  async (app) => {
    app.setErrorHandler((err, req, reply) => {
      if (err instanceof AppError) {
        return reply
          .code(err.statusCode)
          .send({ error: { code: err.code, message: err.message } });
      }
      if (err instanceof ZodError) {
        const message = err.issues
          .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
          .join('; ');
        return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message } });
      }
      const known = err as { statusCode?: number; message?: string };
      if (typeof known.statusCode === 'number' && known.statusCode >= 400 && known.statusCode < 500) {
        // Fastify built-ins such as malformed JSON bodies.
        return reply
          .code(known.statusCode)
          .send({ error: { code: 'BAD_REQUEST', message: known.message ?? 'Bad request.' } });
      }
      req.log.error(err);
      return reply.code(500).send({ error: { code: 'INTERNAL', message: 'Internal server error.' } });
    });
  },
  { name: 'error-handler' },
);
