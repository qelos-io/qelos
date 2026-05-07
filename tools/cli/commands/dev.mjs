import devController from '../controllers/dev.mjs';

export default function devCommand(program) {
  program.command(
    'dev',
    'Start a local reverse proxy: /api/* → your Qelos instance (with auth headers injected), /* → your local dev server.',
    (yargs) => yargs
      .option('port', {
        alias: 'p',
        type: 'number',
        description: 'Port for the local proxy server',
        default: 4000,
      })
      .option('target', {
        alias: 't',
        type: 'string',
        description: 'URL of your local dev server (everything not under /api/* is forwarded here)',
        default: 'http://localhost:3000',
      })
      .option('url', {
        type: 'string',
        description: 'Qelos URL (defaults to QELOS_URL, qelos.config.json, or stored credentials)',
      })
      .option('host', {
        type: 'string',
        description: 'Hostname/interface to bind the proxy to',
        default: '127.0.0.1',
      })
      .example(
        'qelos dev',
        'Run the proxy on :4000, forwarding non-/api requests to http://localhost:3000',
      )
      .example(
        'qelos dev --port 4000 --target http://localhost:3000',
        'Explicit ports for proxy and target',
      )
      .example(
        'qelos dev --url https://my-app.qelos.io',
        'Override the Qelos instance URL',
      ),
    devController,
  );
}
