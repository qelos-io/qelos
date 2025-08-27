import Integration from "../models/integration";
import { cacheManager } from "../services/cache-manager";
import logger from "../services/logger";

export async function getIntegrationTools(req, res) {
  try {
    const { sourceKind, integrationId } = req.query;
    const tenant = req.headers.tenant as string;

    const tools = await cacheManager.wrap(`integration-tools:${tenant}:${sourceKind}:${integrationId}`, async () => {
      const toolsIntegrations = await Integration.find({
        active: true,
        tenant,
        'kind.0': sourceKind,
        'trigger.operation': 'functionCalling',
        $or: [
          { 'trigger.details.allowedIntegrationIds': integrationId },
          { 'trigger.details.allowedIntegrationIds': '*' },
          { 'trigger.details.allowedIntegrationIds': { $size: 0 } },
        ],
        'trigger.details.blockedIntegrationIds': { $ne: integrationId },
    }).lean().exec();
    return toolsIntegrations ? JSON.stringify(toolsIntegrations) : '';
    }, { ttl: 60 * 60 * 24 });
    
    res.status(200).set('Content-Type', 'application/json').end(tools || '[]');
  } catch (error) {
    logger.error('Error fetching tools integrations', error);
    res.status(500).json({ message: 'Error fetching tools integrations' });
  }
}