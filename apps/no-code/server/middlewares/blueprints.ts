import { getBlueprint } from '../services/blueprints.service';

export async function getBlueprintByIdentifierMiddleware(req, res, next) {
  const blueprintIdentifier = req.params.blueprintIdentifier;
  try {
    const blueprint = await getBlueprint(req.headers.tenant, blueprintIdentifier);

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