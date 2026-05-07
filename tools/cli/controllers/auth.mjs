import { createJiti } from 'jiti';
import { input, password } from '@inquirer/prompts';
import { logger, green, blue, yellow, red } from '../services/utils/logger.mjs';
import {
  CREDENTIALS_FILE,
  readCredentials,
  saveCredentials,
  clearCredentials,
  maskToken,
} from '../services/config/credentials.mjs';
import { getAppUrl } from '../services/config/sdk.mjs';

const jiti = createJiti(import.meta.url);

async function loadAdministratorSDK() {
  const mod = await jiti('@qelos/sdk/administrator');
  return mod.default;
}

function defaultTokenNickname() {
  const host = process.env.HOSTNAME || process.env.COMPUTERNAME || 'cli';
  return `qelos-cli@${host}`;
}

function defaultTokenExpiry() {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  return expires.toISOString();
}

export async function loginController(argv) {
  const existing = readCredentials();
  const defaultUrl = argv.url || existing?.appUrl || getAppUrl();

  let appUrl;
  let username;
  let pwd;
  try {
    appUrl = await input({
      message: 'Qelos URL:',
      default: defaultUrl,
      validate: (value) => (value && /^https?:\/\//i.test(value)) || 'Must start with http:// or https://',
    });
    username = argv.username || (await input({
      message: 'Email:',
      validate: (value) => !!value || 'Email is required',
    }));
    pwd = argv.password || (await password({
      message: 'Password:',
      mask: '*',
    }));
  } catch (err) {
    if (err && err.name === 'ExitPromptError') {
      console.log('\nLogin cancelled.');
      process.exit(1);
    }
    throw err;
  }

  const QelosAdministratorSDK = await loadAdministratorSDK();
  const sdk = new QelosAdministratorSDK({
    appUrl: appUrl.replace(/\/$/, ''),
    extraQueryParams: () => ({}),
  });

  try {
    await sdk.authentication.oAuthSignin({ username, password: pwd });
  } catch (error) {
    if (error.response?.status === 401 || /401|unauthor|invalid/i.test(error.message || '')) {
      logger.authError(username, appUrl);
    } else {
      logger.error('Login failed', error);
    }
    process.exit(1);
  }

  let apiTokenValue;
  let user;
  try {
    const created = await sdk.authentication.createApiToken({
      nickname: argv.nickname || defaultTokenNickname(),
      expiresAt: defaultTokenExpiry(),
    });
    apiTokenValue = created.token;
    user = await sdk.authentication.apiTokenSignin(apiTokenValue);
  } catch (error) {
    logger.error('Failed to create API token', error);
    process.exit(1);
  }

  saveCredentials({
    appUrl: appUrl.replace(/\/$/, ''),
    apiToken: apiTokenValue,
    user: user ? { _id: user._id, username: user.username, email: user.email } : undefined,
    createdAt: new Date().toISOString(),
  });

  logger.success(`Authenticated as ${user?.email || user?.username || username}`);
  console.log(`  API token stored in ${CREDENTIALS_FILE}`);
}

export function logoutController() {
  const removed = clearCredentials();
  if (removed) {
    logger.success('Logged out. Credentials cleared.');
  } else {
    logger.info('No stored credentials to clear.');
  }
}

export function tokenController(argv) {
  const creds = readCredentials();
  if (!creds?.apiToken) {
    logger.warning('Not logged in. Run: qelos auth login');
    process.exit(1);
  }
  if (argv.show) {
    console.log(creds.apiToken);
    return;
  }
  console.log(maskToken(creds.apiToken));
  console.log(`${blue('Stored at:')} ${CREDENTIALS_FILE}`);
  console.log(`${blue('Tip:')} use --show to print the full token`);
}

export async function statusController() {
  const creds = readCredentials();
  if (!creds?.apiToken) {
    logger.warning('Not logged in. Run: qelos auth login');
    process.exit(1);
  }

  const QelosAdministratorSDK = await loadAdministratorSDK();
  const sdk = new QelosAdministratorSDK({
    appUrl: creds.appUrl,
    apiToken: creds.apiToken,
    extraQueryParams: () => ({}),
  });

  try {
    const user = await sdk.authentication.getLoggedInUser();
    console.log(`${green('✓')} Logged in`);
    console.log(`  ${blue('URL:')}    ${creds.appUrl}`);
    console.log(`  ${blue('User:')}   ${user.email || user.username} (${user._id})`);
    if (user.fullName) console.log(`  ${blue('Name:')}   ${user.fullName}`);
    if (user.roles?.length) console.log(`  ${blue('Roles:')}  ${user.roles.join(', ')}`);
    console.log(`  ${blue('Token:')}  ${maskToken(creds.apiToken)}`);
  } catch (error) {
    if (error.response?.status === 401 || /401|unauthor/i.test(error.message || '')) {
      console.log(`${red('✗')} Stored token is no longer valid for ${creds.appUrl}`);
      console.log('  Run: qelos auth login');
      process.exit(1);
    }
    logger.error('Failed to fetch user info', error);
    process.exit(1);
  }
}
