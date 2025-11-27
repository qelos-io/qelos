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
  try {
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

    if (response.status === 200) {
      return response.data.publicUrl;
    } else {
      logger.log("Failed to upload profile image", response.data);
      throw new Error("Failed to upload profile image");
    }
  } catch (error) {
    throw error;
  }
}
