import { IntegrationSourceKind } from './integration-sources';

export type IntegrationSourceStatusKind = 'connected' | 'failed' | 'unsupported';

/** Payload for draft status checks while creating or editing a connection. */
export interface IIntegrationSourceStatusRequest {
  kind: IntegrationSourceKind;
  metadata: Record<string, unknown>;
  authentication?: Record<string, unknown>;
}

/** Result of a read-only integration source connection check. */
export interface IIntegrationSourceStatusResult {
  status: IntegrationSourceStatusKind;
  message: string;
  kind: IntegrationSourceKind;
  checkedAt: string;
  /** Safe provider snippets (no secrets). */
  details?: Record<string, unknown>;
}

export const PAYMENT_INTEGRATION_SOURCE_KINDS: IntegrationSourceKind[] = [
  IntegrationSourceKind.Sumit,
  IntegrationSourceKind.PayPal,
  IntegrationSourceKind.Paddle,
  IntegrationSourceKind.DodoPayments,
];
