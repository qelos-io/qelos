import { createJiti } from "jiti";
import { logger } from "./logger.mjs";

const jiti = createJiti(import.meta.url);

export const appUrl = process.env.QELOS_URL || "http://localhost:3000";

export async function initializeSdk() {
  const username = process.env.QELOS_USERNAME || "test@test.com";
  const password = process.env.QELOS_PASSWORD || "admin";
  try {
    logger.debug("Initializing Qelos SDK...");

    if (process.env.VERBOSE) {
      logger.showConfig({
        QELOS_URL: appUrl,
        QELOS_USERNAME: username,
        QELOS_PASSWORD: password,
      });
    }

    const QelosAdministratorSDK = await jiti(
      "@qelos/sdk/administrator"
    );

    const sdk = new QelosAdministratorSDK.default({
      appUrl,
    });

    logger.debug(`Authenticating as ${username}...`);

    await sdk.authentication.oAuthSignin({
      username,
      password,
    });

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
