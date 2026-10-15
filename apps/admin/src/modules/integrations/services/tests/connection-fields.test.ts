import { describe, expect, it } from 'vitest';
import { IntegrationSourceKind } from '@qelos/global-types';
import {
  buildAuthenticationOverride,
  buildConnectionPayload,
  collectLabelSuggestions,
  getConnectionSchema,
  getSchemaDefaults,
  validateConnection,
} from '../connection-fields';

// The payload the retired GitHub/Google/Facebook/LinkedIn forms emitted.
function legacyOAuthPayload(model: any, kind: string, isEditing: boolean, typed: string, edited: boolean) {
  const data = { ...model, kind };
  data.authentication = data.authentication || {};
  if (!isEditing || edited) data.authentication.clientSecret = typed;
  else delete data.authentication.clientSecret;
  return data;
}

describe('connection payloads', () => {
  const oauthKinds = [
    IntegrationSourceKind.GitHub,
    IntegrationSourceKind.Google,
    IntegrationSourceKind.Facebook,
    IntegrationSourceKind.LinkedIn,
  ];

  for (const kind of oauthKinds) {
    it(`${kind}: a new connection matches the retired form`, () => {
      const model = { name: 'Login', labels: ['a'], metadata: { clientId: 'id', scope: 'openid' }, authentication: {} };
      const schema = getConnectionSchema(kind)!;
      expect(buildConnectionPayload(schema, kind, model, { 'authentication.clientSecret': 's3cret' })).toEqual(
        legacyOAuthPayload(model, kind, false, 's3cret', true),
      );
    });

    it(`${kind}: editing without typing keeps the saved secret`, () => {
      const model = { _id: '1', name: 'Login', labels: [], metadata: { clientId: 'id', scope: 'openid' } };
      const schema = getConnectionSchema(kind)!;
      expect(buildConnectionPayload(schema, kind, model, {})).toEqual(
        legacyOAuthPayload(model, kind, true, '*****', false),
      );
    });

    it(`${kind}: editing with a new secret sends it`, () => {
      const model = { _id: '1', name: 'Login', labels: [], metadata: { clientId: 'id', scope: 'openid' } };
      const schema = getConnectionSchema(kind)!;
      expect(buildConnectionPayload(schema, kind, model, { 'authentication.clientSecret': 'new' })).toEqual(
        legacyOAuthPayload(model, kind, true, 'new', true),
      );
    });
  }

  it('qelos: sends the password only when typed, so an edit never stores an empty one', () => {
    const schema = getConnectionSchema(IntegrationSourceKind.Qelos)!;
    const model = { _id: '1', name: 'Other', metadata: { url: 'https://x.io', username: 'u' } };
    expect(buildConnectionPayload(schema, 'qelos', model, {}).authentication).toEqual({});
    expect(buildConnectionPayload(schema, 'qelos', model, { 'authentication.password': 'p' }).authentication).toEqual({
      password: 'p',
    });
  });

  it('url-only kinds leave authentication untouched', () => {
    const schema = getConnectionSchema(IntegrationSourceKind.N8n)!;
    const model = { name: 'n', metadata: { url: 'https://n8n.io' }, authentication: {} };
    expect(buildConnectionPayload(schema, 'n8n', model, {})).toEqual({ ...model, kind: 'n8n' });
  });

  it('does not mutate the model', () => {
    const schema = getConnectionSchema(IntegrationSourceKind.Email)!;
    const model = { name: 'm', authentication: {} };
    buildConnectionPayload(schema, 'email', model, { 'authentication.password': 'p' });
    expect(model.authentication).toEqual({});
  });
});

describe('validateConnection', () => {
  const schema = getConnectionSchema(IntegrationSourceKind.Qelos)!;
  const valid = { name: 'n', metadata: { url: 'https://x.io', username: 'u' } };

  it('accepts a complete new connection', () => {
    expect(validateConnection(schema, valid, { 'authentication.password': 'p' }, false)).toEqual({});
  });

  it('requires name, fields and a new secret', () => {
    const errors = validateConnection(schema, { name: ' ', metadata: {} }, {}, false);
    expect(Object.keys(errors).sort()).toEqual(
      ['authentication.password', 'metadata.url', 'metadata.username', 'name'].sort(),
    );
  });

  it('does not require the secret on edit', () => {
    expect(validateConnection(schema, valid, {}, true)).toEqual({});
  });

  it('rejects addresses that are not http(s) urls and bad emails', () => {
    expect(validateConnection(schema, { ...valid, metadata: { url: 'x.io', username: 'u' } }, {}, true)['metadata.url']).toBeTruthy();
    const email = getConnectionSchema(IntegrationSourceKind.Email)!;
    const model = {
      name: 'm',
      metadata: { senderName: 's', email: 'nope', smtp: 'smtp.x.io', pop3: 'pop.x.io', username: 'u' },
    };
    expect(Object.keys(validateConnection(email, model, {}, true))).toEqual(['metadata.email']);
  });
});

describe('status check and label suggestions', () => {
  it('builds the authentication override only from typed secrets', () => {
    const schema = getConnectionSchema(IntegrationSourceKind.Email)!;
    expect(buildAuthenticationOverride(schema, {})).toBeUndefined();
    expect(buildAuthenticationOverride(schema, { 'authentication.password': 'p' })).toEqual({ password: 'p' });
  });

  it('collects unique labels across connections, ignoring case', () => {
    expect(
      collectLabelSuggestions([{ labels: ['Beta', 'alpha'] }, { labels: ['beta', ' gamma '] }, {}]),
    ).toEqual(['alpha', 'Beta', 'gamma']);
    expect(collectLabelSuggestions(undefined)).toEqual([]);
  });
});

describe('payment providers', () => {
  const cases: Array<[IntegrationSourceKind, string]> = [
    [IntegrationSourceKind.Sumit, 'apiKey'],
    [IntegrationSourceKind.Paddle, 'apiKey'],
    [IntegrationSourceKind.DodoPayments, 'apiKey'],
    [IntegrationSourceKind.PayPal, 'clientSecret'],
  ];

  for (const [kind, key] of cases) {
    it(`${kind}: sends {${key}} when typed, nothing when editing untouched (as the retired form did)`, () => {
      const schema = getConnectionSchema(kind)!;
      const model = { _id: '1', name: 'p', metadata: { environment: 'live' } };
      expect(buildConnectionPayload(schema, kind, model, { [`authentication.${key}`]: 'k'.repeat(24) }).authentication).toEqual({
        [key]: 'k'.repeat(24),
      });
      expect(buildConnectionPayload(schema, kind, model, {}).authentication).toEqual({});
      expect(buildAuthenticationOverride(schema, { [`authentication.${key}`]: 'abc' })).toEqual({ [key]: 'abc' });
    });
  }

  it('starts on the first environment and rejects too-short keys', () => {
    expect(getSchemaDefaults(getConnectionSchema(IntegrationSourceKind.PayPal)!)).toEqual({ 'metadata.environment': 'sandbox' });
    expect(getSchemaDefaults(getConnectionSchema(IntegrationSourceKind.DodoPayments)!)).toEqual({ 'metadata.environment': 'test' });
    const sumit = getConnectionSchema(IntegrationSourceKind.Sumit)!;
    const model = { name: 's', metadata: { companyId: '1' } };
    expect(validateConnection(sumit, model, { 'authentication.apiKey': 'short' }, false)['authentication.apiKey']).toBeTruthy();
    expect(validateConnection(sumit, model, { 'authentication.apiKey': 'k'.repeat(20) }, false)).toEqual({});
  });
});
