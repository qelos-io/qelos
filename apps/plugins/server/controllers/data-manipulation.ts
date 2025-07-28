import { executeDataManipulation } from "../services/data-manipulation-service";
import logger from "../services/logger";
import { IDataManipulationStep } from "@qelos/global-types";

export async function getDataManipulation (req, res) {
  try {
    const { payload, workflow } = req.body as { payload: any, workflow: IDataManipulationStep[] };
    const tenant = req.headers.tenant as string;

    if (!payload || !workflow || !Array.isArray(workflow)) {
      res.status(400).json({ message: 'payload and workflow are required' }).end();
      return;
    }
    
    const result = await executeDataManipulation(tenant, payload, workflow);
    res.json(result);
  } catch (error) {
    logger.error('Error executing data manipulation', error);
    res.status(500).json({ message: 'Error executing data manipulation' });
  }
}