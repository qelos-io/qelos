#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import QelosAdministratorSDK from '@qelos/sdk/src/administrator'
import { allTools } from './tools/index.js';
import { allResources } from './resources/index.js';

/**
 * Qelos MCP Server
 * 
 * Provides MCP tools and resources for interacting with Qelos API
 */

class QelosMCPServer {
  private server: McpServer;
  private sdk: QelosAdministratorSDK;
  private initialized: boolean = false;
  private username: string;
  private password: string;

  constructor() {
    this.username = process.env.MCP_QELOS_USERNAME || 'test@test.com';
    this.password = process.env.MCP_QELOS_PASSWORD || 'admin';

    // Initialize MCP Server
    this.server = new McpServer({
      name: 'qelos-mcp-server',
      version: '1.0.0',
    });

    // Initialize Qelos SDK
    this.sdk = new QelosAdministratorSDK({
      appUrl: process.env.MCP_QELOS_URL || 'http://localhost:3000',
      fetch: fetch,
    });
    
    // Register all tools and resources
    this.registerAllTools();
    this.registerAllResources();
    
    console.error('✓ Qelos MCP Server initialized');
  }

  /**
   * Register all tools from the tools directory
   */
  private registerAllTools(): void {
    const context = {
      sdk: this.sdk,
      ensureAuthenticated: this.ensureAuthenticated.bind(this)
    };

    allTools.forEach(registerTool => {
      registerTool(this.server, context);
    });

    console.error(`✓ ${allTools.length} tools registered`);
  }

  /**
   * Register all resources from the resources directory
   */
  private registerAllResources(): void {
    const context = {
      sdk: this.sdk,
      ensureAuthenticated: this.ensureAuthenticated.bind(this)
    };

    allResources.forEach(registerResource => {
      registerResource(this.server, context);
    });

    console.error(`✓ ${allResources.length} resources registered`);
  }

  /**
   * Ensure SDK is authenticated
   */
  private async ensureAuthenticated(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.error('Authenticating with Qelos...');
      await this.sdk.authentication.oAuthSignin({
        username: this.username,
        password: this.password,
      });
      this.initialized = true;
      console.error('✓ Successfully authenticated with Qelos');
      console.error(`✓ Connected to: ${process.env.MCP_QELOS_URL}`);
    } catch (error) {
      console.error('Failed to authenticate with Qelos:', error);
      throw error;
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('✓ Qelos MCP Server running on stdio');
    console.error('Ready to accept MCP requests');
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    const server = new QelosMCPServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start Qelos MCP Server:', error);
    process.exit(1);
  }
}

// Run the server
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});