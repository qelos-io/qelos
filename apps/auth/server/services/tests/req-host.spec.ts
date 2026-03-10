import { getRequestHost } from '../req-host';

describe('getRequestHost', () => {
  it('should return tenanthost when available', () => {
    const req: any = {
      headers: {
        tenanthost: 'tenant.example.com',
        host: 'api.example.com',
        origin: 'https://origin.example.com',
      },
    };
    expect(getRequestHost(req)).toBe('tenant.example.com');
  });

  it('should fall back to host when tenanthost is not set', () => {
    const req: any = {
      headers: {
        host: 'api.example.com',
        origin: 'https://origin.example.com',
      },
    };
    expect(getRequestHost(req)).toBe('api.example.com');
  });

  it('should fall back to origin host when tenanthost and host are not set', () => {
    const req: any = {
      headers: {
        origin: 'https://origin.example.com',
      },
    };
    expect(getRequestHost(req)).toBe('origin.example.com');
  });

  it('should strip port from tenanthost', () => {
    const req: any = {
      headers: {
        tenanthost: 'tenant.example.com:3000',
      },
    };
    expect(getRequestHost(req)).toBe('tenant.example.com');
  });

  it('should strip port from host', () => {
    const req: any = {
      headers: {
        host: 'api.example.com:8080',
        origin: 'https://origin.example.com',
      },
    };
    expect(getRequestHost(req)).toBe('api.example.com');
  });

  it('should strip port from origin host', () => {
    const req: any = {
      headers: {
        origin: 'https://origin.example.com:9000',
      },
    };
    expect(getRequestHost(req)).toBe('origin.example.com');
  });
});
