import { IBlueprint } from '../models/blueprint';

/** How the query parameters of a request become a filter on blueprint entities, for listing them and for charts. */

/** a blueprint property named in the query filters the entity's metadata */
export function convertQueryToMetadata(query: any, blueprint: IBlueprint) {
  Object.entries(blueprint.properties).forEach(([key, property]) => {
    if (query[key]) {
      query[`metadata.${key}`] = query[key];
      delete query[key];
    }
  })
}

/**
 * Converts query values to appropriate types based on blueprint property type
 * @param value - The value to convert
 * @param propertyType - The blueprint property type
 * @returns The converted value
 */
const convertPropertyValueByType = (value: any, propertyType: string): any => {
  if (propertyType === 'boolean') {
    return value?.toLowerCase?.() === 'true' || value === '1';
  } else if (propertyType === 'number' || propertyType === 'datetime') {
    const conversionFn = propertyType === 'number' ? parseInt : (val: string) => new Date(val);
    
    if (typeof value === 'string') {
      return conversionFn(value);
    } else if (typeof value === 'object' && (value.$eq || value.$ne || value.$gt || value.$gte || value.$lt || value.$lte)) {
      return Object.entries(value).reduce((acc, [key, val]) => {
        if (val && typeof val === 'string') {
          acc[key] = conversionFn(val as string);
        } else if (val && typeof val === 'number') {
          acc[key] = val;
        }
        return acc;
      }, {});
    }
  }

  if (typeof value === 'object' && value.$regex) {
    return {
      $regex: value.$regex || '',
      $options: value.$options || 'i'
    }
  }
  
  return value;
};

/** compare number, boolean and date properties as such, not as the text of the query */
export function convertQueryValuesByType(query: any, blueprint: IBlueprint) {
  Object.entries(blueprint.properties).forEach(([key, property]) => {
    const fullKey = `metadata.${key}`;
    if (query[fullKey]) {
      query[fullKey] = convertPropertyValueByType(query[fullKey], property.type);
    }
  });
}

/**
 * The property filters of a chart request, as listing applies them. `parameters` are the chart's own (like `x`), which
 * are not filters.
 */
export function getChartFilter(query: Record<string, any>, blueprint: IBlueprint, parameters: string[] = []) {
  const filter = { ...query };
  for (const parameter of [...parameters, 'bypassAdmin']) {
    delete filter[parameter];
  }
  convertQueryToMetadata(filter, blueprint);
  convertQueryValuesByType(filter, blueprint);
  return filter;
}
