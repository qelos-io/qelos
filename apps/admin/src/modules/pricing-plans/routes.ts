import EmptyRoute from '@/modules/core/components/layout/EmptyRoute.vue';
import { RouteRecordRaw } from 'vue-router';

export const pricingPlansRoutes: RouteRecordRaw = {
  path: 'admin/pricing-plans',
  component: EmptyRoute,
  redirect: { name: 'pricing-plans' },
  children: [
    {
      path: '',
      name: 'pricing-plans',
      component: async () => (await import('./views/PlansList.vue')).default,
      meta: {
        roles: ['admin'],
        name: 'Pricing Plans',
      },
    },
    {
      path: 'create',
      name: 'createPlan',
      component: async () => (await import('./views/PlanForm.vue')).default,
      meta: { roles: ['admin'] },
    },
    {
      path: ':planId/edit',
      name: 'editPlan',
      component: async () => (await import('./views/PlanForm.vue')).default,
      meta: { roles: ['admin'] },
    },
    {
      path: 'coupons',
      name: 'coupons',
      component: async () => (await import('./views/CouponsList.vue')).default,
      meta: {
        roles: ['admin'],
        name: 'Coupons',
      },
    },
    {
      path: 'coupons/create',
      name: 'createCoupon',
      component: async () => (await import('./views/CouponForm.vue')).default,
      meta: { roles: ['admin'] },
    },
    {
      path: 'coupons/:couponId/edit',
      name: 'editCoupon',
      component: async () => (await import('./views/CouponForm.vue')).default,
      meta: { roles: ['admin'] },
    },
    {
      path: 'configuration',
      name: 'paymentsConfiguration',
      component: async () => (await import('./views/PaymentsConfiguration.vue')).default,
      meta: { roles: ['admin'] },
    },
  ],
};
