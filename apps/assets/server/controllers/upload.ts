import { extname } from "node:path";
import mime from "mime";

import { getService } from "../controllers/assets";
import Storage from "../models/storage";
import { emitPlatformEvent } from "@qelos/api-kit";
import logger from "../services/logger";

// Default file extension for unknown types
const DEFAULT_EXTENSION = "jpg";

/**
 * Determines file extension using MIME type or URL.
 */
function getFileExtension(contentType?: string, url?: string): string {
  if (contentType) {
    const mimeExtension = mime.getExtension(contentType);
    if (mimeExtension) return mimeExtension;
  }

  if (url) {
    const urlExtension = extname(new URL(url).pathname).replace(".", "");
    if (urlExtension) return urlExtension;
  }

  return DEFAULT_EXTENSION;
}

/**
 * Uploads file to the storage service.
 */
async function handleUpload(
  storage: any,
  userId: string,
  file: Buffer,
  originalName: string,
  contentType?: string
): Promise<{ publicUrl: string, success: boolean }> {
  const extension = getFileExtension(contentType, originalName);
  const service = getService(storage);
  if (!service) {
    throw new Error("Storage service not found");
  }

  return service.uploadFile(storage, {
    identifier: '',
    file,
    extension,
    prefix: `upload_${userId}`,
    type: contentType || "application/octet-stream",
  });
}

/**
 * Handles file upload from direct input or URL.
 */
export async function uploadFile(req: any, res: any): Promise<any> {
  try {
    const { headers, body, file, user } = req;
    const tenant = headers.tenant;

    if (!tenant) {
      return res.status(400).json({ message: "Tenant header is required." }).end();
    }

    const storage = await Storage.findOne({ tenant, isDefault: true })
      .lean()
      .exec();
    if (!storage) {
      return res
        .status(403)
        .json({ message: "No default storage configured for tenant." })
        .end();
    }

    let fileData: { publicUrl: string, success: boolean };
    const urlInput = body?.url;
    let mimeType: string | undefined;

    if (urlInput) {
      try {
        const response = await fetch(urlInput);
        if (!response.ok)
          throw new Error(`URL fetch failed: ${response.statusText}`);

        const buffer = await response.arrayBuffer();
        mimeType = response.headers.get("content-type") || undefined;
        fileData = await handleUpload(
          storage,
          user._id,
          Buffer.from(buffer),
          urlInput,
          mimeType
        );
      } catch (err) {
        return res.status(400).json({
          message: "Failed to fetch file from URL."
        }).end();
      }
    } else if (file) {
      fileData = await handleUpload(
        storage,
        user._id,
        file.buffer,
        file.originalname,
        file.mimetype
      );
      mimeType = file.mimetype;
    } else {
      return res.status(400).json({ message: "No file or URL provided." }).end();
    }

    res.status(200).json({
      message: "File uploaded successfully.",
      publicUrl: fileData?.publicUrl,
    }).end();

    emitPlatformEvent({
      tenant,
      user: user._id,
      source: 'assets',
      kind: 'asset-operation',
      eventName: 'asset-uploaded',
      description: `asset updated by user`,
      metadata: {
        prefix: `upload_${user._id}`,
        type: mimeType,
        ...fileData,
        storage: {
          _id: storage._id,
          kind: storage.kind,
          name: storage.name
        }
      }
    }).catch(() => logger.error('could not emit platform event'))
  } catch (error) {
    return res.status(500).json({
      message: "File upload failed. Please try again."
    }).end();
  }
}
