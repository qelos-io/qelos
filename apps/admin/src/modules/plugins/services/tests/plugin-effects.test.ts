import { describe, expect, it } from 'vitest';
import {
  canEditLive,
  collectNavGroups,
  mfeKind,
  mfeLiveEditHref,
  mfePageHref,
  mfeSource,
  newMicroFrontend,
  switchMfeKind,
  summarizePlugin,
} from '../plugin-effects';

describe('summarizePlugin', () => {
  it('reports a plugin without effects', () => {
    const s = summarizePlugin({ microFrontends: [], subscribedEvents: [] });
    expect(s.doesNothing).toBe(true);
    expect(s.total).toBe(0);
  });

  it('counts pages, components, modals and injectables under the UI section', () => {
    const s = summarizePlugin({
      microFrontends: [
        { route: { path: 'a' } },
        { route: { path: 'b' } },
        { global: { position: 'x' } },
        { modal: { name: 'm' } },
      ] as any,
      injectables: [{}] as any,
    });
    expect(s.pages).toBe(2);
    expect(s.components).toBe(1);
    expect(s.modals).toBe(1);
    expect(s.sections.ui).toBe(5);
    expect(s.doesNothing).toBe(false);
  });

  it('treats a proxy only when both api path and proxy url exist', () => {
    expect(summarizePlugin({ apiPath: 'x' }).proxy).toBe(false);
    const s = summarizePlugin({ apiPath: 'x', proxyUrl: 'https://a.b', cruds: [{}, {}] as any });
    expect(s.proxy).toBe(true);
    expect(s.sections.endpoints).toBe(3);
  });

  it('counts events and does not count the manifest as an effect', () => {
    const s = summarizePlugin({ manifestUrl: 'https://a.b/m.json', subscribedEvents: [{}] as any });
    expect(s.sections.events).toBe(1);
    expect(s.sections.connection).toBe(1);
    expect(s.total).toBe(1);
  });
});

describe('micro frontend helpers', () => {
  it('detects the kind', () => {
    expect(mfeKind({ route: {} as any })).toBe('page');
    expect(mfeKind({ modal: { name: 'm' } as any })).toBe('modal');
    expect(mfeKind({ global: { position: 'top' } as any })).toBe('component');
    expect(mfeKind({})).toBe('unplaced');
    expect(mfeKind({ route: {} as any, modal: {} as any, global: {} as any })).toBe('page');
    expect(mfeKind({ route: {} as any, modal: { name: 'm' } as any })).toBe('modal');
  });

  it('detects the source and ignores the "-" placeholder url', () => {
    expect(mfeSource({ url: 'https://x.y' })).toBe('url');
    expect(mfeSource({ url: '-', use: 'plain' })).toBe('template');
    expect(mfeSource({})).toBe('none');
  });

  it('builds the page and live edit hrefs', () => {
    expect(mfePageHref({ route: { path: 'todos' } as any })).toBe('/todos');
    expect(mfePageHref({ route: { path: '/todos' } as any })).toBe('/todos');
    expect(mfePageHref({})).toBeUndefined();
    expect(mfeLiveEditHref({ route: { path: 'todos' } as any })).toBe('/todos');
    expect(mfeLiveEditHref({ guest: true, route: { path: 'todos' } as any })).toBe('/screen-editor/todos');
  });

  it('allows live editing only for template pages', () => {
    expect(canEditLive({ route: {} as any, use: 'plain' })).toBe(true);
    expect(canEditLive({ route: {} as any, url: 'https://x.y' })).toBe(false);
    expect(canEditLive({ modal: {} as any, use: 'plain' })).toBe(false);
  });

  it('creates new micro frontends with a slug', () => {
    const page = newMicroFrontend('page', 'My Page!');
    expect(page.route?.path).toBe('my-page');
    expect(page.use).toBe('plain');
    expect(newMicroFrontend('modal', 'Hi').modal?.name).toBe('hi');
    expect(newMicroFrontend('component', 'Hi').global).toEqual({ position: 'top' });
  });
});

describe('switchMfeKind', () => {
  it('drops the settings of the previous kind', () => {
    const mfe = newMicroFrontend('page', 'Hello');
    switchMfeKind(mfe, 'modal');
    expect(mfe.route).toBeUndefined();
    expect(mfe.modal?.name).toBe('hello');
    switchMfeKind(mfe, 'component');
    expect(mfe.modal).toBeUndefined();
    expect(mfeKind(mfe)).toBe('component');
  });
});

describe('collectNavGroups', () => {
  it('lists own groups first, skips the edited plugin in the list and de-duplicates by key', () => {
    const groups = collectNavGroups(
      [
        { _id: '1', name: 'Self', navBarGroups: [{ key: 'old', name: 'Old' }] },
        { _id: '2', name: 'Other', navBarGroups: [{ key: 'a', name: 'A', priority: 1 }, { key: 'mine', name: 'dup' }] },
      ],
      { _id: '1', name: 'Self', navBarGroups: [{ key: 'mine', name: 'Mine' }] },
    );
    expect(groups.map((g) => g.key)).toEqual(['mine', 'a']);
    expect(groups[0].own).toBe(true);
    expect(groups[1].pluginName).toBe('Other');
  });

  it('copes with a plugin that has no groups', () => {
    expect(collectNavGroups([{ _id: '2', name: 'X' }], {})).toEqual([]);
  });
});
