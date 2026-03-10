import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

const saveMock = mock.fn(async function (this: any) { return this; });

const findMock = mock.fn(() => ({
  sort: mock.fn(() => ({
    lean: mock.fn(() => ({
      exec: mock.fn(async () => []),
    })),
  })),
}));

const findOneMock = mock.fn(() => ({
  lean: mock.fn(() => ({
    exec: mock.fn(async () => null),
  })),
}));

const findOneAndUpdateMock = mock.fn(() => ({
  lean: mock.fn(() => ({
    exec: mock.fn(async () => null),
  })),
}));

function CouponConstructor(data: any) {
  return { ...data, _id: data._id || 'coupon-1', save: saveMock.bind({ ...data, _id: data._id || 'coupon-1' }) };
}
Object.assign(CouponConstructor, { find: findMock, findOne: findOneMock, findOneAndUpdate: findOneAndUpdateMock });

mock.module('../../models/coupon', { defaultExport: CouponConstructor });

describe('coupons-service', async () => {
  const CouponsService = await import('../coupons-service');

  beforeEach(() => {
    findMock.mock.resetCalls();
    findOneMock.mock.resetCalls();
    findOneAndUpdateMock.mock.resetCalls();
    saveMock.mock.resetCalls();

    findOneMock.mock.mockImplementation(() => ({
      lean: mock.fn(() => ({
        exec: mock.fn(async () => null),
      })),
    }));

    findOneAndUpdateMock.mock.mockImplementation(() => ({
      lean: mock.fn(() => ({
        exec: mock.fn(async () => null),
      })),
    }));
  });

  describe('createCoupon', () => {
    it('should throw INVALID_COUPON_DATA when code is missing', async () => {
      await assert.rejects(() => CouponsService.createCoupon('tenant-1', { discountType: 'percentage', discountValue: 10 } as any), (e: any) => {
        assert.strictEqual(e.code, 'INVALID_COUPON_DATA');
        return true;
      });
    });

    it('should throw INVALID_COUPON_DATA when discountType is missing', async () => {
      await assert.rejects(() => CouponsService.createCoupon('tenant-1', { code: 'SAVE10', discountValue: 10 } as any), (e: any) => {
        assert.strictEqual(e.code, 'INVALID_COUPON_DATA');
        return true;
      });
    });

    it('should throw INVALID_COUPON_DATA when discountValue is missing', async () => {
      await assert.rejects(() => CouponsService.createCoupon('tenant-1', { code: 'SAVE10', discountType: 'percentage' } as any), (e: any) => {
        assert.strictEqual(e.code, 'INVALID_COUPON_DATA');
        return true;
      });
    });

    it('should throw INVALID_COUPON_DATA when percentage > 100', async () => {
      await assert.rejects(() => CouponsService.createCoupon('tenant-1', {
        code: 'OVER', discountType: 'percentage', discountValue: 150,
      }), (e: any) => {
        assert.strictEqual(e.code, 'INVALID_COUPON_DATA');
        return true;
      });
    });

    it('should throw INVALID_COUPON_DATA when percentage < 0', async () => {
      await assert.rejects(() => CouponsService.createCoupon('tenant-1', {
        code: 'NEG', discountType: 'percentage', discountValue: -5,
      }), (e: any) => {
        assert.strictEqual(e.code, 'INVALID_COUPON_DATA');
        return true;
      });
    });

    it('should allow percentage of exactly 100', async () => {
      const result = await CouponsService.createCoupon('tenant-1', {
        code: 'FREE', discountType: 'percentage', discountValue: 100,
      });
      assert.ok(result);
    });

    it('should throw COUPON_CODE_EXISTS when code already exists', async () => {
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({ _id: 'existing', code: 'DUPE' })),
        })),
      }));

      await assert.rejects(() => CouponsService.createCoupon('tenant-1', {
        code: 'DUPE', discountType: 'fixed', discountValue: 5,
      }), (e: any) => {
        assert.strictEqual(e.code, 'COUPON_CODE_EXISTS');
        return true;
      });
    });

    it('should create coupon with valid data', async () => {
      const result = await CouponsService.createCoupon('tenant-1', {
        code: 'SAVE20', discountType: 'percentage', discountValue: 20,
      });
      assert.ok(result);
      assert.strictEqual(result._id, 'coupon-1');
    });
  });

  describe('validateCoupon', () => {
    it('should throw COUPON_NOT_FOUND when coupon does not exist', async () => {
      await assert.rejects(() => CouponsService.validateCoupon('tenant-1', 'NONEXISTENT'), (e: any) => {
        assert.strictEqual(e.code, 'COUPON_NOT_FOUND');
        return true;
      });
    });

    it('should throw COUPON_NOT_YET_VALID when validFrom is in the future', async () => {
      const future = new Date(Date.now() + 86400000);
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({
            _id: 'c1', code: 'FUTURE', isActive: true,
            validFrom: future, validUntil: null,
            maxRedemptions: null, currentRedemptions: 0,
            applicablePlanIds: [],
          })),
        })),
      }));

      await assert.rejects(() => CouponsService.validateCoupon('tenant-1', 'FUTURE'), (e: any) => {
        assert.strictEqual(e.code, 'COUPON_NOT_YET_VALID');
        return true;
      });
    });

    it('should throw COUPON_EXPIRED when validUntil is in the past', async () => {
      const past = new Date(Date.now() - 86400000);
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({
            _id: 'c1', code: 'EXPIRED', isActive: true,
            validFrom: null, validUntil: past,
            maxRedemptions: null, currentRedemptions: 0,
            applicablePlanIds: [],
          })),
        })),
      }));

      await assert.rejects(() => CouponsService.validateCoupon('tenant-1', 'EXPIRED'), (e: any) => {
        assert.strictEqual(e.code, 'COUPON_EXPIRED');
        return true;
      });
    });

    it('should throw COUPON_MAX_REDEMPTIONS when limit reached', async () => {
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({
            _id: 'c1', code: 'MAXED', isActive: true,
            validFrom: null, validUntil: null,
            maxRedemptions: 5, currentRedemptions: 5,
            applicablePlanIds: [],
          })),
        })),
      }));

      await assert.rejects(() => CouponsService.validateCoupon('tenant-1', 'MAXED'), (e: any) => {
        assert.strictEqual(e.code, 'COUPON_MAX_REDEMPTIONS');
        return true;
      });
    });

    it('should throw COUPON_NOT_APPLICABLE when plan not in applicablePlanIds', async () => {
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({
            _id: 'c1', code: 'PLANONLY', isActive: true,
            validFrom: null, validUntil: null,
            maxRedemptions: null, currentRedemptions: 0,
            applicablePlanIds: [{ toString: () => 'plan-A' }, { toString: () => 'plan-B' }],
          })),
        })),
      }));

      await assert.rejects(() => CouponsService.validateCoupon('tenant-1', 'PLANONLY', 'plan-C'), (e: any) => {
        assert.strictEqual(e.code, 'COUPON_NOT_APPLICABLE');
        return true;
      });
    });

    it('should pass when plan is in applicablePlanIds', async () => {
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({
            _id: 'c1', code: 'PLANONLY', isActive: true,
            validFrom: null, validUntil: null,
            maxRedemptions: null, currentRedemptions: 0,
            applicablePlanIds: [{ toString: () => 'plan-A' }],
          })),
        })),
      }));

      const result = await CouponsService.validateCoupon('tenant-1', 'PLANONLY', 'plan-A');
      assert.strictEqual(result.code, 'PLANONLY');
    });

    it('should pass when applicablePlanIds is empty (applies to all plans)', async () => {
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({
            _id: 'c1', code: 'ALL', isActive: true,
            validFrom: null, validUntil: null,
            maxRedemptions: null, currentRedemptions: 0,
            applicablePlanIds: [],
          })),
        })),
      }));

      const result = await CouponsService.validateCoupon('tenant-1', 'ALL', 'any-plan');
      assert.strictEqual(result.code, 'ALL');
    });

    it('should pass when no planId is provided', async () => {
      findOneMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => ({
            _id: 'c1', code: 'VALID', isActive: true,
            validFrom: null, validUntil: null,
            maxRedemptions: 10, currentRedemptions: 3,
            applicablePlanIds: [{ toString: () => 'plan-A' }],
          })),
        })),
      }));

      const result = await CouponsService.validateCoupon('tenant-1', 'VALID');
      assert.strictEqual(result.code, 'VALID');
    });
  });

  describe('redeemCoupon', () => {
    it('should throw COUPON_NOT_FOUND when coupon does not exist', async () => {
      await assert.rejects(() => CouponsService.redeemCoupon('tenant-1', 'nonexistent'), (e: any) => {
        assert.strictEqual(e.code, 'COUPON_NOT_FOUND');
        return true;
      });
    });

    it('should increment currentRedemptions', async () => {
      const redeemed = { _id: 'c1', currentRedemptions: 4 };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => redeemed),
        })),
      }));

      const result = await CouponsService.redeemCoupon('tenant-1', 'c1');
      assert.strictEqual(result.currentRedemptions, 4);
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[0], { _id: 'c1', tenant: 'tenant-1', isActive: true });
      assert.deepStrictEqual(findOneAndUpdateMock.mock.calls[0].arguments[1], { $inc: { currentRedemptions: 1 } });
    });
  });

  describe('deactivateCoupon', () => {
    it('should throw COUPON_NOT_FOUND when coupon does not exist', async () => {
      await assert.rejects(() => CouponsService.deactivateCoupon('tenant-1', 'nonexistent'), (e: any) => {
        assert.strictEqual(e.code, 'COUPON_NOT_FOUND');
        return true;
      });
    });

    it('should set isActive to false', async () => {
      const deactivated = { _id: 'c1', isActive: false };
      findOneAndUpdateMock.mock.mockImplementationOnce(() => ({
        lean: mock.fn(() => ({
          exec: mock.fn(async () => deactivated),
        })),
      }));

      const result = await CouponsService.deactivateCoupon('tenant-1', 'c1');
      assert.strictEqual(result.isActive, false);
    });
  });
});
