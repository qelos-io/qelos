import { service } from "@qelos/api-kit";
import logger from "./logger";

const assetsService = service("ASSETS", {
  port: process.env.ASSETS_SERVICE_PORT || 9003,
});

export async function uploadProfileImage(
  tenant: string,
  userId: string,
  imageUrl: string
): Promise<string> {
  const response = await assetsService({
    method: "POST",
    url: "/api/upload",
    headers: {
      tenant,
      user: JSON.stringify({ _id: userId })
    },
    data: {
      url: imageUrl,
    },
  });

  if (response.status === 200 && response.data.publicUrl) {
    return response.data.publicUrl;
  }

  logger.error("Failed to upload profile image", { tenant, userId, status: response.status, data: response.data });
  throw new Error("Failed to upload profile image");
}
