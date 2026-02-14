const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

describe('Push Command - Hard Flag Integration', () => {
  let testDir;
  let originalCwd;
  
  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'push-hard-test-'));
    originalCwd = process.cwd();
    
    // Create resource directories
    fs.mkdirSync(path.join(testDir, 'blueprints'));
    fs.mkdirSync(path.join(testDir, 'plugins'));
    fs.mkdirSync(path.join(testDir, 'components'));
    fs.mkdirSync(path.join(testDir, 'integrations'));
  });
  
  afterEach(() => {
    // Clean up test directory
    process.chdir(originalCwd);
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const runPushCommand = (type, dir, hard = false) => {
    try {
      const hardFlag = hard ? ' --hard' : '';
      const output = execSync(`node cli.mjs push ${type} ${dir}${hardFlag}`, { 
        cwd: path.join(__dirname, '../..'),
        encoding: 'utf8',
        stdio: 'pipe',
        env: {
          ...process.env,
          QELOS_URL: 'http://localhost:3000',
          QELOS_USERNAME: 'test@test.com',
          QELOS_PASSWORD: 'admin',
          // Prevent actual network calls
          NODE_ENV: 'test'
        }
      });
      return { success: true, output };
    } catch (error) {
      return { 
        success: false, 
        output: error.stderr || error.stdout || error.message
      };
    }
  };

  describe('Hard flag validation', () => {
    it('should show error when using --hard with unsupported type', () => {
      const result = runPushCommand('configs', path.join(testDir, 'configs'), true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('--hard flag is only available for');
    });

    it('should show error when using --hard with single file', () => {
      // Create a single component file
      const componentFile = path.join(testDir, 'components', 'test-component.vue');
      fs.writeFileSync(componentFile, '<template><div>Test</div></template>');
      
      const result = runPushCommand('components', componentFile, true);
      expect(result.success).toBe(false);
      expect(result.output).toContain('--hard flag can only be used when pushing a directory');
    });

    it('should accept --hard for supported types with directory', () => {
      // Test each supported type
      const supportedTypes = ['components', 'blueprints', 'plugins', 'integrations'];
      
      supportedTypes.forEach(type => {
        const result = runPushCommand(type, path.join(testDir, type), true);
        // We expect it to fail due to network connection, but not due to flag validation
        if (!result.success) {
          expect(result.output).not.toContain('--hard flag is only available for');
          expect(result.output).not.toContain('--hard flag can only be used when pushing a directory');
        }
      });
    });

    it('should accept --hard for "all" type', () => {
      const result = runPushCommand('all', testDir, true);
      // We expect it to fail due to network connection, but not due to flag validation
      if (!result.success) {
        expect(result.output).not.toContain('--hard flag is only available for');
      }
    });
  });

  describe('Hard flag behavior', () => {
    beforeEach(() => {
      // Create test files for each type
      fs.writeFileSync(
        path.join(testDir, 'components', 'local-component.vue'),
        '<template><div>Local Component</div></template>'
      );
      
      fs.writeFileSync(
        path.join(testDir, 'blueprints', 'local-bp.blueprint.json'),
        JSON.stringify({
          identifier: 'local-bp',
          name: 'Local Blueprint',
          description: 'A local blueprint'
        }, null, 2)
      );
      
      fs.writeFileSync(
        path.join(testDir, 'plugins', 'local-plugin.plugin.json'),
        JSON.stringify({
          key: 'local-plugin',
          name: 'Local Plugin',
          description: 'A local plugin'
        }, null, 2)
      );
      
      fs.writeFileSync(
        path.join(testDir, 'integrations', 'local-integration.integration.json'),
        JSON.stringify({
          identifier: 'local-integration',
          name: 'Local Integration',
          trigger: { type: 'webhook' },
          target: { type: 'webhook' }
        }, null, 2)
      );
    });

    it('should show warning message when using --hard flag', () => {
      // This test would require mocking the SDK to test the actual warning
      // For now, we just verify the command structure
      const result = runPushCommand('components', path.join(testDir, 'components'), true);
      // The command should attempt to run (and fail due to network)
      // but the flag should be accepted
      expect(result.output).not.toContain('--hard flag is only available for');
    });
  });

  describe('Helper functions', () => {
    // These would be unit tests for the helper functions if they were exported
    // For now, we test the behavior through the CLI
  });
});
