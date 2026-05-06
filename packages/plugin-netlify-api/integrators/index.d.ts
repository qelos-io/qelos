import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

export interface QelosWorkspace {
  _id: string;
  name: string;
  roles: string[];
  labels?: string[];
  [key: string]: unknown;
}

export interface QelosUser {
  _id: string;
  username?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  profileImage?: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
  workspace?: QelosWorkspace | null;
  [key: string]: unknown;
}

export interface QelosIdentity {
  user: QelosUser | null;
  workspace: QelosWorkspace | null;
}

export interface QelosHandlerEvent extends HandlerEvent {
  qelos: QelosIdentity;
}

export type QelosHandler = (
  event: QelosHandlerEvent,
  context: HandlerContext,
) => ReturnType<Handler>;

export interface IntegratorOptions {
  /** Override `QELOS_API_IP` / `API_HOST`. */
  apiHost?: string;
  /** Override the tenant resolved via `tenanthost`/`tenant` headers. */
  tenant?: string;
  /** Public host forwarded to the gateway as `tenanthost`. Defaults to the request host. */
  tenantHost?: string;
  /** Auth-service request timeout in ms. Defaults to 2000. */
  timeoutMs?: number;
}

export function identifyUser(
  event: HandlerEvent,
  options?: IntegratorOptions,
): Promise<{ user: QelosUser; workspace: QelosWorkspace | null } | null>;

export function withQelos(
  handler: QelosHandler,
  options?: IntegratorOptions,
): Handler;

export function requireUser(
  handler: QelosHandler,
  options?: IntegratorOptions,
): Handler;

export function resolveApiHost(override?: string): string;
