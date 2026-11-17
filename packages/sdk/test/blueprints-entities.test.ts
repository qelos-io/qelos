import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import QlBlueprintEntities from '../src/blueprints-entities';

function setup() {
  const urls: string[] = [];
  const entities = new QlBlueprintEntities(
    {
      appUrl: 'http://localhost:3000',
      fetch: async (url: any) => {
        urls.push(String(url));
        const res = new Response(JSON.stringify([]));
        res.headers.set('Content-Type', 'application/json');
        return res;
      },
      accessToken: 'token',
    } as any,
    'products'
  );
  return { entities, urls };
}

test('QlBlueprintEntitiesQuery pagination', async (t) => {
  await t.test('skip() sets $skip', () => {
    const { entities } = setup();
    assert.equal(entities.query().limit(10).skip(30).toQuery().$skip, 30);
  });

  await t.test('page() sets $page', () => {
    const { entities } = setup();
    assert.equal(entities.query().limit(10).page(3).toQuery().$page, 3);
  });

  await t.test('skip() and page() are sent as query params', async () => {
    const { entities, urls } = setup();
    await entities.query().limit(10).skip(30).find();
    await entities.query().limit(10).page(3).find();
    assert.match(urls[0], /%24skip=30/);
    assert.match(urls[0], /%24limit=10/);
    assert.match(urls[1], /%24page=3/);
  });

  await t.test('both can be set; the server picks $skip over $page', () => {
    const { entities } = setup();
    const q = entities.query().skip(5).page(2).toQuery();
    assert.equal(q.$skip, 5);
    assert.equal(q.$page, 2);
  });
});
