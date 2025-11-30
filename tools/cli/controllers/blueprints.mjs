import path from "node:path";
import { logger } from "../services/logger.mjs";
import {
  SUPPORTED_PROTOCOL,
  generateBlueprintsFromMongo,
} from "../services/blueprint-generator.mjs";

export default async function blueprintsController({ uri, path: targetPath, guides = true }) {
  const connectionUri = uri || "mongodb://localhost:27017/db";

  if (!SUPPORTED_PROTOCOL.test(connectionUri)) {
    logger.error("Only mongodb:// URIs are supported at the moment.");
    process.exit(1);
  }

  const targetDir = path.join(process.cwd(), targetPath);
  const shouldGenerateGuides = guides !== false;

  try {
    await generateBlueprintsFromMongo({
      uri: connectionUri,
      targetDir,
      createGuides: shouldGenerateGuides,
    });
  } catch {
    process.exit(1);
  }
}