import { Response } from 'express';
import * as CouponsService from '../services/coupons-service';

export async function getCoupons(req, res: Response) {
  try {
    const filters: any = {};
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }
    const coupons = await CouponsService.listCoupons(req.headers.tenant, filters);
    res.status(200).json(coupons).end();
  } catch (e) {
    res.status(500).json({ message: 'failed to load coupons' }).end();
  }
}

export async function getCoupon(req, res: Response) {
  try {
    const coupon = await CouponsService.getCouponById(req.headers.tenant, req.params.couponId);
    res.status(200).json(coupon).end();
  } catch (e: any) {
    const status = e?.code === 'COUPON_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ message: e?.message || 'failed to load coupon' }).end();
  }
}

export async function createCoupon(req, res: Response) {
  try {
    const coupon = await CouponsService.createCoupon(req.headers.tenant, req.body);
    res.status(200).json(coupon).end();
  } catch (e: any) {
    const status = ['INVALID_COUPON_DATA', 'COUPON_CODE_EXISTS'].includes(e?.code) ? 400 : 500;
    res.status(status).json({ message: e?.message || 'failed to create coupon' }).end();
  }
}

export async function updateCoupon(req, res: Response) {
  try {
    const coupon = await CouponsService.updateCoupon(req.headers.tenant, req.params.couponId, req.body);
    res.status(200).json(coupon).end();
  } catch (e: any) {
    const status = e?.code === 'COUPON_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ message: e?.message || 'failed to update coupon' }).end();
  }
}

export async function deleteCoupon(req, res: Response) {
  try {
    const coupon = await CouponsService.deactivateCoupon(req.headers.tenant, req.params.couponId);
    res.status(200).json(coupon).end();
  } catch (e: any) {
    const status = e?.code === 'COUPON_NOT_FOUND' ? 404 : 500;
    res.status(status).json({ message: e?.message || 'failed to deactivate coupon' }).end();
  }
}

export async function validateCoupon(req, res: Response) {
  try {
    const { code, planId } = req.body;
    if (!code) {
      res.status(400).json({ message: 'coupon code is required' }).end();
      return;
    }
    const coupon = await CouponsService.validateCoupon(req.headers.tenant, code, planId);
    res.status(200).json(coupon).end();
  } catch (e: any) {
    const status = e?.code?.startsWith('COUPON_') ? 400 : 500;
    res.status(status).json({ code: e?.code, message: e?.message || 'coupon validation failed' }).end();
  }
}
