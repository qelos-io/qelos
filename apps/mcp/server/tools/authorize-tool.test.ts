import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { IMcpConfigurationMetadata, IMcpExposedTool } from '@qelos/global-types';
import type { McpUserContext } from '../types';
import {
  getAuthorizedTools,
  isToolAllowedForUser,
  isToolAuthorized,
  isUserAllowedForMcp,
  matchesRoleRequirement,
} from './authorize-tool';
import { MCP_TOOL_REGISTRY } from './registry';

const baseConfiguration: IMcpConfigurationMetadata = {
  enabled: true,
  permittedCallbackUrls: ['http://localhost/callback'],
  adminOnly: false,
  exposedTools: [],
};

function exposedTool(overrides: Partial<IMcpExposedTool> & Pick<IMcpExposedTool, 'toolId'>): IMcpExposedTool {
  return {
    enabled: true,
    roles: ['*'],
    wsRoles: ['*'],
    wsLabels: [],
    ...overrides,
  };
}

function user(overrides: Partial<McpUserContext> = {}): McpUserContext {
  return {
    sub: 'user-1',
    tenant: 'tenant-1',
    roles: ['user'],
    workspace: null,
    ...overrides,
  };
}

describe('authorize-tool', () => {
  describe('matchesRoleRequirement', () => {
    it('allows any role when requirement is empty', () => {
      assert.equal(matchesRoleRequirement([], ['user']), true);
      assert.equal(matchesRoleRequirement(undefined, ['user']), true);
    });

    it('allows any role when requirement includes wildcard', () => {
      assert.equal(matchesRoleRequirement(['*'], ['guest']), true);
    });

    it('requires at least one matching role', () => {
      assert.equal(matchesRoleRequirement(['admin'], ['user']), false);
      assert.equal(matchesRoleRequirement(['admin', 'editor'], ['editor']), true);
    });
  });

  describe('isUserAllowedForMcp', () => {
    it('allows non-admin users when adminOnly is false', () => {
      assert.equal(isUserAllowedForMcp({ ...baseConfiguration, adminOnly: false }, user()), true);
    });

    it('blocks non-admin users when adminOnly is true', () => {
      assert.equal(isUserAllowedForMcp({ ...baseConfiguration, adminOnly: true }, user()), false);
    });

    it('allows admin users when adminOnly is true', () => {
      assert.equal(
        isUserAllowedForMcp({ ...baseConfiguration, adminOnly: true }, user({ roles: ['admin'] })),
        true,
      );
    });

    it('allows privileged users when adminOnly is true', () => {
      assert.equal(
        isUserAllowedForMcp(
          { ...baseConfiguration, adminOnly: true },
          user({ roles: ['user'], isPrivileged: true }),
        ),
        true,
      );
    });
  });

  describe('isToolAllowedForUser', () => {
    it('rejects disabled tools', () => {
      assert.equal(
        isToolAllowedForUser(exposedTool({ toolId: 'workspaces', enabled: false }), user()),
        false,
      );
    });

    it('enforces role, workspace role, and label requirements', () => {
      const tool = exposedTool({
        toolId: 'workspaces',
        roles: ['editor'],
        wsRoles: ['member'],
        wsLabels: ['beta'],
      });

      assert.equal(
        isToolAllowedForUser(
          tool,
          user({
            roles: ['editor'],
            workspace: { _id: 'ws-1', name: 'Main', roles: ['member'], labels: ['beta'] },
          }),
        ),
        true,
      );

      assert.equal(
        isToolAllowedForUser(
          tool,
          user({
            roles: ['editor'],
            workspace: { _id: 'ws-1', name: 'Main', roles: ['member'], labels: ['stable'] },
          }),
        ),
        false,
      );
    });
  });

  describe('isToolAuthorized', () => {
    const listWorkspaces = MCP_TOOL_REGISTRY.find((tool) => tool.id === 'list-workspaces')!;
    const listUsers = MCP_TOOL_REGISTRY.find((tool) => tool.id === 'list-users')!;

    it('authorizes enabled category tools for regular users', () => {
      const configuration = {
        ...baseConfiguration,
        exposedTools: [exposedTool({ toolId: 'workspaces' })],
      };

      assert.equal(isToolAuthorized(listWorkspaces, configuration, user()), true);
    });

    it('rejects tools when their category is disabled', () => {
      const configuration = {
        ...baseConfiguration,
        exposedTools: [exposedTool({ toolId: 'workspaces', enabled: false })],
      };

      assert.equal(isToolAuthorized(listWorkspaces, configuration, user()), false);
    });

    it('rejects admin tools for non-admin users even when enabled', () => {
      const configuration = {
        ...baseConfiguration,
        exposedTools: [exposedTool({ toolId: 'users' })],
      };

      assert.equal(isToolAuthorized(listUsers, configuration, user()), false);
    });

    it('authorizes admin tools for admin users when enabled', () => {
      const configuration = {
        ...baseConfiguration,
        exposedTools: [exposedTool({ toolId: 'users' })],
      };

      assert.equal(isToolAuthorized(listUsers, configuration, user({ roles: ['admin'] })), true);
    });

    it('supports direct tool id matches in exposedTools', () => {
      const configuration = {
        ...baseConfiguration,
        exposedTools: [exposedTool({ toolId: 'list-workspaces' })],
      };

      assert.equal(isToolAuthorized(listWorkspaces, configuration, user()), true);
    });
  });

  describe('getAuthorizedTools', () => {
    it('returns only enabled, authorized tools for the caller', () => {
      const configuration = {
        ...baseConfiguration,
        exposedTools: [
          exposedTool({ toolId: 'workspaces' }),
          exposedTool({ toolId: 'users' }),
          exposedTool({ toolId: 'blueprints', enabled: false }),
        ],
      };

      const authorized = getAuthorizedTools(configuration, user({ roles: ['admin'] }));
      const ids = authorized.map((tool) => tool.id);

      assert.deepEqual(ids, ['list-workspaces', 'list-users']);
    });

    it('returns no tools when adminOnly blocks the caller', () => {
      const configuration = {
        ...baseConfiguration,
        adminOnly: true,
        exposedTools: [exposedTool({ toolId: 'workspaces' })],
      };

      assert.deepEqual(getAuthorizedTools(configuration, user()), []);
    });

    it('merges dynamic extraTools with the static registry and applies the same rules', () => {
      const dynamicTool = {
        id: 'integration:1',
        name: 'my_tool',
        category: 'integrations',
        title: 'My tool',
        description: 'A dynamic tool',
        inputSchema: {},
        requiredPrivilege: 'user' as const,
        handler: async () => ({}),
      };

      const configuration = {
        ...baseConfiguration,
        exposedTools: [
          exposedTool({ toolId: 'workspaces' }),
          exposedTool({ toolId: 'integration:1' }),
        ],
      };

      const authorized = getAuthorizedTools(configuration, user(), [dynamicTool]);
      const ids = authorized.map((tool) => tool.id);

      assert.deepEqual(ids, ['list-workspaces', 'integration:1']);
    });

    it('excludes dynamic tools that are not enabled in exposedTools', () => {
      const dynamicTool = {
        id: 'integration:1',
        name: 'my_tool',
        category: 'integrations',
        title: 'My tool',
        description: 'A dynamic tool',
        inputSchema: {},
        requiredPrivilege: 'user' as const,
        handler: async () => ({}),
      };

      const configuration = {
        ...baseConfiguration,
        exposedTools: [exposedTool({ toolId: 'workspaces' })],
      };

      const authorized = getAuthorizedTools(configuration, user(), [dynamicTool]);
      assert.deepEqual(authorized.map((tool) => tool.id), ['list-workspaces']);
    });
  });
});
