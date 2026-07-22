import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizePlan, sanitizePlans } from '../plan-serializer';

describe('plan-serializer', () => {
  describe('sanitizePlan', () => {
    it('should remove __v from plain plan objects', () => {
      const plan = { _id: 'plan-1', name: 'Basic', __v: 3 };
      assert.deepStrictEqual(sanitizePlan(plan), { _id: 'plan-1', name: 'Basic' });
    });

    it('should remove __v from mongoose-like documents', () => {
      const plan = {
        _id: 'plan-1',
        name: 'Basic',
        __v: 1,
        toObject() {
          return { _id: this._id, name: this.name, __v: this.__v };
        },
      };

      assert.deepStrictEqual(sanitizePlan(plan), { _id: 'plan-1', name: 'Basic' });
    });

    it('should return nullish values unchanged', () => {
      assert.strictEqual(sanitizePlan(null), null);
      assert.strictEqual(sanitizePlan(undefined), undefined);
    });
  });

  describe('sanitizePlans', () => {
    it('should sanitize every plan in the list', () => {
      const plans = [
        { _id: 'plan-1', name: 'Basic', __v: 0 },
        { _id: 'plan-2', name: 'Pro', __v: 2 },
      ];

      assert.deepStrictEqual(sanitizePlans(plans), [
        { _id: 'plan-1', name: 'Basic' },
        { _id: 'plan-2', name: 'Pro' },
      ]);
    });
  });
});
