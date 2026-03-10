import { getRouter } from '@qelos/api-kit';
import populateUser from '../middleware/populate-user';
import { onlyAuthenticated, onlyPrivileged } from '../middleware/auth-check';
import { getCoupons, getCoupon, createCoupon, updateCoupon, deleteCoupon, validateCoupon } from '../controllers/coupons';

const router = getRouter();

router
  .post('/api/coupons/validate', populateUser, onlyAuthenticated, validateCoupon)
  .get('/api/coupons', populateUser, onlyPrivileged, getCoupons)
  .get('/api/coupons/:couponId', populateUser, onlyPrivileged, getCoupon)
  .post('/api/coupons', populateUser, onlyPrivileged, createCoupon)
  .put('/api/coupons/:couponId', populateUser, onlyPrivileged, updateCoupon)
  .delete('/api/coupons/:couponId', populateUser, onlyPrivileged, deleteCoupon);

export default router;
