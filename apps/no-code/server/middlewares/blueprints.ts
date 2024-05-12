import Blueprint from '../models/blueprint';
import { cacheManager } from '../services/cache-manager';

export async function getBlueprintByIdentifierMiddleware(req, res, next) {
  const blueprintIdentifier = req.params.blueprintIdentifier;
  try {
    const blueprint = cacheManager.wrap(`blueprint:${req.headers.tenant}:${blueprintIdentifier}`, async () => {
      const blueprint = await Blueprint
        .findOne({
          tenant: req.headers.tenant,
          identifier: blueprintIdentifier,
        })
        .lean()
        .exec()

      return JSON.stringify(blueprint);
    })
      .then((blueprint) => JSON.parse(blueprint));

    if (!blueprint) {
      res.status(404).json({ message: 'blueprint not found' }).end();
      return;
    }

    req.blueprint = blueprint;
    next();
  } catch {
    res.status(500).json({ message: 'something went wrong with blueprint' }).end();
  }
}