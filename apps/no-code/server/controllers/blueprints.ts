import Blueprint, { IBlueprint } from '../models/blueprint';
import BlueprintEntity from '../models/blueprint-entity';
import { cacheManager } from '../services/cache-manager';
import logger from '../services/logger';
import { IBlueprintPropertyDescriptor } from '@qelos/global-types';
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

  blueprint.properties = req.body.properties.map((p: IBlueprintPropertyDescriptor): IBlueprintPropertyDescriptor => {
    // validate descriptor properties
    // only allow required, multi, min, max, enum, default, description, metadata
    const { name, type, required, multi, min, max, enum: e, default: d, description, metadata } = p;
    
    // return all valid properties, including null, 0, false values
    const data = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (required !== undefined) data.required = required;
    if (multi !== undefined) data.multi = multi;
    if (min !== undefined) data.min = min;
    if (max !== undefined) data.max = max;
    if (e !== undefined) data.enum = e;
    if (d !== undefined) data.default = d;
    if (description !== undefined) data.description = description;
    if (metadata !== undefined) data.metadata = metadata;
    return data;
  });
  try {
    await blueprint.save();
    res.json(blueprint).end();
  } catch (err) {
    logger.error(err);
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
  const blueprintIdentifier = req.params.blueprintIdentifier.toString();
  try {
    const existingEntities = await BlueprintEntity.countDocuments({
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
