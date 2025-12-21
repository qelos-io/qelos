import sharp from "sharp";
import logger from "./logger.js";

export interface OptimizationConfig {
  enabled: boolean;
  quality: number;
  formats: string[]; // Supported formats: ['jpeg', 'jpg', 'png', 'webp', 'gif']
}

export interface OptimizationResult {
  buffer: Buffer;
  optimized: boolean;
  originalSize: number;
  optimizedSize: number;
  savings: number; 
  format: string;
  error?: string;
}

/**
 * Determines if a file should be optimized based on MIME type and configuration
 */
export function shouldOptimize(
  extension: string,
  config: OptimizationConfig
): boolean {
  if (!config.enabled || !extension) {
    return false;
  }
  
  return config.formats.includes(extension);
}

export async function handleImageOptimization(
  storage: any,
  input: Buffer | any,
  extension: string 
): Promise<Buffer> { 
  const config: OptimizationConfig = storage?.imageOptimization;
  logger.info(config);
  const startTime = Date.now();

  if (!shouldOptimize(extension, config)) {
    logger.info("Image optimization skipped", {
      mimeType: extension,
      enabled: config.enabled,
      reason: !config.enabled ? "disabled" : "unsupported format",
    });

    // Pass through - Sharp handles both Buffer and Stream
    const passThrough = sharp();
    
    if (Buffer.isBuffer(input)) {
      return input;  
    } else {
      input.pipe(passThrough);
      return await passThrough.toBuffer();
    }
  }

  try {
    let metadata: sharp.Metadata;

    if (!Buffer.isBuffer(input)) {
      const sharpInstance = sharp();
      input.pipe(sharpInstance);
      input = await sharpInstance.toBuffer();
    }

    const originalSize = input.length; 

    metadata = await sharp(input).metadata();

    if (!metadata.format) {
      logger.warn("Unable to determine image format");
      return input;
    }

    const formatHandlers: Record<string, (p: sharp.Sharp) => sharp.Sharp> = {
      jpeg: (p) => p.jpeg({ quality: config.quality, mozjpeg: true }),
      jpg: (p) => p.jpeg({ quality: config.quality, mozjpeg: true }),
      png: (p) => p.png({ compressionLevel: 9, adaptiveFiltering: true, force: true }),
      webp: (p) => p.webp({ quality: config.quality, effort: 4 }),
      gif: (p) => p.gif({}),
    };

    const handler = formatHandlers[metadata.format];

    // Optimize
    input =  await handler(sharp(input).withMetadata()).toBuffer();

    const optimizedSize = input.length;
    const savings = ((originalSize - optimizedSize) / originalSize) * 100;
    const processingTime = Date.now() - startTime;

    logger.info('Optimization results', {
      originalSize,
      optimizedSize,
      savings: `${savings.toFixed(2)}%`,
      processingTime: `${processingTime} ms`
    });

    return input;
  } catch (error) {
    // Log error and fall back to original buffer
    logger.error("Optimization failed in handleImageOptimization", {
      error: error instanceof Error ? error.message : "Unknown error",
      contentType: extension,
    });

    return input;
  }
}