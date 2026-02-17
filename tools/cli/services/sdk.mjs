import { createJiti } from "jiti";
import { logger } from "./logger.mjs";
import { getConfig } from "./load-config.mjs";

const jiti = createJiti(import.meta.url);

export function getAppUrl() {
  return process.env.QELOS_URL || getConfig()?.qelosUrl || "http://localhost:3000";
}

export async function initializeSdk() {
  const appUrl = getAppUrl();
  const apiToken = process.env.QELOS_API_TOKEN || getConfig()?.qelosApiToken;
  const username = process.env.QELOS_USERNAME || "test@test.com";
  const password = process.env.QELOS_PASSWORD || "admin";
  try {
    logger.debug("Initializing Qelos SDK...");

    if (process.env.VERBOSE) {
      logger.showConfig(apiToken
        ? { QELOS_URL: appUrl, QELOS_API_TOKEN: apiToken.substring(0, 8) + '...' }
        : { QELOS_URL: appUrl, QELOS_USERNAME: username, QELOS_PASSWORD: password }
      );
    }

    const QelosAdministratorSDK = await jiti(
      "@qelos/sdk/administrator"
    );

    const sdk = new QelosAdministratorSDK.default({
      appUrl,
      ...(apiToken ? { apiToken } : {}),
    });

    if (apiToken) {
      logger.debug("Authenticating with API token...");
      await sdk.authentication.apiTokenSignin(apiToken);
    } else {
      logger.debug(`Authenticating as ${username}...`);
      await sdk.authentication.oAuthSignin({
        username,
        password,
      });
    }

    logger.debug("Authentication successful");
    return sdk;
  } catch (error) {
    // Handle connection errors
    if (
      error.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
      error.cause?.code === "ENOTFOUND" ||
      error.cause?.code === "ECONNREFUSED" ||
      error.message?.includes("fetch failed")
    ) {
      logger.connectionError(appUrl, error.cause || error);
    }
    // Handle authentication errors
    else if (
      error.response?.status === 401 ||
      error.message?.includes("authentication")
    ) {
      logger.authError(username, appUrl);
    }
    // Handle other errors
    else {
      logger.error("Failed to initialize SDK", error);
    }

    process.exit(1);
  }
}
