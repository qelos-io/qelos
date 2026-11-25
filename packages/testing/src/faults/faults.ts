import { jsonResponse } from '../router/router.js';
import type { MockState } from '../state/mock-state.js';

export type FaultMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | '*';

export interface FaultRule {
  /** `'GET /api/blueprints/*'`, `'/api/me'` (any method) or `'* /api/**'`. `:param` and a trailing `*` are supported. */
  match: string;
  /** Answer with this status instead of the real response. */
  status?: number;
  /** JSON body of the failure response. Default `{ message, code: 'QELOS_MOCK_FAULT' }`. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Wait this long (ms) before answering. Without `status`/`networkError` the real response follows the delay. */
  delay?: number;
  /** Reject like a dropped connection (`fetch` throws a TypeError). */
  networkError?: boolean;
  /** Apply to the first N matching requests only. Default: every matching request. */
  times?: number;
  /** Let the first N matching requests through before the fault starts. */
  after?: number;
  /** Apply to this fraction (0..1) of matching requests. Uses `random` for determinism. Default 1. */
  probability?: number;
}

export interface FaultHandle {
  /** Requests that matched the rule (including ones let through by `after`/`probability`). */
  readonly matched: number;
  /** Requests the fault was applied to. */
  readonly applied: number;
  remove(): void;
}

interface ActiveRule {
  rule: FaultRule;
  method: string;
  test: (path: string) => boolean;
  matched: number;
  applied: number;
  /** custom applicability check (rate limits); replaces after/times/probability */
  gate?: () => boolean;
}

function compile(pattern: string): (path: string) => boolean {
  const parts = pattern.split('/').filter(Boolean);
  const deep = parts[parts.length - 1] === '**';
  const wild = parts[parts.length - 1] === '*';
  const fixed = deep || wild ? parts.slice(0, -1) : parts;
  return (path) => {
    const segs = path.split('/').filter(Boolean);
    if (deep) {
      if (segs.length < fixed.length) return false;
    } else if (wild) {
      if (segs.length !== fixed.length + 1) return false;
    } else if (segs.length !== fixed.length) return false;
    return fixed.every((p, i) => p.startsWith(':') || p === segs[i]);
  };
}

function parseMatch(match: string): { method: string; test: (path: string) => boolean } {
  const m = /^(\*|GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S.*)$/i.exec(match.trim());
  if (m) return { method: m[1].toUpperCase(), test: compile(m[2].trim()) };
  return { method: '*', test: compile(match.trim()) };
}

export interface FaultInjector {
  /** Add a fault rule. Rules are checked in the order they were added; the first applicable one wins. */
  add(rule: FaultRule): FaultHandle;
  /** `add({ match, status })`, defaulting to 500. */
  fail(match: string, status?: number, options?: Omit<FaultRule, 'match' | 'status'>): FaultHandle;
  /** `add({ match, delay })`. */
  slow(match: string, delay: number, options?: Omit<FaultRule, 'match' | 'delay'>): FaultHandle;
  /** `add({ match, networkError: true })`. */
  drop(match: string, options?: Omit<FaultRule, 'match' | 'networkError'>): FaultHandle;
  /** Answer 429 with `retry-after` once more than `limit` requests matched in the current window. */
  rateLimit(match: string, options: { limit: number; windowMs?: number }): FaultHandle;
  /** Expire every access session (optionally of one user id), so the next call is unauthorized until the client refreshes. */
  expireAccessTokens(userId?: string): number;
  /** Expire every session including refresh tokens, forcing a full sign-in. */
  expireAllSessions(userId?: string): number;
  /** Remove all rules. */
  clear(): void;
  /** @internal run by the mock before routing. Returns a response to short-circuit, or nothing. */
  intercept(request: Request): Promise<Response | void>;
}

export function createFaultInjector(state: MockState, random: () => number = Math.random): FaultInjector {
  let rules: ActiveRule[] = [];
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const register = (rule: FaultRule, gate?: () => boolean): FaultHandle => {
    const { method, test } = parseMatch(rule.match);
    const active: ActiveRule = { rule, method, test, matched: 0, applied: 0, gate };
    rules.push(active);
    return {
      get matched() {
        return active.matched;
      },
      get applied() {
        return active.applied;
      },
      remove() {
        rules = rules.filter((r) => r !== active);
      },
    };
  };

  const add = (rule: FaultRule) => register(rule);

  const expire = (kinds: string[], userId?: string) => {
    let n = 0;
    for (const s of state.sessions.list()) {
      if (!kinds.includes(s.kind) || (userId && s.userId !== userId)) continue;
      state.sessions.update(s._id, { expiresAt: Date.now() - 1 });
      n++;
    }
    return n;
  };

  return {
    add,
    fail: (match, status = 500, options = {}) => add({ ...options, match, status }),
    slow: (match, delay, options = {}) => add({ ...options, match, delay }),
    drop: (match, options = {}) => add({ ...options, match, networkError: true }),
    rateLimit(match, { limit, windowMs = 60_000 }) {
      let windowStart = Date.now();
      let count = 0;
      const rule: FaultRule = { match, status: 429, body: { message: 'Too many requests', code: 'QELOS_MOCK_RATE_LIMITED' } };
      return register(rule, () => {
        const now = Date.now();
        if (now - windowStart >= windowMs) {
          windowStart = now;
          count = 0;
        }
        if (++count <= limit) return false;
        rule.headers = { 'retry-after': String(Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000))) };
        return true;
      });
    },
    expireAccessTokens: (userId) => expire(['access', 'cookie'], userId),
    expireAllSessions: (userId) => expire(['access', 'cookie', 'refresh'], userId),
    clear() {
      rules = [];
    },
    async intercept(request) {
      if (!rules.length) return;
      const url = new URL(request.url);
      const method = request.method.toUpperCase();
      for (const active of [...rules]) {
        if ((active.method !== '*' && active.method !== method) || !active.test(url.pathname)) continue;
        const { rule } = active;
        active.matched++;
        if (active.gate) {
          if (!active.gate()) continue;
        } else {
          if (rule.after !== undefined && active.matched <= rule.after) continue;
          if (rule.times !== undefined && active.applied >= rule.times) continue;
          if (rule.probability !== undefined && random() >= rule.probability) continue;
        }
        active.applied++;
        if (rule.delay) await sleep(rule.delay);
        if (rule.networkError) throw new TypeError('fetch failed (mock fault: network error)');
        if (rule.status !== undefined) {
          return jsonResponse(
            rule.body ?? { message: `Mock fault: ${rule.status}`, code: 'QELOS_MOCK_FAULT' },
            rule.status,
            rule.headers,
          );
        }
        // delay only: fall through to the real handler
        return;
      }
    },
  };
}
