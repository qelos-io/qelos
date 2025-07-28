import { IntegrationSourceKind } from "@qelos/global-types";

/**
 * Middleware to force specific integration kinds
 */
export function forceTriggerIntegrationKind(kinds: IntegrationSourceKind[], operations?: string[]) {
  return (req, res, next) => {
    req.integrationTriggerKinds = kinds;
    req.integrationTriggerOperations = operations;
    next();
  }
}
