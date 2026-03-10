import * as CouponsService from '../coupons-service';
import Coupon from '../../models/coupon';

jest.mock('../../models/coupon');

const MockCoupon = Coupon as any;

describe('coupons-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  function setupDefaultMocks() {
    MockCoupon.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    MockCoupon.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    MockCoupon.findOneAndUpdate = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    MockCoupon.mockImplementation((data) => ({
      ...data,
      _id: 'coupon-1',
      save: jest.fn().mockResolvedValue({ _id: 'coupon-1', ...data }),
    }));
  }

  describe('createCoupon', () => {
    it('should throw INVALID_COUPON_DATA when code is missing', async () => {
      try {
        await CouponsService.createCoupon('tenant-1', { discountType: 'percentage', discountValue: 10 } as any);
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVALID_COUPON_DATA');
      }
    });

    it('should throw INVALID_COUPON_DATA when discountType is missing', async () => {
      try {
        await CouponsService.createCoupon('tenant-1', { code: 'SAVE10', discountValue: 10 } as any);
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVALID_COUPON_DATA');
      }
    });

    it('should throw INVALID_COUPON_DATA when discountValue is missing', async () => {
      try {
        await CouponsService.createCoupon('tenant-1', { code: 'SAVE10', discountType: 'percentage' } as any);
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVALID_COUPON_DATA');
      }
    });

    it('should throw INVALID_COUPON_DATA when percentage > 100', async () => {
      try {
        await CouponsService.createCoupon('tenant-1', {
          code: 'OVER', discountType: 'percentage', discountValue: 150
        });
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVALID_COUPON_DATA');
      }
    });

    it('should throw INVALID_COUPON_DATA when percentage < 0', async () => {
      try {
        await CouponsService.createCoupon('tenant-1', {
          code: 'NEG', discountType: 'percentage', discountValue: -5
        });
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('INVALID_COUPON_DATA');
      }
    });

    it('should allow percentage of exactly 100', async () => {
      const result = await CouponsService.createCoupon('tenant-1', {
        code: 'FREE', discountType: 'percentage', discountValue: 100
      });
      expect(result).toBeDefined();
    });

    it('should throw COUPON_CODE_EXISTS when code already exists', async () => {
      MockCoupon.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: 'existing', code: 'DUPE' }),
        }),
      });

      try {
        await CouponsService.createCoupon('tenant-1', {
          code: 'DUPE', discountType: 'fixed', discountValue: 5
        });
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('COUPON_CODE_EXISTS');
      }
    });

    it('should create coupon with valid data', async () => {
      const result = await CouponsService.createCoupon('tenant-1', {
        code: 'SAVE20', discountType: 'percentage', discountValue: 20
      });
      expect(result).toBeDefined();
      expect(result._id).toBe('coupon-1');
    });
  });

  describe('validateCoupon', () => {
    it('should throw COUPON_NOT_FOUND when coupon does not exist', async () => {
      try {
        await CouponsService.validateCoupon('tenant-1', 'NONEXISTENT');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('COUPON_NOT_FOUND');
      }
    });

    it('should throw COUPON_NOT_YET_VALID when validFrom is in the future', async () => {
      const future = new Date(Date.now() + 86400000);
      MockCoupon.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'c1', code: 'FUTURE', isActive: true,
            validFrom: future, validUntil: null,
            maxRedemptions: null, currentRedemptions: 0,
            applicablePlanIds: [],
          }),
        }),
      });

      try {
        await CouponsService.validateCoupon('tenant-1', 'FUTURE');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('COUPON_NOT_YET_VALID');
      }
    });

    it('should throw COUPON_EXPIRED when validUntil is in the past', async () => {
      const past = new Date(Date.now() - 86400000);
      MockCoupon.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'c1', code: 'EXPIRED', isActive: true,
            validFrom: null, validUntil: past,
            maxRedemptions: null, currentRedemptions: 0,
            applicablePlanIds: [],
          }),
        }),
      });

      try {
        await CouponsService.validateCoupon('tenant-1', 'EXPIRED');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('COUPON_EXPIRED');
      }
    });

    it('should throw COUPON_MAX_REDEMPTIONS when limit reached', async () => {
      MockCoupon.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'c1', code: 'MAXED', isActive: true,
            validFrom: null, validUntil: null,
            maxRedemptions: 5, currentRedemptions: 5,
            applicablePlanIds: [],
          }),
        }),
      });

      try {
        await CouponsService.validateCoupon('tenant-1', 'MAXED');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('COUPON_MAX_REDEMPTIONS');
      }
    });

    it('should throw COUPON_NOT_APPLICABLE when plan not in applicablePlanIds', async () => {
      MockCoupon.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'c1', code: 'PLANONLY', isActive: true,
            validFrom: null, validUntil: null,
            maxRedemptions: null, currentRedemptions: 0,
            applicablePlanIds: [{ toString: () => 'plan-A' }, { toString: () => 'plan-B' }],
          }),
        }),
      });

      try {
        await CouponsService.validateCoupon('tenant-1', 'PLANONLY', 'plan-C');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('COUPON_NOT_APPLICABLE');
      }
    });

    it('should pass when plan is in applicablePlanIds', async () => {
      const couponData = {
        _id: 'c1', code: 'PLANONLY', isActive: true,
        validFrom: null, validUntil: null,
        maxRedemptions: null, currentRedemptions: 0,
        applicablePlanIds: [{ toString: () => 'plan-A' }],
      };
      MockCoupon.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(couponData),
        }),
      });

      const result = await CouponsService.validateCoupon('tenant-1', 'PLANONLY', 'plan-A');
      expect(result.code).toBe('PLANONLY');
    });

    it('should pass when applicablePlanIds is empty (applies to all plans)', async () => {
      const couponData = {
        _id: 'c1', code: 'ALL', isActive: true,
        validFrom: null, validUntil: null,
        maxRedemptions: null, currentRedemptions: 0,
        applicablePlanIds: [],
      };
      MockCoupon.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(couponData),
        }),
      });

      const result = await CouponsService.validateCoupon('tenant-1', 'ALL', 'any-plan');
      expect(result.code).toBe('ALL');
    });

    it('should pass when no planId is provided', async () => {
      const couponData = {
        _id: 'c1', code: 'VALID', isActive: true,
        validFrom: null, validUntil: null,
        maxRedemptions: 10, currentRedemptions: 3,
        applicablePlanIds: [{ toString: () => 'plan-A' }],
      };
      MockCoupon.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(couponData),
        }),
      });

      const result = await CouponsService.validateCoupon('tenant-1', 'VALID');
      expect(result.code).toBe('VALID');
    });
  });

  describe('redeemCoupon', () => {
    it('should throw COUPON_NOT_FOUND when coupon does not exist', async () => {
      try {
        await CouponsService.redeemCoupon('tenant-1', 'nonexistent');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('COUPON_NOT_FOUND');
      }
    });

    it('should increment currentRedemptions', async () => {
      const redeemed = { _id: 'c1', currentRedemptions: 4 };
      MockCoupon.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(redeemed),
        }),
      });

      const result = await CouponsService.redeemCoupon('tenant-1', 'c1');
      expect(result.currentRedemptions).toBe(4);
      expect(MockCoupon.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'c1', tenant: 'tenant-1', isActive: true },
        { $inc: { currentRedemptions: 1 } },
        { new: true }
      );
    });
  });

  describe('deactivateCoupon', () => {
    it('should throw COUPON_NOT_FOUND when coupon does not exist', async () => {
      try {
        await CouponsService.deactivateCoupon('tenant-1', 'nonexistent');
        fail('should have thrown');
      } catch (e: any) {
        expect(e.code).toBe('COUPON_NOT_FOUND');
      }
    });

    it('should set isActive to false', async () => {
      const deactivated = { _id: 'c1', isActive: false };
      MockCoupon.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(deactivated),
        }),
      });

      const result = await CouponsService.deactivateCoupon('tenant-1', 'c1');
      expect(result.isActive).toBe(false);
    });
  });
});
