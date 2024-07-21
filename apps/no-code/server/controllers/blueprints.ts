import Blueprint, { IBlueprint } from '../models/blueprint';
import BlueprintEntity from '../models/blueprint-entity';
import { cacheManager } from '../services/cache-manager';

const VIEWER_FIELDS = 'tenant identifier name description properties created updated';

export async function getAllBlueprints(req, res) {
  const list = await Blueprint.find({
    tenant: req.headers.tenant,
  }, req.user?.isPrivileged ? undefined : VIEWER_FIELDS)
    .lean()
    .exec()

  res.json(list).end()
}

export async function getSingleBlueprint(req, res) {
  const blueprintIdentifier = req.params.blueprintIdentifier;

  const blueprint = await Blueprint.findOne({
    tenant: req.headers.tenant,
    identifier: blueprintIdentifier
  }, req.user?.isPrivileged ? undefined : VIEWER_FIELDS)
    .lean()
    .exec()

  res.json(blueprint).end();
}

export async function createBlueprint(req, res) {
  const blueprint = new Blueprint({
    ...req.body,
    tenant: req.headers.tenant,
  });
  try {
    await blueprint.save();
    res.json(blueprint).end();
  } catch {
    res.status(400).json({ message: 'failed to create a blueprint' }).end();
  }
}

export async function updateBlueprint(req, res) {
  const bluePrintIdentifier = req.params.blueprintIdentifier;
  let blueprint: IBlueprint | null;
  try {
    blueprint = await Blueprint
      .findOne({
        tenant: req.headers.tenant,
        identifier: bluePrintIdentifier,
      })
      .exec()

    if (!blueprint) {
      res.status(404).json({ message: 'blueprint not found' }).end();
      return;
    }
  } catch {
    res.status(500).json({ message: 'something went wrong with blueprint' }).end();
    return;
  }

  const { tenant, identifier, created, ...permittedData } = req.body;

  Object.assign(blueprint, permittedData);
  blueprint.updated = new Date();

  try {
    await blueprint.save();
    cacheManager.setItem(`blueprint:${req.headers.tenant}:${bluePrintIdentifier}`, JSON.stringify(blueprint)).catch()
    res.json(blueprint).end();
  } catch {
    res.status(400).json({ message: 'failed to update blueprint' }).end();
  }
}

export async function patchBlueprint(req, res) {
  const bluePrintIdentifier = req.params.blueprintIdentifier;
  let blueprint: IBlueprint | null;
  try {
    blueprint = await Blueprint
      .findOne({
        tenant: req.headers.tenant,
        identifier: bluePrintIdentifier,
      })
      .exec()

    if (!blueprint) {
      res.status(404).json({ message: 'blueprint not found' }).end();
      return;
    }
  } catch {
    res.status(500).json({ message: 'something went wrong with blueprint' }).end();
    return;
  }

  const { tenant, identifier, created, permissions, ...permittedData } = req.body as Partial<IBlueprint>;

  const relations = [
    ...blueprint.relations,
    ...(permittedData.relations || []),
  ]
    .reduce((map, item) => {
      map[item.key] = item;
      return map;
    }, {});

  Object.assign(
    blueprint,
    permittedData,
    {
      properties: {
        ...blueprint.properties,
        ...permittedData.properties,
      },
      updateMapping: {
        ...blueprint.updateMapping,
        ...permittedData.updateMapping,
      },
      relations: Object.values(relations),
    }
  );
  blueprint.updated = new Date();

  try {
    await blueprint.save();
    cacheManager.setItem(`blueprint:${req.headers.tenant}:${bluePrintIdentifier}`, JSON.stringify(blueprint)).catch()
    res.json(blueprint).end();
  } catch {
    res.status(400).json({ message: 'failed to update blueprint' }).end();
  }
}

export async function removeBlueprint(req, res) {
  const blueprintIdentifier = req.params.blueprintIdentifier;
  try {
    const existingEntities = await BlueprintEntity.count({
      tenant: req.headers.tenant,
      blueprint: blueprintIdentifier
    }).lean().exec();

    if (existingEntities > 0) {
      res.status(400).json({ message: 'cannot remove blueprint with existing entities' }).end();
      return;
    }

    const blueprint = await Blueprint.findOne({
      tenant: req.headers.tenant,
      identifier: blueprintIdentifier
    }).lean().exec()
    await Blueprint.deleteOne({
      tenant: req.headers.tenant,
      identifier: blueprintIdentifier
    }).exec()
    res.json(blueprint).end();
  } catch {
    res.status(500).json({ message: 'failed to remove blueprint' }).end();
  }
}
