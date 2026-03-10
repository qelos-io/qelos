import http from "http";
import type { Handler } from "@netlify/functions";

const raw = process.env.QELOS_API_IP ?? "159.203.152.168";
const parsed =
  raw.startsWith("http://") || raw.startsWith("https://")
    ? new URL(raw)
    : { hostname: raw, port: "80" };
const PROXY_HOST = parsed.hostname;
const PROXY_PORT = parseInt(parsed.port || "80", 10);

export const handler: Handler = (event) =>
  new Promise((resolve) => {
    // Build forwarded headers, preserving the original Host header
    const headers: Record<string, string> = {};
    for (const [key, val] of Object.entries(event.headers)) {
      if (val) headers[key] = val;
    }
    headers["host"] = event.headers["host"] ?? PROXY_HOST;
    // Lambda buffers the body, so chunked encoding is not applicable
    delete headers["transfer-encoding"];

    const targetPath =
      new URL(event.rawUrl).pathname +
      (event.rawQuery ? `?${event.rawQuery}` : "");

    const body = event.body
      ? Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8")
      : undefined;

    const proxyReq = http.request(
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
