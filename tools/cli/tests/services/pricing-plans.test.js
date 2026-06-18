const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

async function loadPricingPlansModule() {
  const modulePath = path.join(__dirname, '..', '..', 'services', 'resources', 'pricing-plans.mjs');
  return import(pathToFileURL(modulePath).href);
}

function makeSdk(overrides = {}) {
  return {
    managePayments: {
      getPlans: async () => [],
      getPlan: async (id) => ({ _id: id, name: 'Test Plan' }),
      createPlan: async (data) => ({ _id: 'new-id', ...data }),
      updatePlan: async (id, data) => ({ _id: id, ...data }),
      deletePlan: async () => {},
      ...overrides,
    },
  };
}

describe('pricing-plans service', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qelos-pricing-plans-'));
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('pullPricingPlans', () => {
    it('creates the target directory if it does not exist', async () => {
      const { pullPricingPlans } = await loadPricingPlansModule();
      const targetDir = path.join(tmpDir, 'pricing-plans');
      const sdk = makeSdk({ getPlans: async () => [] });

      await pullPricingPlans(sdk, targetDir);

      assert.ok(fs.existsSync(targetDir), 'target directory should be created');
    });

    it('writes one .pricing-plan.json file per plan', async () => {
      const { pullPricingPlans } = await loadPricingPlansModule();
      const sdk = makeSdk({
        getPlans: async () => [
          { _id: 'id1', name: 'Starter' },
          { _id: 'id2', name: 'Pro' },
        ],
        getPlan: async (id) => {
          const plans = {
            id1: { _id: 'id1', name: 'Starter', monthlyPrice: 9, tenant: 't1', created: '2024-01-01' },
            id2: { _id: 'id2', name: 'Pro', monthlyPrice: 29, tenant: 't1', created: '2024-01-01' },
          };
          return plans[id];
        },
      });

      await pullPricingPlans(sdk, tmpDir);

      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.pricing-plan.json'));
      assert.strictEqual(files.length, 2);
    });

    it('slugifies the plan name for the file name', async () => {
      const { pullPricingPlans } = await loadPricingPlansModule();
      const sdk = makeSdk({
        getPlans: async () => [{ _id: 'id1', name: 'Enterprise Plus!' }],
        getPlan: async () => ({ _id: 'id1', name: 'Enterprise Plus!' }),
      });

      await pullPricingPlans(sdk, tmpDir);

      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.pricing-plan.json'));
      assert.strictEqual(files[0], 'enterprise-plus.pricing-plan.json');
    });

    it('strips server-only fields (tenant, created) from pulled files', async () => {
      const { pullPricingPlans } = await loadPricingPlansModule();
      const sdk = makeSdk({
        getPlans: async () => [{ _id: 'id1', name: 'Basic' }],
        getPlan: async () => ({
          _id: 'id1',
          name: 'Basic',
          monthlyPrice: 5,
          tenant: 'tenant-abc',
          created: '2024-01-01T00:00:00Z',
        }),
      });

      await pullPricingPlans(sdk, tmpDir);

      const file = path.join(tmpDir, 'basic.pricing-plan.json');
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      assert.ok(!('tenant' in data), 'tenant field should be stripped');
      assert.ok(!('created' in data), 'created field should be stripped');
      assert.strictEqual(data.name, 'Basic');
      assert.strictEqual(data.monthlyPrice, 5);
    });

    it('handles name collisions by appending a counter suffix', async () => {
      const { pullPricingPlans } = await loadPricingPlansModule();
      const sdk = makeSdk({
        getPlans: async () => [
          { _id: 'id1', name: 'Pro' },
          { _id: 'id2', name: 'Pro' },
        ],
        getPlan: async (id) => ({ _id: id, name: 'Pro' }),
      });

      await pullPricingPlans(sdk, tmpDir);

      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.pricing-plan.json'));
      assert.strictEqual(files.length, 2);
      assert.ok(files.includes('pro.pricing-plan.json'));
      // second file gets a suffix
      const second = files.find((f) => f !== 'pro.pricing-plan.json');
      assert.ok(second, 'second plan with same name should have a different file name');
    });

    it('uses _id as fallback file name when name is missing', async () => {
      const { pullPricingPlans } = await loadPricingPlansModule();
      const sdk = makeSdk({
        getPlans: async () => [{ _id: 'abc123' }],
        getPlan: async () => ({ _id: 'abc123' }),
      });

      await pullPricingPlans(sdk, tmpDir);

      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.pricing-plan.json'));
      assert.strictEqual(files[0], 'abc123.pricing-plan.json');
    });

    it('does nothing when no plans exist on the remote', async () => {
      const { pullPricingPlans } = await loadPricingPlansModule();
      const sdk = makeSdk({ getPlans: async () => [] });

      await pullPricingPlans(sdk, tmpDir);

      const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.pricing-plan.json'));
      assert.strictEqual(files.length, 0);
    });

    it('throws when getPlans fails', async () => {
      const { pullPricingPlans } = await loadPricingPlansModule();
      const sdk = makeSdk({
        getPlans: async () => {
          throw new Error('network error');
        },
      });

      await assert.rejects(() => pullPricingPlans(sdk, tmpDir), /network error/);
    });
  });

  describe('pushPricingPlans', () => {
    it('calls updatePlan for a file that contains _id', async () => {
      const { pushPricingPlans } = await loadPricingPlansModule();
      const updated = [];
      const sdk = makeSdk({
        updatePlan: async (id, data) => {
          updated.push({ id, data });
        },
      });

      fs.writeFileSync(
        path.join(tmpDir, 'pro.pricing-plan.json'),
        JSON.stringify({ _id: 'plan-id-1', name: 'Pro', monthlyPrice: 29 }),
        'utf-8',
      );

      await pushPricingPlans(sdk, tmpDir);

      assert.strictEqual(updated.length, 1);
      assert.strictEqual(updated[0].id, 'plan-id-1');
      assert.strictEqual(updated[0].data.name, 'Pro');
      assert.ok(!('_id' in updated[0].data), '_id should not be in the payload');
    });

    it('calls createPlan for a file without _id', async () => {
      const { pushPricingPlans } = await loadPricingPlansModule();
      const created = [];
      const sdk = makeSdk({
        createPlan: async (data) => {
          created.push(data);
          return { _id: 'new-id', ...data };
        },
      });

      fs.writeFileSync(
        path.join(tmpDir, 'starter.pricing-plan.json'),
        JSON.stringify({ name: 'Starter', monthlyPrice: 9 }),
        'utf-8',
      );

      await pushPricingPlans(sdk, tmpDir);

      assert.strictEqual(created.length, 1);
      assert.strictEqual(created[0].name, 'Starter');
    });

    it('strips server-only fields (tenant, created) before pushing', async () => {
      const { pushPricingPlans } = await loadPricingPlansModule();
      const payloads = [];
      const sdk = makeSdk({
        updatePlan: async (id, data) => {
          payloads.push(data);
        },
      });

      fs.writeFileSync(
        path.join(tmpDir, 'pro.pricing-plan.json'),
        JSON.stringify({ _id: 'id1', name: 'Pro', tenant: 'should-be-removed', created: '2024-01-01' }),
        'utf-8',
      );

      await pushPricingPlans(sdk, tmpDir);

      assert.ok(!('tenant' in payloads[0]), 'tenant should be stripped');
      assert.ok(!('created' in payloads[0]), 'created should be stripped');
    });

    it('pushes only the targetFile when the option is set', async () => {
      const { pushPricingPlans } = await loadPricingPlansModule();
      const pushed = [];
      const sdk = makeSdk({
        updatePlan: async (id, data) => pushed.push(data.name),
      });

      fs.writeFileSync(
        path.join(tmpDir, 'plan-a.pricing-plan.json'),
        JSON.stringify({ _id: 'a', name: 'Plan A' }),
        'utf-8',
      );
      fs.writeFileSync(
        path.join(tmpDir, 'plan-b.pricing-plan.json'),
        JSON.stringify({ _id: 'b', name: 'Plan B' }),
        'utf-8',
      );

      await pushPricingPlans(sdk, tmpDir, { targetFile: 'plan-a.pricing-plan.json' });

      assert.deepStrictEqual(pushed, ['Plan A']);
    });

    it('throws when a plan file is missing the name field', async () => {
      const { pushPricingPlans } = await loadPricingPlansModule();
      const sdk = makeSdk();

      fs.writeFileSync(
        path.join(tmpDir, 'broken.pricing-plan.json'),
        JSON.stringify({ _id: 'id1', monthlyPrice: 9 }),
        'utf-8',
      );

      await assert.rejects(
        () => pushPricingPlans(sdk, tmpDir),
        /Failed to push 1 pricing plan/,
      );
    });

    it('throws a summary error when one or more pushes fail', async () => {
      const { pushPricingPlans } = await loadPricingPlansModule();
      const sdk = makeSdk({
        updatePlan: async () => {
          throw new Error('server error');
        },
      });

      fs.writeFileSync(
        path.join(tmpDir, 'pro.pricing-plan.json'),
        JSON.stringify({ _id: 'id1', name: 'Pro' }),
        'utf-8',
      );

      await assert.rejects(
        () => pushPricingPlans(sdk, tmpDir),
        /Failed to push 1 pricing plan/,
      );
    });

    it('does nothing when there are no .pricing-plan.json files', async () => {
      const { pushPricingPlans } = await loadPricingPlansModule();
      const sdk = makeSdk();

      fs.writeFileSync(path.join(tmpDir, 'readme.txt'), 'not a plan');

      await pushPricingPlans(sdk, tmpDir); // should not throw
    });

    it('pushes multiple plans in parallel and succeeds when all succeed', async () => {
      const { pushPricingPlans } = await loadPricingPlansModule();
      const updated = [];
      const sdk = makeSdk({
        updatePlan: async (id) => updated.push(id),
      });

      for (const [slug, id, name] of [['starter', 'id1', 'Starter'], ['pro', 'id2', 'Pro'], ['enterprise', 'id3', 'Enterprise']]) {
        fs.writeFileSync(
          path.join(tmpDir, `${slug}.pricing-plan.json`),
          JSON.stringify({ _id: id, name }),
          'utf-8',
        );
      }

      await pushPricingPlans(sdk, tmpDir);

      assert.strictEqual(updated.length, 3);
    });
  });
});
