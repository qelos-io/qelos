import { callIntegrationTarget } from './integration-target-call';
import logger from './logger';
import Integration, { IIntegrationEntity } from '../models/integration';
import { IntegrationSourceKind, QelosTriggerOperation } from '@qelos/global-types';
import { executeDataManipulation } from './data-manipulation-service';
import { RequestWithUser } from '@qelos/api-kit/dist/types';

interface WebhookPayload {
  body: any;
  headers: any;
  method: string;
  user: RequestWithUser['user'];
  query: Record<string, string>;
}

export async function triggerWebhookService(
  tenant: string,
  integrationId: string,
  payload: WebhookPayload,
) {
  try {
    const integration = await Integration
      .findOne({
        _id: integrationId,
        tenant: tenant,
        kind: IntegrationSourceKind.Qelos,
        active: true,
        'trigger.operation': QelosTriggerOperation.apiWebhook,
      })
      .select('target trigger kind dataManipulation')
      .lean()
      .exec();

    if (!integration || !integration.target) {
      throw new Error('Integration not found');
    }

    const triggerDetails = integration.trigger.details || {};

    // Validate roles if specified
    if (triggerDetails.roles && triggerDetails.roles.length > 0) {
      const userRoles = payload?.user?.roles || [];
      const workspaceRoles = payload?.user?.workspace?.roles || [];
      const allowedRoles = triggerDetails.roles;

      // Check if user has any of the required roles
      const hasRequiredRole = allowedRoles.some((role: string) => {
        if (role === 'guest') {
          // Guest access is allowed if explicitly included
          return true;
        }
        return userRoles.includes(role) || workspaceRoles.includes(role);
      });

      if (!hasRequiredRole) {
        throw new Error('Access denied: insufficient permissions');
      }
    }

    // Validate workspace labels if specified
    if (triggerDetails.workspaceLabels && triggerDetails.workspaceLabels.length > 0) {
      const userLabels = payload?.user?.workspace?.labels || [];
      const requiredLabels = triggerDetails.workspaceLabels;

      // Check if user has all required labels
      const hasAllLabels = requiredLabels.every((label: string) => userLabels.includes(label));

      if (!hasAllLabels) {
        throw new Error('Access denied: missing required workspace labels');
      }
    }

    // Execute data manipulation if configured
    let finalPayload: WebhookPayload = {
      body: payload.body,
      headers: {},
      method: payload.method,
      user: payload.user,
      query: payload.query || {},
    };
    const manipulationSteps = integration.dataManipulation;
    if (manipulationSteps && manipulationSteps.length > 0) {
      finalPayload = await executeDataManipulation(tenant, finalPayload, manipulationSteps);
    }

    // Call the integration target
    const result = await callIntegrationTarget(tenant, finalPayload, integration.target as IIntegrationEntity);
    return result;
  } catch (error) {
    logger.error('Error triggering webhook from service', error);
    throw error;
  }
}
