import { callIntegrationTarget } from './integration-target-call';
import logger from './logger';
import Integration, { IIntegrationEntity } from '../models/integration';
import { IntegrationSourceKind, QelosTriggerOperation } from '@qelos/global-types';
import { executeDataManipulation } from './data-manipulation-service';
import { RequestWithUser } from '@qelos/api-kit/dist/types';
import { Types } from 'mongoose';

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
    // Validate ObjectId format
    if (!Types.ObjectId.isValid(integrationId)) {
      throw new Error('Integration not found. Integration ID is not valid.');
    }
    
    const query = {
      _id: new Types.ObjectId(integrationId),
      tenant,
      'kind.0': IntegrationSourceKind.Qelos,
      active: true,
      'trigger.operation': QelosTriggerOperation.apiWebhook,
    };
    
    const integration = await Integration
      .findOne(query)
      .select('target trigger kind dataManipulation')
      .lean()
      .exec();

    if (!integration || !integration.target) {
      // Log details only when integration is not found for debugging
      logger.error('Integration not found - checking details', {
        integrationId,
        tenant,
      });
      
      // Check if integration exists with different conditions (run in background, don't wait)
      Integration.findById(integrationId)
        .select('tenant kind active trigger')
        .lean()
        .exec()
        .then(integrationById => {
          if (integrationById) {
            logger.error('Integration exists but query failed', {
              actualTenant: integrationById.tenant,
              tenantMatch: integrationById.tenant === tenant,
              kind: integrationById.kind,
              active: integrationById.active,
              triggerOp: integrationById.trigger?.operation,
            });
          } else {
            logger.error('Integration not found in database', { integrationId });
          }
        })
        .catch(err => {
          logger.error('Error checking integration details', { error: err.message });
        });
      
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
