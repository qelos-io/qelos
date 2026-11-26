// Import this first in a test file: the plugin reads NODE_ENV when its config module loads
// (development mode turns on Fastify logging and a standalone authorization shortcut).
process.env.NODE_ENV = 'production';
process.env.APP_URL = 'http://plugin.test';
