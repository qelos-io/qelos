import { Response } from 'express';
import qs from 'qs'
import { RequestWithUser } from '@qelos/api-kit/dist/types';
import { BlueprintPropertyType, CRUDOperation, PermissionScope } from '@qelos/global-types';
import { IBlueprint } from '../models/blueprint';
import { getUserPermittedScopes } from '../services/entities-permissions.service';
import BlueprintEntity from '../models/blueprint-entity';
import { getEntityQuery } from '../services/entities.service';

interface RequestWithBlueprint extends RequestWithUser {
  _parsedUrl: {
    query: string;
  } & any;
  blueprint: IBlueprint;
  query: {
    bypassAdmin?: boolean;
  } & RequestWithUser['query'];
  permittedScopes: PermissionScope[] | true;
}

export function checkChartPermissions(req: RequestWithBlueprint, res: Response, next: Function) {
  const blueprint: IBlueprint = req.blueprint;
  const permittedScopes = getUserPermittedScopes(req.user, blueprint, CRUDOperation.READ, req.query.bypassAdmin);

  if (!(permittedScopes === true || permittedScopes.length > 0)) {
    res.status(403).json({ message: 'not permitted' }).end();
    return;
  }
  req.permittedScopes = permittedScopes;
  next();
}

export async function getStandardChart(req, res: Response) {
  const blueprint: IBlueprint = req.blueprint;
  const chartType = req.params.chartType;

  const propToAggregate: string = req.query.x?.toString() || '';
  const propType = blueprint.properties[propToAggregate]?.type;

  if (!propToAggregate || !propType) {
    res.status(400).json({ message: 'xAxis is required' }).end();
    return;
  }

  const query = {
    ...getEntityQuery({ blueprint, req, permittedScopes: req.permittedScopes })
  }

  let $group;
  switch (propType) {
    case BlueprintPropertyType.DATE:
    case BlueprintPropertyType.DATETIME:
      $group = {
        _id: { $dayOfWeek: `$metadata.${propToAggregate}` },
        count: { $sum: 1 }
      }
      break;
    case BlueprintPropertyType.TIME:
      $group = {
        _id: { $hour: `$metadata.${propToAggregate}` },
        count: { $sum: 1 }
      }
      break;
    case BlueprintPropertyType.STRING:
    case BlueprintPropertyType.NUMBER:
    case BlueprintPropertyType.BOOLEAN:
      $group = {
        _id: `$metadata.${propToAggregate}`,
        count: { $sum: 1 }
      }
      break;
    case BlueprintPropertyType.OBJECT:
      res.status(400).json({ message: 'cannot aggregate objects' }).end();
      return;
  }

  const data = await BlueprintEntity.aggregate([
    { $match: query },
    {
      $group,
    },
    { $sort: { _id: 1 } }
  ]).exec()

  // return this kind of object: https://echarts.apache.org/examples/en/editor.html?c=line-simple
  res.json({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        label: {
          show: true
        }
      }
    },
    toolbox: {
      show: true,
      feature: {
        saveAsImage: { show: true }
      }
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d._id)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        data: data.map(d => d.count),
        type: chartType,
        showBackground: true,
      }
    ]
  }).end();
}

export async function getPieChart(req: RequestWithBlueprint, res: Response) {
  const blueprint: IBlueprint = req.blueprint;

  // return this kind of object: https://echarts.apache.org/examples/en/editor.html?c=pie-simple
  res.json({ type: 'line', data: [] }).end();
}

export async function getCountCard(req, res: Response) {
  const blueprint: IBlueprint = req.blueprint;

  const query = {
    ...qs.parse(req._parsedUrl.query, { depth: 3 }),
    ...getEntityQuery({ blueprint, req, permittedScopes: req.permittedScopes })
  }

  const data = await BlueprintEntity.countDocuments(query).exec();
  res.json({ count: data }).end();
}