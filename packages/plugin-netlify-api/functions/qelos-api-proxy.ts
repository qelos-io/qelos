import http from "http";
import https from "https";
import type { Handler } from "@netlify/functions";
import {
  buildHtmlRedirectResponse,
  buildTargetPath,
  isExternalOAuthLocation,
  publicHostForUpstream,
} from "./proxy-request";

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
    const publicHost = publicHostForUpstream(event, PROXY_HOST);
    const headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(event.headers ?? {})) {
      if (val == null || val === "") continue;
      if (Array.isArray(val)) {
        headers[key] = val.join(", ");
      } else if (typeof val === "string") {
        headers[key] = val;
      }
    }
    headers["host"] = publicHost;
    headers["x-forwarded-host"] = publicHost;
    if (ADD_BYPASS_ADMIN_HEADER) {
      headers["x-bypass-admin"] = "true";
    }
    delete headers["transfer-encoding"];

    const targetPath = buildTargetPath(event);

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
        const status = proxyRes.statusCode ?? 200;
        const location = proxyRes.headers.location;
        if (
          status >= 300 &&
          status < 400 &&
          typeof location === "string" &&
          isExternalOAuthLocation(location)
        ) {
          resolve(buildHtmlRedirectResponse(location));
          return;
        }

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
            statusCode: status,
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
