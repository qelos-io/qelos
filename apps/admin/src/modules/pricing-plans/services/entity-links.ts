import type { BillableEntityType } from '@qelos/global-types';
import type { RouteLocationRaw } from 'vue-router';

/** The admin page of a billable account (workspace or user). */
export function entityPageRoute(type: BillableEntityType, id: string): RouteLocationRaw {
  return type === 'workspace'
    ? { name: 'adminEditWorkspace', params: { id } }
    : { name: 'editUser', params: { userId: id } };
}

/** The Subscribers view with that account's subscription open in the drawer. */
export function subscriptionRoute(type: BillableEntityType, id: string): RouteLocationRaw {
  return { name: 'subscribers', query: { open: `${type}:${id}` } };
}
