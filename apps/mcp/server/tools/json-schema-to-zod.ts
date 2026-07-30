import * as z from 'zod/v4';

export interface JsonSchemaProperty {
  type?: string;
  description?: string;
  enum?: unknown[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

export interface JsonSchemaParameters {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

function jsonSchemaPropertyToZod(property: JsonSchemaProperty | undefined): z.ZodTypeAny {
  if (!property || typeof property !== 'object') {
    return z.unknown();
  }

  let schema: z.ZodTypeAny;

  if (Array.isArray(property.enum) && property.enum.length > 0 && property.enum.every((v) => typeof v === 'string')) {
    schema = z.enum(property.enum as [string, ...string[]]);
  } else {
    switch (property.type) {
      case 'string':
        schema = z.string();
        break;
      case 'number':
      case 'integer':
        schema = z.number();
        break;
      case 'boolean':
        schema = z.boolean();
        break;
      case 'array':
        schema = z.array(jsonSchemaPropertyToZod(property.items));
        break;
      case 'object':
        schema = property.properties
          ? z.object(jsonSchemaPropertiesToZodShape(property.properties, property.required))
          : z.record(z.string(), z.unknown());
        break;
      default:
        schema = z.unknown();
    }
  }

  if (property.description) {
    schema = schema.describe(property.description);
  }

  return schema;
}

function jsonSchemaPropertiesToZodShape(
  properties: Record<string, JsonSchemaProperty>,
  required: string[] | undefined,
): z.ZodRawShape {
  const requiredKeys = new Set(required || []);
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, property] of Object.entries(properties)) {
    const zodType = jsonSchemaPropertyToZod(property);
    shape[key] = requiredKeys.has(key) ? zodType : zodType.optional();
  }

  return shape;
}

export function jsonSchemaToZodShape(parameters: JsonSchemaParameters | undefined | null): z.ZodRawShape {
  if (!parameters || typeof parameters !== 'object' || !parameters.properties) {
    return {};
  }

  return jsonSchemaPropertiesToZodShape(parameters.properties, parameters.required);
}
