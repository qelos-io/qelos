import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { IntegrationSourceKind } from '@qelos/global-types';

const setSecretMock = mock.fn(async () => {});

mock.module('../secrets-service', {
  namedExports: {
    getSecret: mock.fn(),
    setSecret: setSecretMock,
  }
});

mock.module('uniqid', {
  defaultExport: () => 'contract-auth-id',
});

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const FORMS_DIR = path.join(REPO_ROOT, 'apps/admin/src/modules/integrations/components/forms');
const TARGET_CALL_FILE = path.join(REPO_ROOT, 'apps/plugins/server/services/integration-target-call.ts');
const STATUS_FILE = path.join(REPO_ROOT, 'apps/plugins/server/services/integration-source-status.ts');

const targetCallSource = fs.readFileSync(TARGET_CALL_FILE, 'utf8');
const statusSource = fs.readFileSync(STATUS_FILE, 'utf8');

// Extracts a `function name(...) { ... }` body, correctly skipping braces that
// appear inside parameter type annotations/defaults and inside generic return
// types (e.g. `Promise<{ foo: string }>`), which naive brace-matching would trip on.
function extractFunctionBody(source: string, name: string): string {
  const declMatch = source.match(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  assert.ok(declMatch, `could not find function declaration for "${name}"`);
  let i = declMatch.index! + declMatch[0].length;
  let parenDepth = 1;
  while (parenDepth > 0) {
    if (source[i] === '(') parenDepth++;
    else if (source[i] === ')') parenDepth--;
    i++;
  }
  let angleDepth = 0;
  while (true) {
    const ch = source[i];
    if (ch === '<') angleDepth++;
    else if (ch === '>' && angleDepth > 0) angleDepth--;
    else if (ch === '{' && angleDepth === 0) break;
    i++;
  }
  const bodyStart = i + 1;
  let braceDepth = 1;
  i = bodyStart;
  while (braceDepth > 0) {
    if (source[i] === '{') braceDepth++;
    else if (source[i] === '}') braceDepth--;
    i++;
  }
  return source.slice(bodyStart, i - 1);
}

function consumerReadsField(body: string, field: string): boolean {
  const pattern = new RegExp(
    `authentication\\.${field}\\b` +
    `|\\{[^}]*\\b${field}\\b[^}]*\\}\\s*=\\s*authentication\\b` +
    `|as\\s*\\{[^}]*\\b${field}\\b[^}]*\\}`
  );
  return pattern.test(body);
}

function adminFormSendsField(formFileName: string, field: string): boolean {
  const source = fs.readFileSync(path.join(FORMS_DIR, formFileName), 'utf8');
  // Pattern A: forms with a `getAuthenticationOverride()` helper (used for both
  // save and "test connection") build `{ field }` / `{ field: ... }` right inside it.
  const overrideMatch = source.match(/function getAuthenticationOverride\s*\(\s*\)\s*\{/);
  if (overrideMatch) {
    const rest = source.slice(overrideMatch.index! + overrideMatch[0].length);
    if (new RegExp(`\\{\\s*${field}\\b`).test(rest)) return true;
  }
  // Pattern B: OAuth-app forms (LinkedIn/Facebook/Google/GitHub) assign directly:
  // `submissionData.authentication.clientSecret = ...`
  return new RegExp(`authentication\\.${field}\\s*=`).test(source);
}

/**
 * Locks the field name used to persist a provider's credential
 * (storeEncryptedSourceAuthentication) to the field name the admin panel
 * actually submits AND the field name checkout/status consumers read back.
 *
 * This is a regression test for a production incident: the Sumit admin form
 * sent `{ apiKey }`, but storeEncryptedSourceAuthentication persisted it under
 * `apikey` (lowercase). The value was silently dropped on save (the request
 * still returned success), "Test connection" kept working because it validates
 * the live form value rather than the persisted secret, and checkout failed
 * for every real user with MISSING_SUMIT_CREDENTIALS.
 */
const CONTRACT: Array<{
  kind: IntegrationSourceKind;
  field: string;
  sampleValue: unknown;
  adminForm?: string;
  targetHandler?: string;
  statusHandler?: string;
}> = [
  { kind: IntegrationSourceKind.Qelos, field: 'password', sampleValue: 'contract-test-value', adminForm: 'QelosForm.vue', statusHandler: 'checkQelosIntegrationStatus' },
  { kind: IntegrationSourceKind.OpenAI, field: 'token', sampleValue: 'contract-test-value', adminForm: 'OpenAIForm.vue', targetHandler: 'handleOpenAiTarget', statusHandler: 'checkOpenAIIntegrationStatus' },
  { kind: IntegrationSourceKind.Sumit, field: 'apiKey', sampleValue: 'contract-test-value', adminForm: 'SumitForm.vue', targetHandler: 'handleSumitTarget', statusHandler: 'checkSumitIntegrationStatus' },
  { kind: IntegrationSourceKind.Paddle, field: 'apiKey', sampleValue: 'contract-test-value', adminForm: 'PaddleForm.vue', targetHandler: 'handlePaddleTarget', statusHandler: 'checkPaddleStatus' },
  { kind: IntegrationSourceKind.DodoPayments, field: 'apiKey', sampleValue: 'contract-test-value', adminForm: 'DodoPaymentsForm.vue', targetHandler: 'handleDodoPaymentsTarget', statusHandler: 'checkDodoPaymentsStatus' },
  { kind: IntegrationSourceKind.PayPal, field: 'clientSecret', sampleValue: 'contract-test-value', adminForm: 'PayPalForm.vue', targetHandler: 'handlePayPalTarget', statusHandler: 'checkPayPalIntegrationStatus' },
  { kind: IntegrationSourceKind.Http, field: 'securedHeaders', sampleValue: { 'x-api-key': 'contract-test-value' }, adminForm: 'HttpForm.vue', targetHandler: 'handleHttpTarget', statusHandler: 'checkHttpIntegrationStatus' },
  { kind: IntegrationSourceKind.Email, field: 'password', sampleValue: 'contract-test-value', adminForm: 'EmailForm.vue', targetHandler: 'handleEmailTarget', statusHandler: 'checkEmailIntegrationStatus' },
  { kind: IntegrationSourceKind.AWS, field: 'secretAccessKey', sampleValue: 'contract-test-value', targetHandler: 'handleAwsTarget', statusHandler: 'checkAwsIntegrationStatus' },
  { kind: IntegrationSourceKind.Cloudflare, field: 'apiToken', sampleValue: 'contract-test-value', targetHandler: 'handleCloudflareTarget', statusHandler: 'checkCloudflareIntegrationStatus' },
  { kind: IntegrationSourceKind.LinkedIn, field: 'clientSecret', sampleValue: 'contract-test-value', adminForm: 'LinkedInForm.vue' },
  { kind: IntegrationSourceKind.Facebook, field: 'clientSecret', sampleValue: 'contract-test-value', adminForm: 'FacebookForm.vue' },
  { kind: IntegrationSourceKind.Google, field: 'clientSecret', sampleValue: 'contract-test-value', adminForm: 'GoogleForm.vue' },
  { kind: IntegrationSourceKind.GitHub, field: 'clientSecret', sampleValue: 'contract-test-value', adminForm: 'GitHubForm.vue' },
];

describe('Auth field contract: storage vs admin UI vs consumers', async () => {
  const { storeEncryptedSourceAuthentication } = await import('../source-authentication-service');

  afterEach(() => {
    setSecretMock.mock.resetCalls();
  });

  for (const { kind, field, sampleValue, adminForm, targetHandler, statusHandler } of CONTRACT) {
    describe(kind, () => {
      it(`storeEncryptedSourceAuthentication persists the exact "${field}" key`, async () => {
        await storeEncryptedSourceAuthentication('tenant-1', kind, { [field]: sampleValue }, 'contract-auth-id');

        assert.strictEqual(setSecretMock.mock.calls.length, 1, `expected setSecret to be called for kind=${kind}`);
        const stored = setSecretMock.mock.calls[0].arguments[2];
        assert.deepStrictEqual(
          stored,
          { [field]: sampleValue },
          `storeEncryptedSourceAuthentication for "${kind}" must persist under the "${field}" key, got ${JSON.stringify(stored)}. ` +
          `If this field name is intentionally changing, update the admin form and every consumer in the same change.`
        );
      });

      if (adminForm) {
        it(`admin form ${adminForm} submits its secret under "${field}"`, () => {
          assert.ok(
            adminFormSendsField(adminForm, field),
            `${adminForm} no longer appears to submit its secret under "${field}". ` +
            `storeEncryptedSourceAuthentication expects this exact key — a mismatch here silently drops the credential on save.`
          );
        });
      }

      if (targetHandler) {
        it(`checkout/target consumer "${targetHandler}" reads the same "${field}" key`, () => {
          const body = extractFunctionBody(targetCallSource, targetHandler);
          assert.ok(
            consumerReadsField(body, field),
            `${targetHandler} no longer reads "${field}" from authentication — it must match what is stored and what the admin form sends.`
          );
        });
      }

      if (statusHandler) {
        it(`"test connection" consumer "${statusHandler}" reads the same "${field}" key`, () => {
          const body = extractFunctionBody(statusSource, statusHandler);
          assert.ok(
            consumerReadsField(body, field),
            `${statusHandler} no longer reads "${field}" from authentication — it must match what is stored and what the admin form sends.`
          );
        });
      }
    });
  }
});
