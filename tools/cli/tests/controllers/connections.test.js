const { describe, it, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const controllerUrl = pathToFileURL(
  path.join(__dirname, '..', '..', 'controllers', 'connections.mjs')
).href;
const loggerUrl = pathToFileURL(
  path.join(__dirname, '..', '..', 'services', 'utils', 'logger.mjs')
).href;

describe('connections controller', () => {
  let colorizeStatus;
  let resolveStatus;
  let printTable;
  let green;
  let red;
  let yellow;

  before(async () => {
    ({ colorizeStatus, resolveStatus, printTable } = await import(controllerUrl));
    ({ green, red, yellow } = await import(loggerUrl));
  });

  describe('colorizeStatus', () => {
    it('wraps "connected" in green', () => {
      assert.strictEqual(colorizeStatus('connected'), green('connected'));
    });

    it('wraps "failed" in red', () => {
      assert.strictEqual(colorizeStatus('failed'), red('failed'));
    });

    it('wraps "unsupported" in yellow', () => {
      assert.strictEqual(colorizeStatus('unsupported'), yellow('unsupported'));
    });

    it('leaves unknown statuses (e.g. an error message) uncolored', () => {
      const status = 'error: Missing API key';
      assert.strictEqual(colorizeStatus(status), status);
    });
  });

  describe('resolveStatus', () => {
    it('returns the status from a successful check', async () => {
      const sdk = { integrationSources: { checkStatus: async () => ({ status: 'connected' }) } };
      const status = await resolveStatus(sdk, { _id: 'src-1' });
      assert.strictEqual(status, 'connected');
    });

    it('returns "unknown" when the result has no status field', async () => {
      const sdk = { integrationSources: { checkStatus: async () => ({}) } };
      const status = await resolveStatus(sdk, { _id: 'src-1' });
      assert.strictEqual(status, 'unknown');
    });

    it('passes the source id to checkStatus', async () => {
      let receivedId;
      const sdk = {
        integrationSources: {
          checkStatus: async (id) => {
            receivedId = id;
            return { status: 'connected' };
          },
        },
      };
      await resolveStatus(sdk, { _id: 'src-42' });
      assert.strictEqual(receivedId, 'src-42');
    });

    it('returns an "error: <message>" status when checkStatus rejects with a response body message', async () => {
      const sdk = {
        integrationSources: {
          checkStatus: async () => {
            const error = new Error('Request failed with status 400');
            error.response = { data: { message: 'Missing API key or Company ID for Sumit integration' } };
            throw error;
          },
        },
      };
      const status = await resolveStatus(sdk, { _id: 'src-1' });
      assert.strictEqual(status, 'error: Missing API key or Company ID for Sumit integration');
    });

    it('falls back to error.message when there is no response body', async () => {
      const sdk = {
        integrationSources: {
          checkStatus: async () => {
            throw new Error('Network request failed');
          },
        },
      };
      const status = await resolveStatus(sdk, { _id: 'src-1' });
      assert.strictEqual(status, 'error: Network request failed');
    });
  });

  describe('printTable', () => {
    let logs;
    let originalConsoleLog;

    beforeEach(() => {
      logs = [];
      originalConsoleLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it('prints a header row, a separator row, and one row per connection', () => {
      printTable([
        { id: '1', name: 'Prod Sumit', kind: 'sumit', status: 'connected' },
        { id: '2', name: 'Legacy PayPal', kind: 'paypal', status: 'failed' },
      ]);

      assert.strictEqual(logs.length, 4);
      assert.match(logs[0], /^ID\s+NAME\s+KIND\s+STATUS\s*$/);
      assert.match(logs[1], /^-+\s+-+\s+-+\s+-+$/);
    });

    it('colorizes the status column without breaking column alignment', () => {
      printTable([
        { id: '1', name: 'Prod Sumit', kind: 'sumit', status: 'connected' },
        { id: '2', name: 'Legacy PayPal', kind: 'paypal', status: 'failed' },
      ]);

      const dataRows = logs.slice(2);
      assert.ok(dataRows[0].includes(green('connected')));
      const expectedPadding = ' '.repeat('connected'.length - 'failed'.length);
      assert.ok(
        dataRows[1].includes(red('failed') + expectedPadding),
        'shorter status should be colored on its own text, then padded to the widest status in the table',
      );
    });

    it('widens the status column to fit a long error message and keeps other rows aligned', () => {
      printTable([
        { id: '1', name: 'Prod Sumit', kind: 'sumit', status: 'connected' },
        { id: '2', name: 'Broken AWS', kind: 'aws', status: 'error: Missing region, access key ID or secret access key' },
      ]);

      // eslint-disable-next-line no-control-regex
      const stripAnsi = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');
      const plainLines = logs.map(stripAnsi);
      const headerLength = plainLines[0].length;

      for (const line of plainLines) {
        assert.strictEqual(line.length, headerLength, `line "${line}" should match header width`);
      }
    });

    it('renders nothing but does not throw when given an empty row list', () => {
      printTable([]);
      assert.strictEqual(logs.length, 2);
    });
  });
});
