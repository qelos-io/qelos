import { Response } from 'express';
import { callIntegrationTarget } from '../services/integration-target-call';
import logger from '../services/logger';
import Integration, { IIntegrationEntity } from '../models/integration';
import { IntegrationSourceKind, QelosTriggerOperation } from '@qelos/global-types';
import { RequestWithUser } from '@qelos/api-kit/dist/types';
import { executeDataManipulation } from '../services/data-manipulation-service';

export async function triggerWebhook(req: RequestWithUser, res: Response) {
  try {
    const integration = await Integration
    .findOne({ 
      _id: req.params.integrationId, 
      tenant: req.headers.tenant,
      kind: IntegrationSourceKind.Qelos,
      'trigger.operation': QelosTriggerOperation.webhook,
     })
    .select('target trigger kind')
    .lean()
    .exec();
    if (!integration || !integration.target) {
      return res.status(404).json({ message: 'Integration not found' });
    }

    // Validate roles if specified
    if (integration.trigger.details.roles && integration.trigger.details.roles.length > 0) {
      const userRoles = req.user?.roles || [];
      const workspaceRoles = req.user?.workspace?.roles || [];
      const allowedRoles = integration.trigger.details.roles;
      
      // Check if user has any of the required roles
      const hasRequiredRole = allowedRoles.some(role => {
        if (role === 'guest') {
          // Guest access is allowed if explicitly included
          return true;
        }
        return userRoles.includes(role) || workspaceRoles.includes(role);
      });
      
      if (!hasRequiredRole) {
        return res.status(403).json({ 
          message: 'Access denied: insufficient permissions' 
        });
      }
    }

    // Validate workspace labels if specified
    if (integration.trigger.details.workspaceLabels && integration.trigger.details.workspaceLabels.length > 0) {
      const userLabels = req.user?.workspace?.labels || [];
      const requiredLabels = integration.trigger.details.workspaceLabels;
      
      // Check if user has all required labels
      const hasAllLabels = requiredLabels.every(label => userLabels.includes(label));
      
      if (!hasAllLabels) {
        return res.status(403).json({ 
          message: 'Access denied: missing required workspace labels' 
        });
      }
    }

    const payload = await executeDataManipulation(req.headers.tenant as string, {
      body: req.body,
      headers: req.headers,
      method: req.method,
      user: req.user,
    }, integration.trigger.details.dataManipulation);

    const result = await callIntegrationTarget(req.headers.tenant as string, payload, integration.target as IIntegrationEntity);
    res.json(result).end();
  } catch (error) {
    logger.error('Error triggering webhook', error);
    res.status(500).json({ message: 'Error triggering webhook' }).end();
  }
}
