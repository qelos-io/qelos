import { getValidMetadata, getCookieTokenName, getCookieTokenValue } from '../users';
import { AuthRequest } from '../../../types';

describe('users service', () => {
  describe('getValidMetadata', () => {
    it('should return empty object when no additionalFields are provided', () => {
      const result = getValidMetadata({ key: 'value' }, []);
      expect(result).toEqual({});
    });

    it('should return empty object when metadata is empty and no fields are required', () => {
      const result = getValidMetadata({}, [
        { key: 'optional', valueType: 'string' } as any,
      ]);
      expect(result).toEqual({});
    });

    it('should include field when metadata has matching key and correct type', () => {
      const result = getValidMetadata(
        { department: 'Engineering' },
        [{ key: 'department', valueType: 'string' } as any]
      );
      expect(result).toEqual({ department: 'Engineering' });
    });

    it('should use defaultValue when metadata does not have the key', () => {
      const result = getValidMetadata(
        {},
        [{ key: 'department', valueType: 'string', defaultValue: 'General' } as any]
      );
      expect(result).toEqual({ department: 'General' });
    });

    it('should use defaultValue when metadata has wrong type for the key', () => {
      const result = getValidMetadata(
        { department: 123 },
        [{ key: 'department', valueType: 'string', defaultValue: 'General' } as any]
      );
      expect(result).toEqual({ department: 'General' });
    });

    it('should throw when required field is missing and has no default', () => {
      expect(() => {
        getValidMetadata(
          {},
          [{ key: 'department', valueType: 'string', required: true } as any]
        );
      }).toThrow();
    });

    it('should throw with INVALID_METADATA code for missing required field', () => {
      try {
        getValidMetadata(
          {},
          [{ key: 'department', valueType: 'string', required: true } as any]
        );
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVALID_METADATA');
      }
    });

    it('should handle multiple fields correctly', () => {
      const result = getValidMetadata(
        { name: 'Test', age: 25, extra: 'ignored' },
        [
          { key: 'name', valueType: 'string' } as any,
          { key: 'age', valueType: 'number' } as any,
        ]
      );
      expect(result).toEqual({ name: 'Test', age: 25 });
    });

    it('should handle undefined metadata with defaults', () => {
      const result = getValidMetadata(
        undefined,
        [{ key: 'name', valueType: 'string', defaultValue: 'Default' } as any]
      );
      expect(result).toEqual({ name: 'Default' });
    });

    it('should handle boolean type fields', () => {
      const result = getValidMetadata(
        { active: true },
        [{ key: 'active', valueType: 'boolean' } as any]
      );
      expect(result).toEqual({ active: true });
    });

    it('should skip field when type does not match and no truthy default', () => {
      const result = getValidMetadata(
        { active: 'true' },
        [{ key: 'active', valueType: 'boolean' } as any]
      );
      expect(result).toEqual({});
    });
  });

  describe('getCookieTokenName', () => {
    it('should return a name prefixed with qlt_', () => {
      const name = getCookieTokenName('tenant-1');
      expect(name.startsWith('qlt_')).toBe(true);
    });

    it('should truncate tenant to first 8 characters', () => {
      const name = getCookieTokenName('very-long-tenant-id');
      expect(name).toBe('qlt_very-lon');
    });

    it('should handle short tenant ids', () => {
      const name = getCookieTokenName('abc');
      expect(name).toBe('qlt_abc');
    });

    it('should handle exactly 8-character tenant ids', () => {
      const name = getCookieTokenName('12345678');
      expect(name).toBe('qlt_12345678');
    });

    it('should handle tenant id "0"', () => {
      const name = getCookieTokenName('0');
      expect(name).toBe('qlt_0');
    });
  });

  describe('getCookieTokenValue', () => {
    it('should return token from cookies matching tenant-based name', () => {
      const req: any = {
        headers: { tenant: 'tenant-1' },
        cookies: { 'qlt_tenant-1': 'cookie-token-value' },
        signedCookies: {},
      };
      const result = getCookieTokenValue(req);
      expect(result).toBe('cookie-token-value');
    });

    it('should prefer signedCookies over cookies', () => {
      const req: any = {
        headers: { tenant: 'tenant-1' },
        cookies: { 'qlt_tenant-1': 'unsigned-token' },
        signedCookies: { 'qlt_tenant-1': 'signed-token' },
      };
      const result = getCookieTokenValue(req);
      expect(result).toBe('signed-token');
    });

    it('should fall back to generic "token" cookie', () => {
      const req: any = {
        headers: { tenant: 'tenant-1' },
        cookies: { token: 'generic-token' },
        signedCookies: {},
      };
      const result = getCookieTokenValue(req);
      expect(result).toBe('generic-token');
    });

    it('should fall back to generic signed "token" cookie', () => {
      const req: any = {
        headers: { tenant: 'tenant-1' },
        cookies: {},
        signedCookies: { token: 'signed-generic-token' },
      };
      const result = getCookieTokenValue(req);
      expect(result).toBe('signed-generic-token');
    });

    it('should return undefined when no token cookie exists', () => {
      const req: any = {
        headers: { tenant: 'tenant-1' },
        cookies: {},
        signedCookies: {},
      };
      const result = getCookieTokenValue(req);
      expect(result).toBeUndefined();
    });
  });
});
