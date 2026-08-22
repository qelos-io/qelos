import Fastify4 from 'fastify';
import Fastify5 from 'fastify-v5';

/** Resolves to Fastify 4 or 5 based on `FASTIFY_MAJOR` (set by the test runner). */
export default process.env.FASTIFY_MAJOR === '5' ? Fastify5 : Fastify4;
