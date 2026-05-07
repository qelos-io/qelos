import * as http from 'node:http';
import { AddressInfo } from 'node:net';

export interface ListenHandle {
  url: string;
  server: http.Server;
  close: () => Promise<void>;
}

export async function listen(server: http.Server): Promise<ListenHandle> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const addr = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${addr.port}`,
    server,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

export interface FetchAllResponse {
  status: number;
  body: any;
  setCookies: string[];
  headers: Headers;
}

export async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<FetchAllResponse> {
  const res = await fetch(url, init);
  let body: any = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  const setCookies = (res.headers as any).getSetCookie?.() ?? [];
  return { status: res.status, body, setCookies, headers: res.headers };
}

export function findCookie(
  setCookies: string[],
  name: string,
): string | undefined {
  for (const c of setCookies) {
    const m = c.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    if (m) return decodeURIComponent(m[1]);
  }
  return undefined;
}
