import { describe, expect, it } from 'vitest';
import {
  CLICKABLE_CALLBACK_CLIENT_HINTS,
  detectCallbackUrlClient,
  isCallbackUrlInList,
  isValidCallbackUrl,
} from '../mcp-callback-url-validation';

describe('isValidCallbackUrl', () => {
  it('accepts custom URI schemes', () => {
    expect(isValidCallbackUrl('cursor://anysphere.cursor-mcp/oauth/callback')).toBe(true);
  });

  it('accepts https URLs', () => {
    expect(isValidCallbackUrl('https://claude.ai/api/mcp/auth_callback')).toBe(true);
    expect(isValidCallbackUrl('https://app.mintmcp.com/oauth/callback')).toBe(true);
  });

  it('accepts http loopback URLs used by local MCP clients', () => {
    expect(isValidCallbackUrl('http://127.0.0.1:19876/mcp/oauth/callback')).toBe(true);
    expect(isValidCallbackUrl('http://localhost:8088/callback')).toBe(true);
  });

  it('rejects invalid or remote http URLs', () => {
    expect(isValidCallbackUrl('http://example.com/callback')).toBe(false);
    expect(isValidCallbackUrl('not-a-url')).toBe(false);
    expect(isValidCallbackUrl('')).toBe(false);
  });
});

describe('detectCallbackUrlClient', () => {
  it('recognizes known MCP clients', () => {
    expect(detectCallbackUrlClient('cursor://anysphere.cursor-mcp/oauth/callback')?.id).toBe('cursor');
    expect(detectCallbackUrlClient('https://app.mintmcp.com/oauth/callback')?.id).toBe('mintmcp');
    expect(detectCallbackUrlClient('http://127.0.0.1:19876/mcp/oauth/callback')?.id).toBe('opencode');
    expect(detectCallbackUrlClient('http://localhost:8088/callback')?.id).toBe('claude-code');
  });
});

describe('clickable callback hints', () => {
  it('excludes generic pattern rows from one-click suggestions', () => {
    const ids = CLICKABLE_CALLBACK_CLIENT_HINTS.map((hint) => hint.id);
    expect(ids).not.toContain('https');
    expect(ids).not.toContain('custom-scheme');
    expect(ids).toContain('mintmcp');
    expect(ids).toContain('opencode');
  });
});

describe('isCallbackUrlInList', () => {
  it('matches trimmed callback URLs', () => {
    const urls = ['https://claude.ai/api/mcp/auth_callback'];
    expect(isCallbackUrlInList(' https://claude.ai/api/mcp/auth_callback ', urls)).toBe(true);
    expect(isCallbackUrlInList('https://app.mintmcp.com/oauth/callback', urls)).toBe(false);
  });
});
