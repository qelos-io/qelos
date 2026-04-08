import http from "http";
import https from "https";
import type { Handler } from "@netlify/functions";

/** Same-origin proxy target; mirrors manual setups that use API_HOST (e.g. ai-words api-proxy). */
const raw =
  process.env.QELOS_API_IP ?? process.env.API_HOST ?? "159.203.152.168";

let PROXY_HOST: string;
let PROXY_PORT: number;
let requestImpl: typeof http.request;

if (raw.startsWith("http://") || raw.startsWith("https://")) {
  const u = new URL(raw);
  PROXY_HOST = u.hostname;
  PROXY_PORT = u.port
    ? parseInt(u.port, 10)
    : u.protocol === "https:"
      ? 443
      : 80;
  requestImpl = u.protocol === "https:" ? https.request : http.request;
} else {
  PROXY_HOST = raw;
  PROXY_PORT = 80;
  requestImpl = http.request;
}
const ADD_BYPASS_ADMIN_HEADER =
  process.env.QELOS_BYPASS_ADMIN_HEADER === "true";

export const handler: Handler = (event) =>
  new Promise((resolve) => {
    // Build forwarded headers. Upstream Qelos expects Host = public app domain (e.g. app.auto.qelos.io),
    // not the raw API IP — use the visitor-facing host (case-insensitive headers; rawUrl fallback).
    const headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(event.headers ?? {})) {
      if (val == null || val === "") continue;
      if (Array.isArray(val)) {
        headers[key] = val.join(", ");
      } else if (typeof val === "string") {
        headers[key] = val;
      }
    }
    headers["host"] = publicHostForUpstream(event);
    if (ADD_BYPASS_ADMIN_HEADER) {
      headers["x-bypass-admin"] = "true";
    }
    // Lambda buffers the body, so chunked encoding is not applicable
    delete headers["transfer-encoding"];

    const targetPath =
      new URL(event.rawUrl).pathname +
      (event.rawQuery ? `?${event.rawQuery}` : "");

    const body = event.body
      ? Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8")
      : undefined;

    const proxyReq = requestImpl(
      {
        hostname: PROXY_HOST,
        port: PROXY_PORT,
        path: targetPath,
        method: event.httpMethod,
        headers,
      },
      (proxyRes) => {
        const chunks: Buffer[] = [];
        proxyRes.on("data", (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on("end", () => {
          const resHeaders: Record<string, string> = {};
          for (const [key, val] of Object.entries(proxyRes.headers)) {
            if (val != null && key !== "transfer-encoding") {
              resHeaders[key] = Array.isArray(val) ? val.join(", ") : val;
            }
          }
          resolve({
            statusCode: proxyRes.statusCode ?? 200,
            headers: resHeaders,
            body: Buffer.concat(chunks).toString("base64"),
            isBase64Encoded: true,
          });
        });
        proxyRes.on("error", () =>
          resolve({ statusCode: 502, body: "Bad Gateway" })
        );
      }
    );

    proxyReq.on("error", () =>
      resolve({ statusCode: 502, body: "Bad Gateway" })
    );
    if (body) proxyReq.write(body);
    proxyReq.end();
  });

function publicHostForUpstream(event: {
  headers: Record<string, string | string[] | undefined>;
  rawUrl: string;
}): string {
  const forwarded = pickHeader(event.headers, "x-forwarded-host");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const h = pickHeader(event.headers, "host");
  if (h) {
    return h;
  }
  try {
    return new URL(event.rawUrl).hostname;
  } catch {
    return PROXY_HOST;
  }
}

function pickHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const want = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== want) continue;
    if (v == null) continue;
    const s = Array.isArray(v) ? v[0] : v;
    if (typeof s === "string" && s.length > 0) {
      return s;
    }
  }
  return undefined;
}
