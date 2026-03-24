/**
 * Unit tests for the entities service
 * Using Node.js built-in test module
 */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { BlueprintPropertyType } from '@qelos/global-types';
import { validateValue, getValidBlueprintMetadata } from '../entities.service';

describe('validateValue', () => {

  describe('object type', () => {
    it('should return a valid object when schema is provided', () => {
      const value = { host: 'localhost', port: 8080 };
      const property = {
        title: 'Config',
        type: BlueprintPropertyType.OBJECT,
        description: 'Configuration object',
        required: false,
        schema: {
          type: 'object',
          properties: {
            host: { type: 'string' },
            port: { type: 'number' },
          },
        },
      };

      const result = validateValue('config', value, property);
      assert.deepStrictEqual(result, { host: 'localhost', port: 8080 });
    });

    it('should return a deeply nested object', () => {
      const value = {
        database: {
          connection: {
            host: 'localhost',
            port: 5432,
            options: {
              ssl: true,
              timeout: 30,
            },
          },
        },
      };
      const property = {
        title: 'Settings',
        type: BlueprintPropertyType.OBJECT,
        description: 'Nested settings',
        required: false,
        schema: {
          type: 'object',
        },
      };

      const result = validateValue('settings', value, property);
      assert.deepStrictEqual(result, value);
    });

    it('should throw for invalid object according to schema', () => {
      const value = { host: 123 }; // host should be string
      const property = {
        title: 'Config',
        type: BlueprintPropertyType.OBJECT,
        description: '',
        required: false,
        schema: {
          type: 'object',
          properties: {
            host: { type: 'string' },
          },
          additionalProperties: false,
        },
      };

      assert.throws(() => validateValue('config', value, property), /must be a valid/);
    });

    it('should use default schema (Record<string, string>) when no schema provided', () => {
      const value = { key1: 'value1', key2: 'value2' };
      const property = {
        title: 'Tags',
        type: BlueprintPropertyType.OBJECT,
        description: '',
        required: false,
      };

      const result = validateValue('tags', value, property);
      assert.deepStrictEqual(result, value);
    });

    it('should throw when value does not match default schema', () => {
      const value = { key1: 123 }; // default schema requires string values
      const property = {
        title: 'Tags',
        type: BlueprintPropertyType.OBJECT,
        description: '',
        required: false,
      };

      assert.throws(() => validateValue('tags', value, property), /must be a valid/);
    });

    it('should return undefined for optional object with undefined value', () => {
      const property = {
        title: 'Config',
        type: BlueprintPropertyType.OBJECT,
        description: '',
        required: false,
      };

      const result = validateValue('config', undefined, property);
      assert.strictEqual(result, undefined);
    });

    it('should preserve object with arrays in schema', () => {
      const value = { tags: ['a', 'b'], count: 2 };
      const property = {
        title: 'Data',
        type: BlueprintPropertyType.OBJECT,
        description: '',
        required: false,
        schema: {
          type: 'object',
          properties: {
            tags: { type: 'array', items: { type: 'string' } },
            count: { type: 'number' },
          },
        },
      };

      const result = validateValue('data', value, property);
      assert.deepStrictEqual(result, value);
    });

    it('should preserve the exact same object reference', () => {
      const value = { key: 'val' };
      const property = {
        title: 'Obj',
        type: BlueprintPropertyType.OBJECT,
        description: '',
        required: false,
        schema: { type: 'object' },
      };

      const result = validateValue('obj', value, property);
      assert.strictEqual(result, value);
    });
  });

  describe('string type', () => {
    it('should return a valid string', () => {
      const property = {
        title: 'Name',
        type: BlueprintPropertyType.STRING,
        description: '',
        required: false,
      };

      const result = validateValue('name', 'hello', property);
      assert.strictEqual(result, 'hello');
    });

    it('should throw for non-string value', () => {
      const property = {
        title: 'Name',
        type: BlueprintPropertyType.STRING,
        description: '',
        required: false,
      };

      assert.throws(() => validateValue('name', 123, property), /must be a string/);
    });

    it('should validate enum values', () => {
      const property = {
        title: 'Status',
        type: BlueprintPropertyType.STRING,
        description: '',
        required: false,
        enum: ['active', 'inactive'],
      };

      assert.strictEqual(validateValue('status', 'active', property), 'active');
      assert.throws(() => validateValue('status', 'unknown', property), /must be one of/);
    });
  });

  describe('number type', () => {
    it('should coerce and return a valid number', () => {
      const property = {
        title: 'Count',
        type: BlueprintPropertyType.NUMBER,
        description: '',
        required: false,
      };

      assert.strictEqual(validateValue('count', '42', property), 42);
      assert.strictEqual(validateValue('count', 42, property), 42);
    });

    it('should throw for NaN', () => {
      const property = {
        title: 'Count',
        type: BlueprintPropertyType.NUMBER,
        description: '',
        required: false,
      };

      assert.throws(() => validateValue('count', 'abc', property), /must be a number/);
    });
  });

  describe('boolean type', () => {
    it('should coerce to boolean', () => {
      const property = {
        title: 'Active',
        type: BlueprintPropertyType.BOOLEAN,
        description: '',
        required: false,
      };

      assert.strictEqual(validateValue('active', true, property), true);
      assert.strictEqual(validateValue('active', 1, property), true);
      assert.strictEqual(validateValue('active', 0, property), false);
      assert.strictEqual(validateValue('active', '', property), false);
    });
  });

  describe('required fields', () => {
    it('should throw for required field with undefined value', () => {
      const property = {
        title: 'Name',
        type: BlueprintPropertyType.STRING,
        description: '',
        required: true,
      };

      assert.throws(() => validateValue('name', undefined, property));
    });

    it('should return undefined for optional field with undefined value', () => {
      const property = {
        title: 'Name',
        type: BlueprintPropertyType.STRING,
        description: '',
        required: false,
      };

      assert.strictEqual(validateValue('name', undefined, property), undefined);
    });
  });
});

