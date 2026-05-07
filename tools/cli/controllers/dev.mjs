import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { createJiti } from 'jiti';
import { logger, green, blue, yellow, red } from '../services/utils/logger.mjs';
import { getConfig } from '../services/config/load-config.mjs';
import { readCredentials } from '../services/config/credentials.mjs';

const jiti = createJiti(import.meta.url);

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function pickHttpModule(url) {
  return url.protocol === 'https:' ? https : http;
}

function defaultPortFor(url) {
  return url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80);
}

function stripHopByHopHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
    out[key] = value;
  }
  return out;
}

function resolveQelosUrl(argv) {
  const config = getConfig();
  const stored = readCredentials();
  const raw = argv.url
    || process.env.QELOS_URL
    || config?.qelosUrl
    || config?.appUrl
    || stored?.appUrl;
  if (!raw) {
    logger.error('Qelos URL not configured. Pass --url, set QELOS_URL, add `qelosUrl` to qelos.config.json, or run `qelos auth login`.');
    process.exit(1);
  }
  return raw.replace(/\/$/, '');
}

async function setupAuth(qelosUrl) {
  const config = getConfig();
  const stored = readCredentials();
  const apiToken = process.env.QELOS_API_TOKEN || config?.qelosApiToken || stored?.apiToken;

  if (apiToken) {
    return {
      mode: 'api-token',
      describe: 'API token',
      getHeaders: () => ({ 'x-api-key': apiToken }),
    };
  }

  const username = process.env.QELOS_USERNAME;
  const password = process.env.QELOS_PASSWORD;
  if (!username || !password) {
    logger.error('No Qelos credentials available. Run `qelos auth login`, or set QELOS_API_TOKEN, or set QELOS_USERNAME and QELOS_PASSWORD.');
    process.exit(1);
  }

  const QelosSDK = (await jiti('@qelos/sdk')).default;
  const sdk = new QelosSDK({ appUrl: qelosUrl, extraQueryParams: () => ({}) });

  try {
    await sdk.authentication.oAuthSignin({ username, password });
  } catch (error) {
    if (error.response?.status === 401 || /401|unauthor|invalid/i.test(error.message || '')) {
      logger.authError(username, qelosUrl);
    } else {
      logger.error('Failed to authenticate with QELOS_USERNAME/QELOS_PASSWORD', error);
    }
    process.exit(1);
  }

  // Proactively refresh the access token well before typical TTLs expire so
  // long-running dev sessions keep authenticating without retry-on-401 logic
  // (we cannot safely replay request bodies through the proxy).
  const refreshIntervalMs = 10 * 60 * 1000;
  const refreshTimer = setInterval(() => {
    sdk.authentication.refreshToken().catch((err) => {
      logger.warning(`OAuth token refresh failed: ${err.message}`);
    });
  }, refreshIntervalMs);
  refreshTimer.unref();

  return {
    mode: 'oauth',
    describe: `OAuth as ${username}`,
    getHeaders: () => {
      const token = sdk.authentication.accessToken;
      return token ? { authorization: 'Bearer ' + token } : {};
    },
  };
}

function forwardApiRequest(clientReq, clientRes, qelosUrl, getAuthHeaders) {
  const target = new URL(qelosUrl);
  const httpModule = pickHttpModule(target);

  const forwardedHeaders = stripHopByHopHeaders(clientReq.headers);
  forwardedHeaders.host = target.host;
  Object.assign(forwardedHeaders, getAuthHeaders());

  const upstreamReq = httpModule.request({
    hostname: target.hostname,
    port: defaultPortFor(target),
    protocol: target.protocol,
    path: clientReq.url,
    method: clientReq.method,
    headers: forwardedHeaders,
  }, (upstreamRes) => {
    const responseHeaders = stripHopByHopHeaders(upstreamRes.headers);
    clientRes.writeHead(upstreamRes.statusCode || 502, responseHeaders);
    upstreamRes.pipe(clientRes);
  });

  upstreamReq.on('error', (err) => {
    logger.error(`Upstream Qelos error: ${err.message}`);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'content-type': 'text/plain' });
      clientRes.end(`Bad Gateway: cannot reach Qelos at ${qelosUrl} (${err.message})`);
    } else {
      clientRes.end();
    }
  });

  clientReq.on('aborted', () => upstreamReq.destroy());
  clientReq.pipe(upstreamReq);
}

