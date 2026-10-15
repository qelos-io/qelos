import { describe, expect, it } from 'vitest';
import { buildNewPage, isAddressTaken, pageAddress, validateNewPage } from '../new-page';

const plugins = [{ _id: '1', microFrontends: [{ route: { path: 'Sales' } }, { global: {} }] as any }];

describe('new page', () => {
  it('derives the address from the name and keeps non-latin letters', () => {
    expect(pageAddress('Sales Report!')).toBe('sales-report');
    expect(pageAddress('  דוח מכירות ')).toBe('דוח-מכירות');
    expect(pageAddress('!!!')).toBe('');
  });

  it('finds addresses used by pages or app screens, ignoring case and slashes', () => {
    expect(isAddressTaken('sales', plugins)).toBe(true);
    expect(isAddressTaken('/SALES', plugins)).toBe(true);
    expect(isAddressTaken('other', plugins)).toBe(false);
    expect(isAddressTaken('users', plugins, ['/users/:id'])).toBe(true);
    expect(isAddressTaken('', plugins)).toBe(false);
  });

  it('validates name, address and data', () => {
    const ok = { name: 'Orders', target: 'new', start: 'blank', blueprint: '' } as const;
    expect(validateNewPage(ok, plugins)).toEqual({});
    expect(validateNewPage({ ...ok, name: ' ' }, plugins).name).toBeTruthy();
    expect(validateNewPage({ ...ok, name: '???' }, plugins).address).toBeTruthy();
    expect(validateNewPage({ ...ok, name: 'sales' }, plugins).address).toBeTruthy();
    expect(validateNewPage({ ...ok, start: 'table' }, plugins).blueprint).toBeTruthy();
    expect(validateNewPage({ ...ok, start: 'table', blueprint: 'order' }, plugins)).toEqual({});
  });

  it('builds a template page, never an iframe, with the chosen menu link', () => {
    const page = buildNewPage({ name: 'Orders', link: false });
    expect(page.route).toMatchObject({ path: 'orders', name: 'orders', navBarPosition: false });
    expect(page.use).toBe('plain');
    expect(page.url).toBe('');
    expect(page.structure).toBe('<h1>Orders</h1>');
    expect(buildNewPage({ name: 'A', link: 'top', structure: '<x/>', requirements: [{ key: 'k' } as any] })).toMatchObject({ structure: '<x/>', requirements: [{ key: 'k' }] });
  });
});
