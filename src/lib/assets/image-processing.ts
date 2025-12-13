import sharp from "sharp";

// Thumbnail sizes
export const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 300, height: 300 },
  large: { width: 600, height: 600 },
} as const;

export type ThumbnailSize = keyof typeof THUMBNAIL_SIZES;

/**
 * Generate a thumbnail from an image buffer
 */
export async function generateThumbnail(
  imageBuffer: Buffer,
  size: ThumbnailSize = "medium"
): Promise<Buffer> {
  const { width, height } = THUMBNAIL_SIZES[size];

  return sharp(imageBuffer)
    .resize(width, height, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
}

/**
 * Get image metadata
 */
export async function getImageMetadata(imageBuffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
}> {
  const metadata = await sharp(imageBuffer).metadata();
  
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
    hasAlpha: metadata.hasAlpha || false,
  };
}

/**
 * Optimize an image for web delivery
 */
export async function optimizeImage(
  imageBuffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: "jpeg" | "png" | "webp";
  } = {}
): Promise<Buffer> {
  const {
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 85,
    format = "webp",
  } = options;

  let pipeline = sharp(imageBuffer).resize(maxWidth, maxHeight, {
    fit: "inside",
    withoutEnlargement: true,
  });

  switch (format) {
    case "jpeg":
      pipeline = pipeline.jpeg({ quality, progressive: true });
      break;
    case "png":
      pipeline = pipeline.png({ compressionLevel: 9 });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
  }

  return pipeline.toBuffer();
}

/**
 * Convert image to different format
 */
export async function convertImage(
  imageBuffer: Buffer,
  targetFormat: "jpeg" | "png" | "webp"
): Promise<Buffer> {
  let pipeline = sharp(imageBuffer);

  switch (targetFormat) {
    case "jpeg":
      pipeline = pipeline.jpeg({ quality: 90 });
      break;
    case "png":
      pipeline = pipeline.png();
      break;
    case "webp":
      pipeline = pipeline.webp({ quality: 90 });
      break;
  }

  return pipeline.toBuffer();
}

/**
 * Extract dominant colors from image
 */
export async function extractDominantColor(imageBuffer: Buffer): Promise<{
  r: number;
  g: number;
  b: number;
  hex: string;
}> {
  // Resize to 1x1 to get average color
  const { data } = await sharp(imageBuffer)
    .resize(1, 1)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const r = data[0];
  const g = data[1];
  const b = data[2];
  const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;

  return { r, g, b, hex };
}