describe('getValidBlueprintMetadata', () => {
  it('should return valid metadata with object type properties', () => {
    const metadata = {
      name: 'test',
      config: { host: 'localhost', port: 8080 },
    };
    const blueprint = {
      properties: {
        name: {
          title: 'Name',
          type: BlueprintPropertyType.STRING,
          description: '',
          required: false,
        },
        config: {
          title: 'Config',
          type: BlueprintPropertyType.OBJECT,
          description: '',
          required: false,
          schema: {
            type: 'object',
            properties: {
              host: { type: 'string' },
              port: { type: 'number' },
            },
          },
        },
      },
    };

    const result = getValidBlueprintMetadata(metadata, blueprint as any);
    assert.deepStrictEqual(result, {
      name: 'test',
      config: { host: 'localhost', port: 8080 },
    });
  });

  it('should handle deeply nested object properties', () => {
    const metadata = {
      settings: {
        database: {
          connection: {
            host: 'db.example.com',
            ssl: true,
          },
        },
        cache: {
          ttl: 3600,
        },
      },
    };
    const blueprint = {
      properties: {
        settings: {
          title: 'Settings',
          type: BlueprintPropertyType.OBJECT,
          description: '',
          required: false,
          schema: { type: 'object' },
        },
      },
    };

    const result = getValidBlueprintMetadata(metadata, blueprint as any);
    assert.deepStrictEqual(result, metadata);
  });

  it('should handle mixed property types including objects', () => {
    const metadata = {
      name: 'entity1',
      count: 5,
      active: true,
      config: { key: 'value' },
    };
    const blueprint = {
      properties: {
        name: { title: 'Name', type: BlueprintPropertyType.STRING, description: '', required: false },
        count: { title: 'Count', type: BlueprintPropertyType.NUMBER, description: '', required: false },
        active: { title: 'Active', type: BlueprintPropertyType.BOOLEAN, description: '', required: false },
        config: {
          title: 'Config',
          type: BlueprintPropertyType.OBJECT,
          description: '',
          required: false,
          schema: { type: 'object', additionalProperties: { type: 'string' } },
        },
      },
    };

    const result = getValidBlueprintMetadata(metadata, blueprint as any);
    assert.deepStrictEqual(result, {
      name: 'entity1',
      count: 5,
      active: true,
      config: { key: 'value' },
    });
  });

  it('should handle multi-value object properties', () => {
    const metadata = {
      configs: [
        { host: 'server1', port: 80 },
        { host: 'server2', port: 443 },
      ],
    };
    const blueprint = {
      properties: {
        configs: {
          title: 'Configs',
          type: BlueprintPropertyType.OBJECT,
          description: '',
          required: false,
          multi: true,
          schema: {
            type: 'object',
            properties: {
              host: { type: 'string' },
              port: { type: 'number' },
            },
          },
        },
      },
    };

    const result = getValidBlueprintMetadata(metadata, blueprint as any);
    assert.deepStrictEqual(result, {
      configs: [
        { host: 'server1', port: 80 },
        { host: 'server2', port: 443 },
      ],
    });
  });

  it('should filter out only blueprint-defined properties', () => {
    const metadata = {
      name: 'test',
      config: { key: 'value' },
      extraField: 'should be filtered',
    };
    const blueprint = {
      properties: {
        name: { title: 'Name', type: BlueprintPropertyType.STRING, description: '', required: false },
        config: {
          title: 'Config',
          type: BlueprintPropertyType.OBJECT,
          description: '',
          required: false,
          schema: { type: 'object' },
        },
      },
    };

    const result = getValidBlueprintMetadata(metadata, blueprint as any);
    assert.deepStrictEqual(result, {
      name: 'test',
      config: { key: 'value' },
    });
    assert.strictEqual('extraField' in result, false);
  });

  it('should handle object property alongside undefined optional properties', () => {
    const metadata = {
      config: { nested: { deep: 'value' } },
    };
    const blueprint = {
      properties: {
        name: { title: 'Name', type: BlueprintPropertyType.STRING, description: '', required: false },
        config: {
          title: 'Config',
          type: BlueprintPropertyType.OBJECT,
          description: '',
          required: false,
          schema: { type: 'object' },
        },
      },
    };

    const result = getValidBlueprintMetadata(metadata, blueprint as any) as Record<string, any>;
    assert.deepStrictEqual(result.config, { nested: { deep: 'value' } });
  });

  it('should return empty object when metadata is null', () => {
    const blueprint = {
      properties: {
        config: {
          title: 'Config',
          type: BlueprintPropertyType.OBJECT,
          description: '',
          required: false,
        },
      },
    };

    const result = getValidBlueprintMetadata(null, blueprint as any);
    assert.deepStrictEqual(result, {});
  });
});