function forwardLocalRequest(clientReq, clientRes, target) {
  const targetUrl = new URL(target);
  const httpModule = pickHttpModule(targetUrl);

  const forwardedHeaders = stripHopByHopHeaders(clientReq.headers);
  forwardedHeaders.host = targetUrl.host;

  const upstreamReq = httpModule.request({
    hostname: targetUrl.hostname,
    port: defaultPortFor(targetUrl),
    protocol: targetUrl.protocol,
    path: clientReq.url,
    method: clientReq.method,
    headers: forwardedHeaders,
  }, (upstreamRes) => {
    const responseHeaders = stripHopByHopHeaders(upstreamRes.headers);
    clientRes.writeHead(upstreamRes.statusCode || 502, responseHeaders);
    upstreamRes.pipe(clientRes);
  });

  upstreamReq.on('error', (err) => {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'content-type': 'text/plain' });
      clientRes.end(`Cannot reach local dev server at ${target}: ${err.message}`);
    } else {
      clientRes.end();
    }
  });

  clientReq.on('aborted', () => upstreamReq.destroy());
  clientReq.pipe(upstreamReq);
}

function forwardWebSocketUpgrade(clientReq, clientSocket, head, target) {
  const targetUrl = new URL(target);
  const httpModule = pickHttpModule(targetUrl);

  const forwardedHeaders = { ...clientReq.headers, host: targetUrl.host };

  const upstreamReq = httpModule.request({
    hostname: targetUrl.hostname,
    port: defaultPortFor(targetUrl),
    protocol: targetUrl.protocol,
    path: clientReq.url,
    method: clientReq.method,
    headers: forwardedHeaders,
  });

  upstreamReq.on('upgrade', (upstreamRes, upstreamSocket, upstreamHead) => {
    const headLines = [
      `HTTP/1.1 ${upstreamRes.statusCode} ${upstreamRes.statusMessage}`,
    ];
    for (const [key, value] of Object.entries(upstreamRes.headers)) {
      const v = Array.isArray(value) ? value.join(', ') : value;
      headLines.push(`${key}: ${v}`);
    }
    clientSocket.write(headLines.join('\r\n') + '\r\n\r\n');
    if (upstreamHead && upstreamHead.length) clientSocket.write(upstreamHead);
    upstreamSocket.pipe(clientSocket).pipe(upstreamSocket);
  });

  upstreamReq.on('error', () => {
    clientSocket.destroy();
  });

  if (head && head.length) upstreamReq.write(head);
  upstreamReq.end();
}

export default async function devController(argv) {
  const port = Number(argv.port);
  const host = argv.host;
  const target = String(argv.target).replace(/\/$/, '');
  const qelosUrl = resolveQelosUrl(argv);

  logger.section('Starting Qelos dev proxy');
  console.log(`  ${blue('Qelos:')}  ${qelosUrl}`);
  console.log(`  ${blue('Target:')} ${target}`);

  const auth = await setupAuth(qelosUrl);
  logger.debug(`Auth mode: ${auth.describe}`);

  const server = http.createServer((req, res) => {
    try {
      if (req.url && (req.url === '/api' || req.url.startsWith('/api/') || req.url.startsWith('/api?'))) {
        forwardApiRequest(req, res, qelosUrl, auth.getHeaders);
      } else {
        forwardLocalRequest(req, res, target);
      }
    } catch (err) {
      logger.error('Proxy handler crashed', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end('Internal proxy error');
      } else {
        res.end();
      }
    }
  });

  // WebSocket upgrades (HMR, live-reload) always go to the local dev server.
  server.on('upgrade', (req, socket, head) => {
    forwardWebSocketUpgrade(req, socket, head, target);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${port} is already in use. Try --port with a different value.`);
    } else {
      logger.error('Proxy server error', err);
    }
    process.exit(1);
  });

  await new Promise((resolve) => server.listen(port, host, resolve));

  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  console.log('');
  console.log(`${green('✓')} Proxy running at ${blue(`http://${displayHost}:${port}`)}`);
  console.log(`  ${yellow('/api/*')} → ${qelosUrl}/api/*  (${auth.describe})`);
  console.log(`  ${yellow('/*')}     → ${target}`);
  console.log('');
  console.log(`Press ${red('Ctrl+C')} to stop.`);

  const shutdown = (signal) => {
    console.log(`\nReceived ${signal}, shutting down proxy...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Keep the process alive — the http.Server prevents the event loop from
  // draining, so this is just defensive.
  await new Promise(() => {});
}
